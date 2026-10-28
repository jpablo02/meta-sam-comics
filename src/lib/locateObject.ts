/**
 * Find the story object in each panel the script puts it in.
 *
 * The first design tracked a generic phrase through a video of the chapter and
 * then asked Muse Wonder whether pairs of crops were the same object. On a
 * chapter with more paperwork in it, that failed twice over — measured:
 *
 *  - SAM answers a phrase with the ONE instance it rates best. "white paper
 *    document" picked papers on Wesley's desk and a note under Zully's phone;
 *    the report in her hands was never a candidate.
 *  - Chained pairwise comparison, told that panel-to-panel differences are
 *    normal, merged all three: "the report went from lying on the table to
 *    being held". Plausible, and wrong.
 *
 * The script already knows what the object is, who has it and in which scenes
 * it appears. So the script is the reference, and each model does what it is
 * good at:
 *
 *   Muse Wonder  reads the scene and the panel, and writes the phrase that
 *                singles the object out ("paper held in hands")
 *   SAM 3.1      segments that phrase to the pixel
 *   Muse Wonder  checks the crop against the script — the object, or some
 *                other paper? — and on a miss proposes a different phrase
 */
import { join } from "node:path";
import { cropFromPanel } from "./cropObject";
import { segmentImage, type PanelAppearance } from "./trackObject";
import { askWonder, extractJson, num, str } from "./wonder";

export interface ObjectBrief {
  name: string;
  description: string;
}

export interface SceneBrief {
  /** 1-based, as the script numbers them. */
  panelNumber: number;
  description: string;
  location?: string;
  characters?: string[];
}

export interface Sighting {
  panelNumber: number;
  query: string;
  appearance: PanelAppearance;
  cropPath: string;
  confidence: number;
  reason: string;
}

export interface Journey {
  label: string;
  visibleChanges: string;
}

/** Phrases tried per panel before giving up on it. */
export const MAX_ATTEMPTS = 3;
/** Below this, a crop is not accepted as the object. */
export const ACCEPT_THRESHOLD = 0.75;

function sceneLine(scene: SceneBrief): string {
  const who = scene.characters?.length ? ` Characters: ${scene.characters.join(", ")}.` : "";
  const where = scene.location ? ` Location: ${scene.location}.` : "";
  return `${scene.description}${where}${who}`;
}

async function proposeQuery(
  panelPath: string,
  scene: SceneBrief,
  object: ObjectBrief,
  rejected: string[],
): Promise<string> {
  const reply = await askWonder(
    [
      "You are helping a segmentation model find ONE specific object in a comic panel.",
      `The object: "${object.name}" — ${object.description}.`,
      `What happens in this panel, per the script: ${sceneLine(scene)}`,
      "",
      "The segmentation model takes a SHORT noun phrase (2 to 5 words, English, no lists) and",
      "returns only the single best match. Other similar things may be in the frame — loose",
      "papers, props, background items — so the phrase must single out THIS object, usually by",
      "where it is or who holds it (e.g. 'paper held in hands', 'key on the table').",
      rejected.length
        ? `These phrases selected the WRONG thing; do not repeat them: ${rejected.map((r) => `"${r}"`).join(", ")}.`
        : "",
      "",
      'Answer with strict JSON only: {"query": "short noun phrase"}',
    ]
      .filter(Boolean)
      .join("\n"),
    [panelPath],
  );
  return str(extractJson(reply).query).trim();
}

async function verifyCrop(
  panelPath: string,
  cropPath: string,
  scene: SceneBrief,
  object: ObjectBrief,
): Promise<{ isObject: boolean; confidence: number; reason: string }> {
  const reply = await askWonder(
    [
      "Image 1 is a full comic panel. Image 2 is a crop taken from it.",
      `Per the script, this panel shows: ${sceneLine(scene)}`,
      `The story object is "${object.name}" — ${object.description}.`,
      "",
      "Is the crop THAT story object, or something else in the scene (another paper, a prop,",
      "background clutter)? Comic art draws the same object differently from panel to panel,",
      "so judge by role and placement in the scene, not by exact appearance.",
      "",
      'Answer with strict JSON only: {"is_story_object": true|false, "confidence": 0.0-1.0,',
      '"reason": "one short sentence"}',
    ].join("\n"),
    [panelPath, cropPath],
  );
  const raw = extractJson(reply);
  return {
    isObject: raw.is_story_object === true,
    confidence: num(raw.confidence),
    reason: str(raw.reason),
  };
}

/** Find the object in one panel. Null when every attempt missed. */
export async function locateInPanel(
  panelPath: string,
  scene: SceneBrief,
  object: ObjectBrief,
  workDir: string,
): Promise<Sighting | null> {
  const rejected: string[] = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const query = await proposeQuery(panelPath, scene, object, rejected);
    if (!query) break;

    const appearance = await segmentImage(panelPath, query, scene.panelNumber);
    if (!appearance) {
      rejected.push(query);
      continue;
    }

    const cropPath = join(workDir, `crop-panel${scene.panelNumber}-try${attempt}.png`);
    await cropFromPanel(panelPath, appearance, cropPath);

    const verdict = await verifyCrop(panelPath, cropPath, scene, object);
    if (verdict.isObject && verdict.confidence >= ACCEPT_THRESHOLD) {
      return {
        panelNumber: scene.panelNumber,
        query,
        appearance,
        cropPath,
        confidence: verdict.confidence,
        reason: verdict.reason,
      };
    }
    rejected.push(query);
  }
  return null;
}

/** Name the object and tell what happened to it across its sightings, in one call. */
export async function describeJourney(sightings: Sighting[], object: ObjectBrief): Promise<Journey> {
  if (sightings.length === 0) return { label: object.name, visibleChanges: "" };

  const reply = await askWonder(
    [
      `These are crops of the story object "${object.name}" from successive panels of a comic,`,
      "in reading order. It is the same object throughout.",
      "",
      'Answer with strict JSON only: {"object_label": "short noun phrase naming it as drawn",',
      '"visible_changes": "what happened to it across these moments, one sentence"}',
    ].join("\n"),
    sightings.map((s) => s.cropPath),
  );
  const raw = extractJson(reply);
  return {
    label: str(raw.object_label) || object.name,
    visibleChanges: str(raw.visible_changes),
  };
}
