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
  /** What it is made of and where its contents sit — "a letter rolled INSIDE the bottle". */
  description?: string;
  /** Art direction for the display piece. */
  treatment?: string;
}

const DEFAULT_TREATMENT =
  "floating alone against a dark atmospheric background that echoes the story's world, " +
  "dramatic rim lighting, premium collectible presentation";

function basePrompt({
  objectName,
  description,
  treatment,
}: RevealOptions): string[] {
  return [
    `The exact same ${objectName} shown in the reference image, presented as a collectible:`,
    treatment?.trim() || DEFAULT_TREATMENT,
    description ? `What it is: ${description}` : "",
    "Keep the same object: same shape, same material, same wear and damage, same colours.",
    "It is shown flat and front-facing, filling most of the frame. No hands, no people.",
  ];
}

/**
 * What anyone sees: the object, its contents unreadable.
 *
 * With the object sheet as a second reference, the card is the object the
 * panels were drawn from — the crop alone is a few hundred pixels of it.
 */
export async function revealTeaser(
  cropPath: string,
  outPath: string,
  options: RevealOptions,
  objectSheet?: string | null,
): Promise<string> {
  const prompt = [
    ...basePrompt(options),
    "Its contents sit exactly where the reference shows them — nothing moves from inside to outside.",
    "Its contents are present but NOT readable: the writing is blurred, faded, scorched or",
    "partly covered by shadow, so the viewer can tell there is a message and cannot read a",
    "single word of it.",
  ]
    .filter(Boolean)
    .join(" ");
  // The sheet alone when there is one. Given the crop first and the sheet second,
  // the Tide of Secrets card kept the crop's glare and lost the barnacles, and
  // stuck the letter on the OUTSIDE of the bottle as a label. The crop is the
  // last resort, when the sheet keeps being refused.
  const tries = objectSheet ? [[objectSheet], [objectSheet], [cropPath]] : [[cropPath], [cropPath]];
  return untilAccepted("teaser", tries, (refs) => generateWithReferences(prompt, refs, COLLECTIBLE_SIZE, outPath));
}

/**
 * Muse Image's filter refuses at random: on a bronze key with nothing sensitive
 * in it, the same teaser request passed, failed, then passed again. Two of three
 * test comics died on the teaser, the last step of seven minutes. A refusal gets
 * the next set of references; anything else fails at once.
 */
async function untilAccepted(label: string, tries: string[][], draw: (refs: string[]) => Promise<string>): Promise<string> {
  for (let i = 0; ; i++) {
    try {
      return await draw(tries[i]);
    } catch (err) {
      if (i === tries.length - 1 || !/\((400|422)\)/.test(String(err))) throw err;
      console.warn(`[${label}] refused (${i + 1}/${tries.length}) — trying again: ${String(err).slice(0, 160)}`);
    }
  }
}

/**
 * What the collector gets: the teaser card, with the real text now on the object.
 *
 * Drawn FROM the teaser, not from the crop: the card turns over in the UI, and
 * the reveal only lands if it is the same object in the same pose, now readable.
 * Drawn from the crop alone, the two cards came back as two different daggers.
 */
export async function revealContents(
  cropPath: string,
  outPath: string,
  options: RevealOptions,
  contents: ObjectContents,
  teaserPath?: string,
): Promise<string> {
  /**
   * The text goes between markers, one line per line, with no bullets or labels.
   * Muse Image prints what it is given with the same fidelity that makes this
   * work at all: handed "Title: …" and "- line", it engraved "Title:" and the
   * dashes on a love inscription inside a watch lid.
   *
   * It must also be told what the text is NOT. Asked only for "engraved
   * letters", it set a glowing serif caption over a dagger's blade — legible,
   * and plainly pasted on.
   */
  const lines = [contents.title, ...contents.revealed]
    .map((l) => l.trim())
    .filter(Boolean);
  // The fallback once had a beige studio backdrop where the teaser was dark smoke:
  // the background has to be named as part of what stays.
  const staging = teaserPath
    ? [
        `The reference image is a collectible card of a ${options.objectName}. Reproduce it exactly — same`,
        "object, same pose, same framing, the SAME dark background, the same lighting and colours —",
        "changing ONE thing: the writing on the object is now sharp and readable. Add nothing: no",
        "frame, no border, no mount, no new or lighter background.",
      ]
    : [
        ...basePrompt(options).filter(Boolean),
        "Every line written on it must be sharp and readable.",
      ];
  // Where the words go. Told only "the text is part of the object", the bottle's
  // letter was written across the glass instead of on the paper inside it.
  const where = options.description
    ? [
        "",
        `What the object is: ${options.description}`,
        "The text goes on the part that carries the message, where the description puts it — the back",
        "of a ticket, the inside of a watch lid, a dagger's blade, a letter's paper (read through the",
        "glass when it is inside a bottle) — never moved onto some other surface of the object.",
      ]
    : [];

  const prompt = [
    ...staging,
    ...where,
    "",
    "Write EXACTLY the text between the markers on the object, line by line as given — no",
    "extra words, no labels, no bullet points, no quotation marks:",
    "<<<",
    ...lines,
    ">>>",
    "",
    "The text is PART OF THE OBJECT, made the way that object would really carry it:",
    "- metal, stone, wood: cut INTO the surface — real depth, shadow inside every groove, light",
    "  catching the edges, the same patina and wear as the rest of the object;",
    "- paper, parchment, cloth: ink or graphite absorbed into the fibres, following every fold,",
    "  crease and curl; handwriting on a letter, typewriter print on a report, stamped ink on a ticket;",
    "- glass, ceramic, leather: etched, painted, or burned in, as that material allows.",
    "The lettering follows the surface's shape, perspective and curvature, sized to fit it, in a",
    "style true to the object's era. It is NOT a caption: no glow, no light coming from the letters,",
    "no text box, no flat overlay, no lettering floating in front of the object.",
    "Each line appears once — no word repeated.",
  ].join("\n");

  // The teaser alone: it is already drawn from the object sheet, and two-reference
  // attempts on the Tide of Secrets remake were refused twice in a row.
  const refs = [teaserPath ?? cropPath];
  return untilAccepted("revealed", [refs, refs, refs], (r) => generateWithReferences(prompt, r, COLLECTIBLE_SIZE, outPath));
}
