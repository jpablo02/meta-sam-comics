/**
 * Turn a pipeline run into the demo comic that ships with the app.
 *
 *   npx tsx scripts/seed-demo.ts [runDir] [id]
 *
 * Reads <runDir>/result.json (written by run-pipeline.ts) and writes demo/<id>/
 * in the store's layout, with the PNGs re-encoded as WebP so the repo stays small.
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import sharp from "sharp";
import { buildReel } from "../src/lib/buildReel";
import type { ComicResult } from "../src/lib/pipeline";
import { buildStoryReel } from "../src/lib/storyReel";
import type { StoredComic } from "../src/lib/store";

const runDir = process.argv[2] ?? join("tmp", "run");
const id = process.argv[3] ?? "tides-of-cartagena";

async function main() {
  const r = JSON.parse(await readFile(join(runDir, "result.json"), "utf8")) as ComicResult;
  const out = join("demo", id);
  await mkdir(out, { recursive: true });

  const webp = async (src: string) => {
    const name = basename(src).replace(/\.png$/, ".webp");
    await sharp(join(runDir, basename(src))).webp({ quality: 86 }).toFile(join(out, name));
    return name;
  };

  const panels = [];
  for (const p of r.lettered) panels.push(await webp(p));

  // Both reels rebuilt from the lettered panels on disk, so a re-lettering
  // (scripts/reletter.ts) reaches them too. No model calls.
  const lettered = r.lettered.map((p) => join(runDir, basename(p)));
  const teaser = join(runDir, basename(r.teaserPath));
  const story = await buildStoryReel(
    {
      seriesTitle: r.script.seriesTitle,
      chapterTitle: r.script.chapterTitle,
      panels: lettered.map((path, i) => ({ path, dialogue: r.script.scenes[i]?.dialogue ?? "" })),
      teaserPath: teaser,
    },
    runDir,
  );
  const spotlight = await buildReel(
    lettered.map((path, i) => ({ path, sighting: r.sightings.find((s) => s.panelNumber === i + 1)?.appearance })),
    teaser,
    runDir,
  );
  await copyFile(story, join(out, "reel.mp4"));
  await copyFile(spotlight, join(out, "reel-spotlight.mp4"));

  const comic: StoredComic = {
    id,
    author: { id: "demo", name: "Tales", image: null },
    createdAt: "2026-10-27T12:00:00.000Z",
    idea: "",
    seriesTitle: r.script.seriesTitle,
    chapterTitle: r.script.chapterTitle,
    logline: r.script.logline,
    panels,
    reel: "reel.mp4",
    spotlightReel: "reel-spotlight.mp4",
    gem: {
      name: r.script.storyObject.name,
      teaser: await webp(r.teaserPath),
      revealed: await webp(r.revealedPath),
      teaserLines: r.contents.teaser,
      revealedLines: r.contents.revealed,
      supply: 100,
    },
  };
  await writeFile(join(out, "comic.json"), JSON.stringify(comic, null, 2));
  console.log(`demo/${id}: ${panels.length} panels, gem "${comic.gem.name}"`);
}
main().catch((e) => { console.error(e); process.exit(1); });
