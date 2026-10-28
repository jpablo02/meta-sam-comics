/**
 * Decide which of SAM's tracks are the SAME STORY OBJECT, with Muse Wonder.
 *
 * SAM opens a fresh track at every panel cut, so one object that appears in
 * three panels comes back as three ids. Stitching those back together is the
 * step SAM cannot do, and — measured — neither can pixel similarity: see
 * docs/identity-resolution.md.
 *
 * What makes it work is the framing. Asked "are these the same physical
 * object?", Muse Wonder answered no at 0.67 confidence, and it was right: one
 * sheet is flat, the other is creased. Asked whether they are the same object in
 * the STORY, with the plot in hand and told that line-level differences are
 * expected, it answered yes at 0.95 and explained that a character had crumpled
 * it. Same model, same images, different question.
 */
import { readFile } from "node:fs/promises";
import { metaFetch } from "./metaClient";
import type { PanelAppearance } from "./trackObject";

export const MUSE_WONDER_MODEL = "muse-wonder-1.0";

/** What the chapter is about. Without this the comparison is forensic, not narrative. */
export interface StoryContext {
  chapterTitle: string;
  /** One or two sentences: who handles the object, and what happens to it. */
  synopsis: string;
}

/** Muse Wonder's verdict on one pair of appearances. */
export interface IdentityVerdict {
  sameStoryObject: boolean;
  confidence: number;
  reason: string;
  /** Short noun phrase — reusable as SAM's prompt. */
  objectLabel: string;
  /** What changed between the two moments. Usable narrative. */
  visibleChanges: string;
}

/** One object, resolved across the chapter. */
export interface ResolvedObject {
  /**
   * The model's name for it. Empty when the object was seen in a single panel:
   * the label is a by-product of comparing two crops, so there is nothing to
   * compare and nothing to name. Callers fall back to the prompt they searched
   * with — see `labelOf`.
   */
  label: string;
  /** Appearances that belong to this object, in reading order. */
  appearances: PanelAppearance[];
  /** Why each extra appearance was merged in. */
  evidence: IdentityVerdict[];
}

/** Below this, two appearances are treated as different objects. */
export const MERGE_THRESHOLD = 0.7;

function buildPrompt(story: StoryContext): string {
  return [
    "You are resolving NARRATIVE continuity in a comic, not forensic identity.",
    "",
    `Context: this is a comic chapter titled "${story.chapterTitle}". ${story.synopsis}`,
    "The two crops below were taken from two different panels of that same chapter, in reading order.",
    "",
    "In a comic, the SAME story object is drawn differently in every panel: different angle,",
    "different lighting, different distance, and it may be creased or damaged as characters",
    "handle it. Line-level differences are expected and are NOT evidence of a different object.",
    "",
    "Question: do these two crops depict the SAME STORY OBJECT at two moments, or two genuinely",
    "distinct objects in the plot?",
    "",
    "Answer with strict JSON only:",
    '{"same_story_object": true|false, "confidence": 0.0-1.0, "reason": "one short sentence",',
    ' "object_label": "short noun phrase", "visible_changes": "what changed between the two moments"}',
  ].join("\n");
}

async function asDataUrl(path: string): Promise<string> {
  const bytes = await readFile(path);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

/** Ask Muse Wonder about one pair of crops. */
export async function compareAppearances(
  cropPathA: string,
  cropPathB: string,
  story: StoryContext,
): Promise<IdentityVerdict> {
  const res = await metaFetch("/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MUSE_WONDER_MODEL,
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: buildPrompt(story) },
            { type: "input_image", image_url: await asDataUrl(cropPathA) },
            { type: "input_image", image_url: await asDataUrl(cropPathB) },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Muse Wonder request failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as {
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const text = (json.output ?? [])
    .flatMap((o) => o.content ?? [])
    .map((c) => c.text)
    .filter(Boolean)
    .join("\n");

  return parseVerdict(text);
}

/**
 * Pull the verdict out of the reply.
 *
 * The model is asked for strict JSON and has given exactly that in every run so
 * far, but a model is not a parser: it may wrap the object in prose or a code
 * fence. Rather than trust the whole reply, the first balanced JSON object is
 * extracted.
 */
export function parseVerdict(text: string): IdentityVerdict {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(`Muse Wonder did not return JSON: ${text.slice(0, 200)}`);
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error(`Muse Wonder returned malformed JSON: ${text.slice(start, start + 200)}`);
  }

  return {
    sameStoryObject: raw.same_story_object === true,
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
    reason: typeof raw.reason === "string" ? raw.reason : "",
    objectLabel: typeof raw.object_label === "string" ? raw.object_label : "",
    visibleChanges: typeof raw.visible_changes === "string" ? raw.visible_changes : "",
  };
}

/**
 * Fold every appearance into the objects they belong to.
 *
 * Each appearance is compared against the objects found so far, cheapest-first:
 * the comparison is made against an object's FIRST appearance, which is the one
 * closest to how the object is introduced. A chapter with four panels costs at
 * most three calls — there is no need for every pair.
 */
export async function resolveObjects(
  appearances: PanelAppearance[],
  cropPathOf: (appearance: PanelAppearance) => string,
  story: StoryContext,
): Promise<ResolvedObject[]> {
  const objects: ResolvedObject[] = [];

  for (const appearance of appearances) {
    let merged = false;

    for (const object of objects) {
      const verdict = await compareAppearances(
        cropPathOf(object.appearances[0]),
        cropPathOf(appearance),
        story,
      );

      if (verdict.sameStoryObject && verdict.confidence >= MERGE_THRESHOLD) {
        object.appearances.push(appearance);
        object.evidence.push(verdict);
        // The label comes from the model; keep the first non-empty one.
        if (!object.label && verdict.objectLabel) object.label = verdict.objectLabel;
        merged = true;
        break;
      }
    }

    if (!merged) {
      objects.push({ label: "", appearances: [appearance], evidence: [] });
    }
  }

  return objects;
}

/** What to call an object: the model's label, or the search prompt as fallback. */
export function labelOf(object: ResolvedObject, searchPrompt: string): string {
  return object.label || searchPrompt;
}

/**
 * The object the chapter is about: the one seen in the most panels, with the
 * most confident sighting breaking a tie. That is the one worth collecting.
 */
export function primaryObject(objects: ResolvedObject[]): ResolvedObject | null {
  if (objects.length === 0) return null;

  return objects.reduce((best, candidate) => {
    if (candidate.appearances.length !== best.appearances.length) {
      return candidate.appearances.length > best.appearances.length ? candidate : best;
    }
    const peak = (o: ResolvedObject) => Math.max(...o.appearances.map((a) => a.confidence));
    return peak(candidate) > peak(best) ? candidate : best;
  });
}

/** The appearance to crop for the collectible: the one SAM was surest about. */
export function bestAppearance(object: ResolvedObject): PanelAppearance {
  return object.appearances.reduce((best, a) => (a.confidence > best.confidence ? a : best));
}
