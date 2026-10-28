/**
 * Write what the object actually says, with Muse Spark.
 *
 * The chapter shows the report and refuses to let you read it — the script
 * itself asked for the printout to be "obscured" and "without being readable".
 * That withholding is the product: you can see the object exists, and
 * collecting it is what opens it.
 *
 * So the reveal cannot be left to the image model. Asked to draw a document,
 * Muse Image draws letter shapes — on a first run it produced "Nullar Rans" and
 * "Mersiar pare", which look like text from a distance and say nothing. Muse
 * Spark writes the words; they are composed onto the artwork as real type.
 *
 * Two versions come back:
 *   - `teaser` is what anyone can see. It says enough to prove the document is
 *     real and not enough to be worth keeping.
 *   - `revealed` is what the collector gets, and it carries something the
 *     chapter has not told anyone yet.
 */
import { metaClient } from "./metaClient";
import type { Chapter } from "./chapter";
import { storySummary } from "./chapter";

export const MUSE_SPARK_MODEL = "muse-spark-1.3";

export interface ObjectContents {
  /** The object's heading, as printed on it. */
  title: string;
  /** Visible to everyone: legible, deliberately incomplete. */
  teaser: string[];
  /** Unlocked by collecting it. The part that was withheld. */
  revealed: string[];
  /** One line of what this sets up — the hook into what happens next. */
  foreshadow: string;
}

function buildPrompt(chapter: Chapter, objectLabel: string, changes: string): string {
  return [
    `You are writing the contents of an object from a comic: the "${chapter.secretObjectName}".`,
    "",
    `Series: ${chapter.seriesTitle}. Chapter: ${chapter.chapterTitle}. Genre: ${chapter.genre}, ${chapter.tone}.`,
    `Story so far: ${storySummary(chapter)}`,
    `Where the series is going: ${chapter.synopsis}`,
    changes ? `What happened to the object across the chapter: ${changes}` : "",
    "",
    `In the artwork the object appears as: ${objectLabel}. The chapter deliberately shows it`,
    "without letting the reader read it. Your job is to write what it says.",
    "",
    "Write TWO versions:",
    "",
    "1. TEASER — what any reader can see on the page. Legible and real, but it stops short:",
    "   headings, a classification line, the first line of a finding. Enough to prove the",
    "   document is genuine, not enough to be worth owning. 3 to 5 short lines.",
    "",
    "2. REVEALED — what someone who collects this object gets to read. The substance the",
    "   chapter withheld: the actual finding, in the voice of whoever wrote the document.",
    "   It must be consistent with everything above. 5 to 8 short lines.",
    "",
    "The REVEALED version must contain one concrete detail that the chapter has NOT shown —",
    "something that sets up what happens next in the series. Not a summary of what readers",
    "already saw. Whoever reads this knows something other readers do not.",
    "",
    "Stay in the world of the story. Write as the document, not about it. No commentary.",
    "",
    "Answer with strict JSON only:",
    '{"title": "the heading printed on the object",',
    ' "teaser": ["line", "line", "line"],',
    ' "revealed": ["line", "line", "line", "line", "line"],',
    ' "foreshadow": "one sentence naming what this sets up"}',
  ]
    .filter(Boolean)
    .join("\n");
}

/** Pull the first balanced JSON object out of a reply. */
export function parseContents(text: string): ObjectContents {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(`Muse Spark did not return JSON: ${text.slice(0, 200)}`);
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error(`Muse Spark returned malformed JSON: ${text.slice(start, start + 200)}`);
  }

  const lines = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

  return {
    title: typeof raw.title === "string" ? raw.title : "",
    teaser: lines(raw.teaser),
    revealed: lines(raw.revealed),
    foreshadow: typeof raw.foreshadow === "string" ? raw.foreshadow : "",
  };
}

/**
 * Write the object's contents.
 *
 * `objectLabel` and `changes` come from the identity step — the model named the
 * object and described what happened to it between panels, and both make the
 * writing specific to this chapter rather than generic.
 */
export async function writeContents(
  chapter: Chapter,
  objectLabel: string,
  changes = "",
): Promise<ObjectContents> {
  const completion = await metaClient().chat.completions.create({
    model: MUSE_SPARK_MODEL,
    messages: [{ role: "user", content: buildPrompt(chapter, objectLabel, changes) }],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Muse Spark returned an empty reply");
  return parseContents(text);
}
