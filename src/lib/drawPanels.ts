/**
 * Draw a comic with Muse Image: portraits first, then every panel anchored on
 * the portraits of the characters in it.
 *
 * Two endpoints, two jobs. `/images/generations` draws from text alone — used
 * for the portraits, which define each character once. `/images/edits` takes
 * reference images — used for every panel, so identity is copied from pixels
 * instead of re-imagined from a description each time.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { metaClient, metaFetch, MUSE_IMAGE_MODEL } from "./metaClient";
import { MUSE_SPARK_MODEL } from "./writeContents";
import { panelPrompt, portraitPrompt, type ComicBible, type PanelScene } from "./comicPrompts";

/**
 * Muse Image takes sizes as WxH and rounds to the nearest size it supports
 * (1080x1920 comes back as 1152x2048, still 9:16).
 *
 * Every panel is the same vertical 9:16. Token Comic lets a creator mix layouts
 * on a page; this demo does not, on purpose: a vertical strip reads on a phone,
 * is already the shape of a Reel or a Story, and gives SAM a clip with no
 * letterboxing to undo.
 */
export const PORTRAIT_SIZE = "1024x1536";
export const PANEL_SIZE = "1080x1920";

async function decodeImage(res: Response, outPath: string): Promise<string> {
  if (!res.ok) throw new Error(`Muse Image failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("Muse Image returned no image data");
  await writeFile(outPath, Buffer.from(b64, "base64"));
  return outPath;
}

/**
 * Retry what is temporary: a 429 or a 5xx. Everything else — a policy rejection,
 * a bad request — gets the same answer on every attempt, so it fails at once.
 * The request is rebuilt each time because a FormData body is consumed on send.
 */
const BACKOFF_MS = [3_000, 10_000, 25_000];

async function withRetry(send: () => Promise<Response>, outPath: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await send();
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt === BACKOFF_MS.length) return decodeImage(res, outPath);
    await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
  }
}

/** Text-only generation. */
export async function generateImage(prompt: string, size: string, outPath: string): Promise<string> {
  return withRetry(
    () =>
      metaFetch("/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MUSE_IMAGE_MODEL, prompt, n: 1, size }),
      }),
    outPath,
  );
}

/** Generation anchored on reference images (up to 10). */
export async function generateWithReferences(
  prompt: string,
  references: string[],
  size: string,
  outPath: string,
): Promise<string> {
  if (references.length === 0) return generateImage(prompt, size, outPath);

  const blobs = await Promise.all(references.map(async (ref) => new Blob([await readFile(ref)])));
  return withRetry(() => {
    const form = new FormData();
    form.set("model", MUSE_IMAGE_MODEL);
    form.set("prompt", prompt);
    form.set("n", "1");
    form.set("size", size);
    // Indexed from zero, consecutively — a plain `image[]` is rejected.
    blobs.forEach((blob, i) => form.set(`image[${i}]`, blob, `ref-${i}.png`));
    return metaFetch("/images/edits", { method: "POST", body: form });
  }, outPath);
}

/** One portrait per character. Returns name (lowercased) → file path. */
export async function drawPortraits(bible: ComicBible, workDir: string): Promise<Map<string, string>> {
  const portraits = new Map<string, string>();
  for (const character of bible.characters) {
    const out = join(workDir, `portrait-${character.name.toLowerCase()}.webp`);
    await generateImage(portraitPrompt(character, bible), PORTRAIT_SIZE, out);
    portraits.set(character.name.toLowerCase(), out);
  }
  return portraits;
}

function isPolicyRejection(err: unknown): boolean {
  return /content_policy_violation/.test(String(err));
}

/**
 * Restate a scene so the same beat survives the edit filter.
 *
 * Measured on the sample chapter: the edits endpoint rejects a panel that puts
 * a reference-image person in a distressing scene — "alarmed" plus "crashing
 * charts" failed every time, either one alone passed, and the identical text
 * with NO reference image passed too. Users will write drama, so banning words
 * is not an answer; restating the beat through posture and light usually is.
 */
async function softenScene(imagePrompt: string): Promise<string> {
  const completion = await metaClient().chat.completions.create({
    model: MUSE_SPARK_MODEL,
    messages: [
      {
        role: "user",
        content:
          "Rewrite this comic panel description for an illustrator. Keep the same characters, " +
          "action, composition, camera and story beat. Express tension through posture, framing " +
          "and lighting instead of naming emotions like panic, alarm, terror or doom, and describe " +
          "screens and props neutrally. One paragraph, no preamble.\n\n" +
          imagePrompt,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() || imagePrompt;
}

export type PanelRung = "references" | "softened" | "no-references";

/**
 * Draw one panel with the portraits of the characters in it.
 *
 * Falls down a ladder only on a policy rejection — any other error is real and
 * surfaces. The rung that succeeded is returned so the caller can report it:
 * a panel drawn without references is one whose faces were not anchored.
 */
export async function drawPanel(
  scene: PanelScene,
  bible: ComicBible,
  portraits: Map<string, string>,
  outPath: string,
): Promise<PanelRung> {
  // Same order as panelPrompt names them, so "in this order" stays true.
  const refs = bible.characters
    .filter((c) => scene.characters.some((n) => n.trim().toLowerCase() === c.name.toLowerCase()))
    .map((c) => portraits.get(c.name.toLowerCase()))
    .filter((p): p is string => Boolean(p));
  const size = PANEL_SIZE;

  try {
    await generateWithReferences(panelPrompt(scene, bible), refs, size, outPath);
    return "references";
  } catch (err) {
    if (!isPolicyRejection(err) || refs.length === 0) throw err;
  }

  const softened = { ...scene, imagePrompt: await softenScene(scene.imagePrompt) };
  try {
    await generateWithReferences(panelPrompt(softened, bible), refs, size, outPath);
    return "softened";
  } catch (err) {
    if (!isPolicyRejection(err)) throw err;
  }

  await generateImage(panelPrompt(scene, bible), size, outPath);
  return "no-references";
}
