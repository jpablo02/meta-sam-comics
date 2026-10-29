/**
 * Give a comic made before the story reel existed its shareable reel. The old
 * reel becomes its spotlight reel. No model calls.
 *
 *   npx tsx scripts/backfill-story-reel.ts <comicId>
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { comicDir, type StoredComic } from "../src/lib/store";
import { buildStoryReel } from "../src/lib/storyReel";

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error("usage: backfill-story-reel.ts <comicId>");
  const dir = comicDir(id);
  const comic = JSON.parse(await readFile(join(dir, "comic.json"), "utf8")) as StoredComic;
  if (comic.spotlightReel) return console.log(`${id}: already has both reels`);

  // The dialogue was not stored with older comics: panels get the default hold.
  await buildStoryReel(
    {
      seriesTitle: comic.seriesTitle,
      chapterTitle: comic.chapterTitle,
      panels: comic.panels.map((p) => ({ path: join(dir, p), dialogue: "" })),
      teaserPath: join(dir, comic.gem.teaser),
    },
    dir,
  );
  comic.spotlightReel = comic.reel;
  comic.reel = "reel-story.mp4";
  await writeFile(join(dir, "comic.json"), JSON.stringify(comic, null, 2));
  console.log(`${id}: story reel built`);
}
main().catch((e) => { console.error(e); process.exit(1); });
