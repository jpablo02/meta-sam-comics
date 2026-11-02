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
import { metaClient } from "./metaClient";
import { MUSE_SPARK_MODEL, type ObjectContents } from "./writeContents";

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
    "Keep the same object: same shape, same material, same wear and damage, same colours,",
    "the same number of pieces opening the same way — never an extra lid, leaf or compartment.",
    // "Filling most of the frame" made a vertical card stretch what is long and thin:
    // a cinema ticket became a folded letter, a dog collar a strip cut off at both edges.
    // No examples of objects here: listing "a key" among them put a brass key beside a photo.
    "Keep its REAL proportions: never stretched, enlarged or reshaped to fill the frame. If it",
    "is long and thin it lies on a diagonal, whole, with dark space around it. It is shown flat",
    "and front-facing. It is the ONLY object in the frame — nothing beside it. No hands, no people.",
  ];
}

/**
 * How to stage this one object so its message faces the viewer.
 *
 * The collector's card is drawn from the teaser in the same pose, so the teaser
 * must already show where the message is: a closed diary left the reveal nowhere
 * to write but the cover, a sealed envelope only its back. One general sentence
 * could not serve every object — with examples in it, a compass engraved inside
 * its lid grew a paper note; without them, the envelope stayed shut. So each
 * object gets its own sentence, written from its own description.
 */
async function displayPose({ objectName, description }: RevealOptions): Promise<string> {
  try {
    const completion = await metaClient().chat.completions.create({
      model: MUSE_SPARK_MODEL,
      messages: [
        {
          role: "user",
          content:
            `An illustrator will draw this object alone, as a display piece: ${objectName} — ${description}\n\n` +
            "In ONE sentence, say how to pose it so the surface that carries its written message " +
            "faces the viewer, flat and visible. If that surface is inside something a hand can " +
            "open (a cover, a lid, a flap, an envelope, a fold), say how it is opened to show it. " +
            "If it can never be opened (a corked bottle), it stays closed and is seen through. Use " +
            "only the parts named in the description, each at its real size; never add a note, paper or any new piece. " +
            "Answer with the sentence only.",
        },
      ],
    });
    const pose = completion.choices[0]?.message?.content?.trim();
    if (pose) {
      console.log(`[teaser] pose: ${pose}`);
      return `Pose: ${pose}`;
    }
  } catch (err) {
    console.warn(`[teaser] no display pose — drawing without one: ${String(err).slice(0, 160)}`);
  }
  return "";
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
    options.description ? await displayPose(options) : "",
    "Add nothing the description does not have — no note, paper, label, patch or extra piece.",
    // "Scorched" was one of the ways offered to hide the words: every paper card came
    // back with burnt edges, and a spoon carved on its handle grew a burnt patch in
    // its bowl, which the collector's card then wrote on like a scrap of paper.
    "Its contents are present but NOT readable: the writing sits exactly where the description",
    "puts it, made the way the object carries it (ink, carving, print), and is too small, faint,",
    "blurred or shadowed to read a single word. The object itself stays undamaged — no burns,",
    "no scorch marks, no torn or charred edges unless the description has them.",
  ]
    .filter(Boolean)
    .join(" ");
  // The sheet alone when there is one. Given the crop first and the sheet second,
  // the Tide of Secrets card kept the crop's glare and lost the barnacles, and
  // stuck the letter on the OUTSIDE of the bottle as a label. The crop is the
  // last resort, when the sheet keeps being refused.
  const tries = objectSheet ? [[objectSheet], [objectSheet], [objectSheet], [cropPath], [cropPath]] : [[cropPath], [cropPath], [cropPath], [cropPath]];
  return untilAccepted("teaser", tries, (refs) => generateWithReferences(prompt, refs, COLLECTIBLE_SIZE, outPath));
}

/**
 * Muse Image's filter refuses at random: on a bronze key with nothing sensitive
 * in it, the same teaser request passed, failed, then passed again. Two of three
 * test comics died on the teaser, the last step of seven minutes. A refusal gets
 * the next set of references; anything else fails at once.
 */
async function untilAccepted<T>(label: string, tries: T[], draw: (attempt: T) => Promise<string>): Promise<string> {
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
  const prompt = (o: RevealOptions) => revealedPrompt(o, lines, Boolean(teaserPath));

  // The teaser alone: it is already drawn from the object sheet, and two-reference
  // attempts on the Tide of Secrets remake were refused twice in a row.
  //
  // The last try names nothing. A "Black Box from Ares IV — titanium flight
  // recorder" was refused five times running, with or without its text; asked to
  // reproduce "a single object" in the reference, the same card passed. A flight
  // recorder reads as a crash, whatever the story says it is.
  const refs = [teaserPath ?? cropPath];
  // Six tries, not three: Aurelio's love letter, nothing sensitive in it, was
  // refused on all three tries of one run and passed on the first of the next.
  const plain = { objectName: "single object" };
  return untilAccepted("revealed", [options, options, plain, plain, plain, plain], (o) =>
    generateWithReferences(prompt(o), refs, COLLECTIBLE_SIZE, outPath),
  );
}

function revealedPrompt(options: RevealOptions, lines: string[], fromTeaser: boolean): string {
  // The fallback once had a beige studio backdrop where the teaser was dark smoke:
  // the background has to be named as part of what stays.
  const staging = fromTeaser
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

  return [
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
}
