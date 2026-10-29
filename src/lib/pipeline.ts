/**
 * From a reader's idea to a comic with a collectible inside it.
 *
 *   idea ─ Muse Spark ──▶ script (cast, places, 4 scenes, story object + its secret)
 *        ─ Muse Image ──▶ one portrait per character + one sheet of the story object
 *        ─ Muse Image ──▶ 4 vertical panels, each anchored on the portraits and the
 *                         object sheet of what appears in it
 *        ─ Muse Wonder + SAM 3.1 ──▶ the object, found in every panel the script plants it
 *        ─ Muse Wonder ──▶ its name as drawn, and what happened to it
 *        ─ Muse Wonder + SAM 3.1 ──▶ speech bubbles: every speaker's face found, the
 *                                    dialogue placed around faces and the object
 *        ─ Muse Spark ──▶ what it says: a teaser, and the revealed text
 *        ─ Muse Image ──▶ the collectible: teaser card + revealed card
 *        ─ (local) ─────▶ two reels: the story reel to share, and the spotlight
 *                         reel that shows where SAM found the gem
 *
 * Every step reports progress through `onStep`, driven by real completion — the
 * UI shows what has actually finished, not a timer.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { writeScript, toBible, toChapter, type ComicScript } from "./writeScript";
import { drawObjectSheet, drawPortraits, drawPanel, type PanelRung } from "./drawPanels";
import { locateInPanel, describeJourney, type Sighting, type Journey } from "./locateObject";
import { writeContents, type ObjectContents } from "./writeContents";
import { revealTeaser, revealContents } from "./revealObject";
import { buildReel } from "./buildReel";
import { buildStoryReel } from "./storyReel";
import { bakeBubbles, type Box } from "./bubbles";

export type Step =
  | "script"
  | "portraits"
  | "panels"
  | "object"
  | "dialogue"
  | "contents"
  | "collectible"
  | "reel"
  | "done";

export interface ComicResult {
  script: ComicScript;
  portraits: Record<string, string>;
  /** Wordless art, as drawn. SAM reads these. */
  panels: string[];
  /** The same panels with their dialogue baked in. Readers see these. */
  lettered: string[];
  /** How each panel was drawn — "no-references" means its faces were not anchored. */
  panelRungs: PanelRung[];
  sightings: Sighting[];
  journey: Journey;
  contents: ObjectContents;
  /** Public card: the object, contents unreadable. */
  teaserPath: string;
  /** Collector's card: the object with its text. */
  revealedPath: string;
  /** Spotlight reel: each panel dimmed around the gem — how SAM found it. */
  reelPath: string;
  /** Story reel: the one a reader shares. */
  storyReelPath: string;
}

export interface RunOptions {
  artStyle?: string;
  onStep?: (step: Step, detail?: string) => void;
}

/** PNG copies: every later step (SAM, crops, the reel) reads PNG. */
async function toPng(webp: string): Promise<string> {
  const png = webp.replace(/\.webp$/, ".png");
  await sharp(webp).png().toFile(png);
  return png;
}

export async function runComic(idea: string, workDir: string, options: RunOptions = {}): Promise<ComicResult> {
  const step = options.onStep ?? (() => {});
  await mkdir(workDir, { recursive: true });

  step("script");
  const script = await writeScript(idea, options.artStyle);
  const bible = toBible(script);

  step("portraits", script.characters.map((c) => c.name).join(", "));
  // The cast and the gem are drawn once each, side by side; every panel copies them.
  const [portraitMap, objectSheet] = await Promise.all([drawPortraits(bible, workDir), drawObjectSheet(bible, workDir)]);

  const panels: string[] = [];
  const panelRungs: PanelRung[] = [];
  for (const scene of script.scenes) {
    step("panels", `${scene.panelNumber}/${script.scenes.length}`);
    const out = join(workDir, `panel-${scene.panelNumber}.webp`);
    panelRungs.push(await drawPanel(scene, bible, portraitMap, out, objectSheet));
    panels.push(await toPng(out));
  }

  step("object", script.storyObject.name);
  const object = { name: script.storyObject.name, description: script.storyObject.description };
  const sightings: Sighting[] = [];
  for (const n of script.storyObject.plantedInPanels) {
    const scene = script.scenes.find((s) => s.panelNumber === n);
    if (!scene) continue;
    const found = await locateInPanel(
      panels[n - 1],
      { panelNumber: n, description: scene.imagePrompt, location: scene.location, characters: scene.characters },
      object,
      workDir,
    );
    if (found) sightings.push(found);
  }
  if (sightings.length === 0) {
    throw new Error(`The story object "${object.name}" was not found in any of its panels`);
  }
  const journey = await describeJourney(sightings, object);

  // Dialogue goes on AFTER the object is found: SAM must read the wordless art,
  // and the bubbles must know where the object is so they never cover it.
  const lettered: string[] = [];
  for (const scene of script.scenes) {
    step("dialogue", `${scene.panelNumber}/${script.scenes.length}`);
    const n = scene.panelNumber;
    const raw = panels[n - 1];
    const avoid: Box[] = [];
    const sighting = sightings.find((s) => s.panelNumber === n);
    if (sighting) {
      const { width = 0, height = 0 } = await sharp(raw).metadata();
      const a = sighting.appearance;
      const sx = width / a.canvas.w;
      const sy = height / a.canvas.h;
      avoid.push({ x1: a.box.x1 * sx, y1: a.box.y1 * sy, x2: a.box.x2 * sx, y2: a.box.y2 * sy });
    }
    const out = join(workDir, `panel-${n}-lettered.png`);
    await bakeBubbles(raw, scene.dialogue ?? "", script.characters, out, avoid, n);
    lettered.push(out);
  }

  step("contents");
  const chapter = toChapter(script, panels);
  const contents = await writeContents(chapter, journey.label, journey.visibleChanges, script.storyObject.secretContent);

  step("collectible");
  // Reveal from the sighting SAM and Wonder were surest about.
  const best = sightings.reduce((a, b) => (b.confidence > a.confidence ? b : a));
  const reveal = { objectName: script.storyObject.name };
  const teaserPath = await toPng(await revealTeaser(best.cropPath, join(workDir, "collectible-teaser.webp"), reveal, objectSheet));
  const revealedPath = await toPng(
    await revealContents(best.cropPath, join(workDir, "collectible-revealed.webp"), reveal, contents, teaserPath),
  );

  step("reel");
  // Two reels: the one a reader posts, and the spotlight one that shows how SAM
  // found the gem (for the demo, not for a feed).
  const storyReelPath = await buildStoryReel(
    {
      seriesTitle: script.seriesTitle,
      chapterTitle: script.chapterTitle,
      panels: lettered.map((path, i) => ({ path, dialogue: script.scenes[i]?.dialogue ?? "" })),
      teaserPath,
    },
    workDir,
  );
  const reelPath = await buildReel(
    lettered.map((path, i) => ({ path, sighting: sightings.find((s) => s.panelNumber === i + 1)?.appearance })),
    teaserPath,
    workDir,
  );

  step("done");
  return {
    script,
    portraits: Object.fromEntries(portraitMap),
    panels,
    lettered,
    panelRungs,
    sightings,
    journey,
    contents,
    teaserPath,
    revealedPath,
    reelPath,
    storyReelPath,
  };
}
