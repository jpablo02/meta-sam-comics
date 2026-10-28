/**
 * Track an object through a chapter with SAM 3.1.
 *
 * SAM answers in a text channel, one line per frame, each detection encoded as
 *   <0f>0<|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..;c=..|><|mask;x=..;y=..;data=..|>
 * where the leading number is the frame and the one after it is SAM's own
 * object id.
 *
 * That object id is NOT stable across a panel cut — measured on a real chapter,
 * the same document came back as id 0 in one panel and id 1 in the next. SAM is
 * doing what it was trained to do: a hard cut looks like a different scene, so
 * it opens a new track. Deciding whether two tracks are the same object is our
 * job, not SAM's — see resolveIdentity.
 */
import { createReadStream } from "node:fs";
import { metaFetch, SAM_MODEL } from "./metaClient";

export interface Detection {
  frame: number;
  /** SAM's track id. Only meaningful within one panel. */
  samObjectId: number;
  /** Panel this frame belongs to. */
  panel: number;
  box: { x1: number; y1: number; x2: number; y2: number };
  /** Canvas the box is measured against. */
  canvas: { w: number; h: number };
  confidence: number;
}

/** One object's presence in one panel, folded from its frames. */
export interface PanelAppearance {
  panel: number;
  samObjectId: number;
  /** Highest-confidence box seen in this panel. */
  box: { x1: number; y1: number; x2: number; y2: number };
  canvas: { w: number; h: number };
  confidence: number;
  frameCount: number;
}

/** Upload a file to the Model API and return its file id. */
export async function uploadFile(path: string, filename: string): Promise<string> {
  const form = new FormData();
  form.set("purpose", "user_data");
  // Node's fetch accepts a web stream here; Blob keeps it simple and the clips
  // are small (a 4-panel chapter is well under a megabyte).
  const { readFile } = await import("node:fs/promises");
  form.set("file", new Blob([await readFile(path)]), filename);

  const res = await metaFetch("/files", { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`File upload failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { id: string };
  return json.id;
}

const BOX_RE =
  /<(\d+)f>(\d+)<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+);c=([0-9.]+)\|>/g;

/**
 * Run SAM over an uploaded clip.
 *
 * `prompt` must be a short noun phrase — "white paper document" works, a list
 * like "document, phone" returns nothing at all.
 */
export async function trackObject(
  fileId: string,
  prompt: string,
  panelOfFrame: (frame: number) => number,
): Promise<Detection[]> {
  const res = await metaFetch("/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: SAM_MODEL,
      stream: true,
      metadata: {
        mask_encoding: "one_bit",
        include_confidence: "true",
        propagation_direction: "both",
      },
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_video", file_id: fileId },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`SAM request failed (${res.status}): ${await res.text()}`);
  }

  const detections: Detection[] = [];
  const body = await res.text();

  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    let event: { type?: string; delta?: string };
    try {
      event = JSON.parse(line.slice(6));
    } catch {
      continue; // keep-alives and partial lines
    }
    if (event.type !== "response.output_text.delta" || !event.delta) continue;

    BOX_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BOX_RE.exec(event.delta)) !== null) {
      const frame = Number(m[1]);
      detections.push({
        frame,
        samObjectId: Number(m[2]),
        panel: panelOfFrame(frame),
        box: { x1: Number(m[3]), y1: Number(m[4]), x2: Number(m[5]), y2: Number(m[6]) },
        canvas: { w: Number(m[7]), h: Number(m[8]) },
        confidence: Number(m[9]),
      });
    }
  }

  return detections;
}

/**
 * Segment ONE panel image with a noun phrase.
 *
 * SAM answers a text prompt with the single instance it rates best — measured:
 * "paper" and "sheet of paper" returned one box per panel, and on a panel full
 * of paperwork that box was a note under a phone while the report sat in the
 * character's hands. The phrase is what picks the instance ("paper held in
 * hands" found the report in both panels), which is why the phrase is written
 * by a model that has read the scene — see locateObject.
 *
 * Returns null when SAM finds nothing; an empty answer is not an error.
 */
export async function segmentImage(
  imagePath: string,
  prompt: string,
  panel: number,
): Promise<PanelAppearance | null> {
  const { readFile } = await import("node:fs/promises");
  const b64 = (await readFile(imagePath)).toString("base64");

  const res = await metaFetch("/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: SAM_MODEL,
      stream: true,
      metadata: { mask_encoding: "one_bit", include_confidence: "true" },
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: `data:image/png;base64,${b64}` },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`SAM request failed (${res.status}): ${await res.text()}`);

  const detections: Detection[] = [];
  for (const line of (await res.text()).split("\n")) {
    if (!line.startsWith("data: ")) continue;
    let event: { type?: string; delta?: string };
    try {
      event = JSON.parse(line.slice(6));
    } catch {
      continue;
    }
    if (event.type !== "response.output_text.delta" || !event.delta) continue;
    BOX_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BOX_RE.exec(event.delta)) !== null) {
      detections.push({
        frame: 0,
        samObjectId: Number(m[2]),
        panel,
        box: { x1: Number(m[3]), y1: Number(m[4]), x2: Number(m[5]), y2: Number(m[6]) },
        canvas: { w: Number(m[7]), h: Number(m[8]) },
        confidence: Number(m[9]),
      });
    }
  }

  return foldByPanel(detections).sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}

/**
 * Fold per-frame detections into one appearance per (panel, track), keeping the
 * frame SAM was most sure about — that is the one worth cropping.
 */
export function foldByPanel(detections: Detection[]): PanelAppearance[] {
  const best = new Map<string, PanelAppearance>();

  for (const d of detections) {
    const key = `${d.panel}:${d.samObjectId}`;
    const current = best.get(key);
    if (!current) {
      best.set(key, {
        panel: d.panel,
        samObjectId: d.samObjectId,
        box: d.box,
        canvas: d.canvas,
        confidence: d.confidence,
        frameCount: 1,
      });
      continue;
    }
    current.frameCount++;
    if (d.confidence > current.confidence) {
      current.confidence = d.confidence;
      current.box = d.box;
    }
  }

  return [...best.values()].sort((a, b) => a.panel - b.panel);
}
