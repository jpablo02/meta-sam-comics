/**
 * Turn a reader's idea into a four-panel script, with Muse Spark.
 *
 * On Token Comic this is a conversation in stages — idea, cast, script — with
 * the creator confirming each one. The demo collapses it into one call, but
 * keeps the rules those stages were built on, each of which exists because a
 * real chapter came back wrong without it:
 *
 *  - Names the user gave are used exactly. The model otherwise invents generic
 *    ones ("Aris Thorne") over the name sitting in the user's own title.
 *  - Every visual trait is filled, concrete and in English. "Normal hair" is how
 *    a character changes face between panels.
 *  - What the user said about a character outranks any famous character with a
 *    similar name.
 *  - The script tells ONE causal sequence: each panel happens because of the one
 *    before it.
 *  - The story object is part of the plot, not a prop. The reader's idea names
 *    it or hints at it, and it must appear in at least two panels — the object
 *    pipeline needs more than one sighting to tell its story.
 */
import { metaClient } from "./metaClient";
import { MUSE_SPARK_MODEL } from "./writeContents";
import type { Chapter } from "./chapter";
import type { Character, ComicBible, Location, PanelScene } from "./comicPrompts";

export const PANEL_COUNT = 4;

export const DEFAULT_ART_STYLE =
  "semi-realistic digital painting, detailed rendering, soft cinematic lighting, rich color palette, painterly comic style";

export interface ScriptScene extends PanelScene {
  /** What happens, in English, for the reader-facing UI. */
  description: string;
  /** English, short: drawn in the speech bubble. */
  dialogue: string;
}

export interface ComicScript {
  seriesTitle: string;
  chapterTitle: string;
  genre: string;
  tone: string;
  logline: string;
  synopsis: string;
  artStyle: string;
  characters: Character[];
  locations: Location[];
  storyObject: {
    name: string;
    description: string;
    /** What it actually says or holds. Never drawn in a panel. */
    secretContent: string;
    plantedInPanels: number[];
  };
  scenes: ScriptScene[];
}

function buildPrompt(idea: string, artStyle: string): string {
  return `You are the creative director of a comic studio. A reader wrote the idea below. Turn it
into the script of ONE comic chapter of exactly ${PANEL_COUNT} vertical panels.

THE READER'S IDEA (ground truth — do not contradict it, do not "improve" it):
"""
${idea.trim()}
"""

NAMES: if the idea names anyone, use that name EXACTLY — no added surnames or titles. Invent a
name only for a character the idea leaves unnamed.

CHARACTERS (1 to 3): every field of "traits" filled, concrete and visual, in English — exact
hair colour and cut, eye colour, skin tone, build, every garment with its colour, and one
distinctive mark. Never "normal hair" or "casual clothes". If the idea describes a character
(skin, build, height, clothes), those traits go in EXACTLY, even if the name resembles a famous
character who "should" look different. Do not default everyone to slim and fair-skinned.

LOCATIONS: declare each place once with a detailed, stable visual description (architecture,
materials, colours, defining props, lighting), so it is drawn as the same place every time.

THE STORY OBJECT — mandatory, and the heart of this product. Readers collect an object that
lives INSIDE the plot; what it says or holds is revealed only to whoever collects it.
- If the idea names or hints at an object, THAT is the object. Use the reader's hints.
- If it does not, choose one a character can hold, hide, hand over or find: a folded letter,
  a printed report, a ticket with something written on the back, a locket, a key with an
  engraved initial. Nothing generic or symbolic.
- It must appear in AT LEAST TWO panels ("plantedInPanels"), visibly handled by a character,
  its contents never readable on the page.
- "secretContent" is the collector's reward: the exact words, the photo, what the key opens.
  It must add real information to the story — something that changes how the chapter reads.
- Write the story so the object MATTERS: someone looks at it, reacts to it, passes it on.

SEQUENCE: the ${PANEL_COUNT} panels tell one causal story — panel 1 sets up, 2 and 3 complicate,
4 lands the ending. Each panel happens AFTER the previous one and BECAUSE of it.

LANGUAGE: the idea may be written in any language (often Spanish). EVERYTHING you write is in
English — titles, descriptions, traits, locations, imagePrompt, dialogue, every object field.
Translate names of things, never the names of people.

"dialogue" names who speaks, and separates speakers with " | ":
"Camila: Look what the net brought! | Ramiro: No... I know that bottle." Short lines — each one
fits a speech bubble. Leave it empty for a silent panel.

"imagePrompt" describes ONLY action, camera angle, lighting and mood. Name characters, never
describe how they look (that is injected from "traits"). Name the location in "location";
do not describe it again.

Answer with strict JSON only, in this exact shape:
{
  "seriesTitle": "", "chapterTitle": "", "genre": "", "tone": "",
  "logline": "one sentence", "synopsis": "where the series goes beyond this chapter, 2 sentences",
  "artStyle": "${artStyle}",
  "characters": [{ "name": "", "appearance": "one-line English summary",
    "traits": { "age": "", "build": "", "skin": "", "hair": "", "eyes": "", "outfit": "", "distinctive": "" } }],
  "locations": [{ "name": "", "description": "" }],
  "storyObject": { "name": "", "description": "", "secretContent": "", "plantedInPanels": [2, 3] },
  "scenes": [{ "panelNumber": 1, "description": "", "imagePrompt": "", "characters": [""],
    "location": "", "dialogue": "" }]
}`;
}

