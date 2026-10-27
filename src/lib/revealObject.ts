/**
 * Turn the cropped object into the collectible piece, with Muse Image.
 *
 * This is the step that makes the collectible come FROM the story. The crop
 * goes in as a reference image, so what comes back is the same object — same
 * printing, same wear, same shape — presented as an artifact, instead of a
 * fresh object generated from a text description that merely sounds like it.
 *
 * Note the field name: the edits endpoint wants `image[0]`, indexed from zero.
 * A plain `image[]` is rejected.
 */
import { readFile } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { metaFetch, MUSE_IMAGE_MODEL } from "./metaClient";

export interface RevealOptions {
  /** What the object is, in the creator's words. Steers the reveal. */
  objectName: string;
  /** Free-form art direction for the collectible treatment. */
  treatment?: string;
}

const DEFAULT_TREATMENT =
  "floating alone against a dark background with dramatic rim lighting, " +
  "presented as a premium collectible artifact";

function buildPrompt({ objectName, treatment }: RevealOptions): string {
  return [
    `The exact same ${objectName} shown in the reference image, now revealed as a collectible:`,
    treatment?.trim() || DEFAULT_TREATMENT,
    "Keep the same object: same shape, same markings, same wear, same printed layout.",
    "Do not substitute a different object. No hands, no people, no background scene.",
  ].join(" ");
}

/**
 * Generate the collectible from the crop. Returns the path it was written to.
 */
export async function revealObject(
  cropPath: string,
  outPath: string,
  options: RevealOptions,
): Promise<string> {
  const form = new FormData();
  form.set("model", MUSE_IMAGE_MODEL);
  form.set("image[0]", new Blob([await readFile(cropPath)]), "crop.png");
  form.set("prompt", buildPrompt(options));
  form.set("n", "1");

  const res = await metaFetch("/images/edits", { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Muse Image request failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("Muse Image returned no image data");
  }

  await writeFile(outPath, Buffer.from(b64, "base64"));
  return outPath;
}
