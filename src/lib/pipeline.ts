/**
 * From a reader's idea to a comic with a collectible inside it.
 *
 *   idea ─ Muse Spark ──▶ script (cast, places, 4 scenes, story object + its secret)
 *        ─ Muse Image ──▶ one portrait per character
 *        ─ Muse Image ──▶ 4 vertical panels, each anchored on the portraits in it
 *        ─ Muse Wonder + SAM 3.1 ──▶ the object, found in every panel the script plants it
 *        ─ Muse Wonder ──▶ its name as drawn, and what happened to it
 *        ─ Muse Spark ──▶ what it says: a teaser, and the revealed text
 *        ─ Muse Image ──▶ the collectible: teaser card + revealed card
 *        ─ (local) ─────▶ the reel: the chapter with the object in a spotlight
 *
 * Every step reports progress through `onStep`, driven by real completion — the
 * UI shows what has actually finished, not a timer.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { writeScript, toBible, toChapter, type ComicScript } from "./writeScript";
import { drawPortraits, drawPanel, type PanelRung } from "./drawPanels";
import { locateInPanel, describeJourney, type Sighting, type Journey } from "./locateObject";
import { writeContents, type ObjectContents } from "./writeContents";
import { revealTeaser, revealContents } from "./revealObject";
import { buildReel } from "./buildReel";

export type Step =
  | "script"
  | "portraits"
  | "panels"
  | "object"
  | "contents"
  | "collectible"
  | "reel"
  | "done";

export interface ComicResult {
  script: ComicScript;
  portraits: Record<string, string>;
  panels: string[];
  /** How each panel was drawn — "no-references" means its faces were not anchored. */
  panelRungs: PanelRung[];
  sightings: Sighting[];
  journey: Journey;
  contents: ObjectContents;
  /** Public card: the object, contents unreadable. */
  teaserPath: string;
  /** Collector's card: the object with its text. */
  revealedPath: string;
  reelPath: string;
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
  const portraitMap = await drawPortraits(bible, workDir);

  const panels: string[] = [];
  const panelRungs: PanelRung[] = [];
  for (const scene of script.scenes) {
    step("panels", `${scene.panelNumber}/${script.scenes.length}`);
    const out = join(workDir, `panel-${scene.panelNumber}.webp`);
    panelRungs.push(await drawPanel(scene, bible, portraitMap, out));
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

  step("contents");
  const chapter = toChapter(script, panels);
  const contents = await writeContents(chapter, journey.label, journey.visibleChanges, script.storyObject.secretContent);

  step("collectible");
  // Reveal from the sighting SAM and Wonder were surest about.
  const best = sightings.reduce((a, b) => (b.confidence > a.confidence ? b : a));
  const reveal = { objectName: script.storyObject.name };
  const teaserPath = await toPng(await revealTeaser(best.cropPath, join(workDir, "collectible-teaser.webp"), reveal));
  const revealedPath = await toPng(
    await revealContents(best.cropPath, join(workDir, "collectible-revealed.webp"), reveal, contents),
  );

  step("reel");
  const reelPath = await buildReel(
    panels.map((path, i) => ({ path, sighting: sightings.find((s) => s.panelNumber === i + 1)?.appearance })),
    teaserPath,
    workDir,
  );

  step("done");
  return {
    script,
    portraits: Object.fromEntries(portraitMap),
    panels,
    panelRungs,
    sightings,
    journey,
    contents,
    teaserPath,
    revealedPath,
    reelPath,
  };
}