function extract(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error(`Muse Spark did not return JSON: ${text.slice(0, 200)}`);
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Check what the rest of the pipeline relies on. A script that breaks one of
 * these would not fail here — it would fail three models later, as a panel with
 * nobody in it or an object SAM is never asked to find.
 */
export function validateScript(script: ComicScript): string[] {
  const problems: string[] = [];
  const names = new Set(script.characters.map((c) => c.name.toLowerCase()));
  const places = new Set(script.locations.map((l) => l.name.toLowerCase()));

  if (script.scenes.length !== PANEL_COUNT) problems.push(`expected ${PANEL_COUNT} scenes, got ${script.scenes.length}`);
  if (script.characters.length === 0) problems.push("no characters");
  for (const c of script.characters) {
    const missing = (["age", "build", "skin", "hair", "eyes", "outfit"] as const).filter((k) => !c.traits?.[k]?.trim());
    if (missing.length) problems.push(`${c.name} is missing traits: ${missing.join(", ")}`);
  }
  for (const s of script.scenes) {
    for (const n of s.characters) {
      if (!names.has(n.toLowerCase())) problems.push(`panel ${s.panelNumber} names unknown character "${n}"`);
    }
    if (s.location && !places.has(s.location.toLowerCase())) {
      problems.push(`panel ${s.panelNumber} uses undeclared location "${s.location}"`);
    }
  }
  const planted = script.storyObject.plantedInPanels.filter((p) => p >= 1 && p <= PANEL_COUNT);
  if (planted.length < 2) problems.push("story object must be planted in at least two panels");
  if (!script.storyObject.secretContent.trim()) problems.push("story object has no secret content");
  return problems;
}

/**
 * Write the script. If the first draft breaks a rule the pipeline depends on,
 * the problems are handed back once for a corrected draft — cheaper than
 * finding out after four panels have been drawn.
 */
export async function writeScript(idea: string, artStyle = DEFAULT_ART_STYLE): Promise<ComicScript> {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "user", content: buildPrompt(idea, artStyle) },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await metaClient().chat.completions.create({ model: MUSE_SPARK_MODEL, messages });
    const text = completion.choices[0]?.message?.content ?? "";
    const script = extract(text) as unknown as ComicScript;
    script.artStyle ||= artStyle;

    const problems = validateScript(script);
    if (problems.length === 0) return script;
    if (attempt === 1) throw new Error(`Script still invalid after correction: ${problems.join("; ")}`);

    messages.push({ role: "assistant", content: text });
    messages.push({
      role: "user",
      content: `Fix these problems and return the full corrected JSON only:\n- ${problems.join("\n- ")}`,
    });
  }
  throw new Error("unreachable");
}

/** The parts the drawing step needs. */
export function toBible(script: ComicScript): ComicBible {
  return {
    artStyle: script.artStyle,
    characters: script.characters,
    locations: script.locations,
    storyObject: {
      name: script.storyObject.name,
      description: script.storyObject.description,
      plantedInPanels: script.storyObject.plantedInPanels,
    },
  };
}

/** The parts the object pipeline needs, once the panels exist. */
export function toChapter(script: ComicScript, panelPaths: string[]): Chapter {
  return {
    seriesTitle: script.seriesTitle,
    chapterTitle: script.chapterTitle,
    genre: script.genre,
    tone: script.tone,
    logline: script.logline,
    synopsis: script.synopsis,
    secretObjectName: script.storyObject.name,
    scenes: script.scenes.map((s) => ({
      panelNumber: s.panelNumber,
      location: s.location ?? "",
      characters: s.characters,
      description: s.imagePrompt,
      dialogue: s.dialogue,
    })),
    panelPaths,
  };
}
