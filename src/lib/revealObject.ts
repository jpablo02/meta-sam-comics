/**
 * Turn the object found in the panels into the collectible, with Muse Image.
 *
 * The crop SAM cut from the best panel goes in as the reference image, so what
 * comes back is the same object — same paper, same wear, same shape — staged as
 * a display piece, instead of a fresh object drawn from a description that
 * merely sounds like it.
 *
 * Two versions, two calls, on purpose:
 *
 *  - TEASER: what anyone sees. The object, beautifully staged, its contents
 *    present and unreadable — the same promise the panels make.
 *  - REVEALED: what the collector gets. The same object with its real text
 *    printed on it.
 *
 * The text is written by Muse Spark and handed to Muse Image to print. Left to
 * itself, Muse Image invents its own lettering — "Nullar Rans" on a first run,
 * generic security-advisory boilerplate on a later one. Given the exact lines,
 * it printed them word for word, on the paper, in the right place.
 *
 * Rendering one image and hiding half of it in the UI would ship the answer to
 * anyone who opens devtools. Two files means the teaser never contains it.
 */
import { generateWithReferences } from "./drawPanels";
import type { ObjectContents } from "./writeContents";

/** Vertical, like the panels: a collectible card that fits a phone and a Story. */
export const COLLECTIBLE_SIZE = "1024x1536";

export interface RevealOptions {
  /** What the object is, in the story's words. */
  objectName: string;
  /** Art direction for the display piece. */
  treatment?: string;
}

const DEFAULT_TREATMENT =
  "floating alone against a dark atmospheric background that echoes the story's world, " +
  "dramatic rim lighting, premium collectible presentation";

function basePrompt({ objectName, treatment }: RevealOptions): string[] {
  return [
    `The exact same ${objectName} shown in the reference image, presented as a collectible:`,
    treatment?.trim() || DEFAULT_TREATMENT,
    "Keep the same object: same shape, same material, same wear and damage, same colours.",
    "It is shown flat and front-facing, filling most of the frame. No hands, no people.",
  ];
}

/** What anyone sees: the object, its contents unreadable. */
export async function revealTeaser(cropPath: string, outPath: string, options: RevealOptions): Promise<string> {
  const prompt = [
    ...basePrompt(options),
    "Its contents are present but NOT readable: the writing is blurred, faded, scorched or",
    "partly covered by shadow, so the viewer can tell there is a message and cannot read a",
    "single word of it.",
  ].join(" ");
  return generateWithReferences(prompt, [cropPath], COLLECTIBLE_SIZE, outPath);
}

/** What the collector gets: the same object with its real text printed on it. */
export async function revealContents(
  cropPath: string,
  outPath: string,
  options: RevealOptions,
  contents: ObjectContents,
): Promise<string> {
  /**
   * The text goes between markers, one line per line, with no bullets or labels.
   * Muse Image prints what it is given with the same fidelity that makes this
   * work at all: handed "Title: …" and "- line", it engraved "Title:" and the
   * dashes on a love inscription inside a watch lid.
   */
  const lines = [contents.title, ...contents.revealed].map((l) => l.trim()).filter(Boolean);
  const prompt = [
    ...basePrompt(options),
    "Every line written on it must be sharp and readable.",
    "",
    "Write EXACTLY the text between the markers on the object, line by line as given — no",
    "extra words, no labels, no bullet points, no quotation marks:",
    "<<<",
    ...lines,
    ">>>",
    "",
    "Match the lettering to the object: engraved letters on metal, typewriter print on a report,",
    "handwriting on a note, stamped ink on a ticket.",
  ].join("\n");
  return generateWithReferences(prompt, [cropPath], COLLECTIBLE_SIZE, outPath);
}
