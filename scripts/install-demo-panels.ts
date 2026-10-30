/**
 * Put redrawn panels into the shipped demo, keeping its cover and gem cards,
 * and rebuild both reels around them.
 *
 *   npx tsx scripts/install-demo-panels.ts <runDir> [id]
 *
 * The companion of redraw-panel.ts: the run's result.json supplies the lettered
 * panels, the dialogue and where SAM found the gem in each one.
 */
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { buildReel } from "../src/lib/buildReel";
import type { ComicResult } from "../src/lib/pipeline";
import { buildStoryReel } from "../src/lib/storyReel";
import type { StoredComic } from "../src/lib/store";

async function main() {
  const [runDir, id = "tides-of-cartagena"] = process.argv.slice(2);
  if (!runDir) throw new Error("usage: install-demo-panels.ts <runDir> [id]");
  const out = join("demo", id);
  const r = JSON.parse(await readFile(join(runDir, "result.json"), "utf8")) as ComicResult;
  const comic = JSON.parse(await readFile(join(out, "comic.json"), "utf8")) as StoredComic;

  comic.panels = await Promise.all(
    r.lettered.map(async (src, i) => {
      const name = `panel-${i + 1}-lettered.webp`;
      await sharp(src).webp({ quality: 86 }).toFile(join(out, name));
      return name;
    }),
  );

  const teaser = join(out, comic.gem.teaser);
  const story = await buildStoryReel(
    {
      seriesTitle: comic.seriesTitle,
      chapterTitle: comic.chapterTitle,
      coverPath: comic.cover ? join(out, comic.cover) : undefined,
      panels: r.lettered.map((path, i) => ({ path, dialogue: r.script.scenes[i]?.dialogue ?? "" })),
      teaserPath: teaser,
    },
    runDir,
  );
  const spotlight = await buildReel(
    r.lettered.map((path, i) => ({ path, sighting: r.sightings.find((s) => s.panelNumber === i + 1)?.appearance })),
    teaser,
    runDir,
  );
  await copyFile(story, join(out, comic.reel));
  if (comic.spotlightReel) await copyFile(spotlight, join(out, comic.spotlightReel));
  await writeFile(join(out, "comic.json"), JSON.stringify(comic, null, 2));
  console.log(`${id}: ${comic.panels.length} panels, both reels rebuilt`);
}
main().catch((e) => { console.error(e); process.exit(1); });
