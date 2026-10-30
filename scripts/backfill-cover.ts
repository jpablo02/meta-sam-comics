/**
 * Give a comic made before covers existed its cover, and rebuild its story
 * reel to open on it. One Muse Image call.
 *
 *   npx tsx scripts/backfill-cover.ts <comicId> [runDir]
 *
 * Portraits are read from the comic's folder, or from runDir when the comic is
 * the shipped demo (whose folder keeps only what readers see). The gem's
 * teaser card stands in for the object sheet those comics never had.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { drawCover } from "../src/lib/drawPanels";
import { DEFAULT_ART_STYLE, type ComicScript } from "../src/lib/writeScript";
import type { Character } from "../src/lib/comicPrompts";
import { comicDir, type StoredComic } from "../src/lib/store";
import { buildStoryReel } from "../src/lib/storyReel";

async function main() {
  const [id, runDir] = process.argv.slice(2);
  if (!id) throw new Error("usage: backfill-cover.ts <comicId> [runDir]");
  const dir = comicDir(id);
  const comic = JSON.parse(await readFile(join(dir, "comic.json"), "utf8")) as StoredComic;

  const portraitDir = runDir ?? dir;
  const portraits = (await readdir(portraitDir)).filter((f) => /^portrait-.+\.webp$/.test(f));
  const script = runDir
    ? (JSON.parse(await readFile(join(runDir, "result.json"), "utf8")) as { script: ComicScript }).script
    : null;
  // Only the cast that is in this story (a run folder can hold older portraits).
  // Comics in the store kept no script: their cast is known by name only.
  const cast: Character[] = script
    ? script.characters.filter((c) => portraits.includes(`portrait-${c.name.toLowerCase()}.webp`))
    : portraits.map((f) => ({ name: f.replace(/^portrait-|\.webp$/g, ""), appearance: "", traits: {} as Character["traits"] }));

  const webp = await drawCover(
    {
      artStyle: script?.artStyle ?? DEFAULT_ART_STYLE,
      logline: comic.logline,
      cast,
      gemName: comic.gem.name,
      setting: script?.locations[0]?.description,
    },
    cast.map((c) => join(portraitDir, `portrait-${c.name.toLowerCase()}.webp`)),
    // The object sheet when the run kept one; the teaser card otherwise.
    runDir && existsSync(join(runDir, "object-sheet.webp")) ? join(runDir, "object-sheet.webp") : join(dir, comic.gem.teaser),
    join(dir, "cover.webp"),
  );
  comic.cover = "cover.webp";
  console.log(`${id}: cover drawn (${cast.map((c) => c.name).join(", ")})`);

  // The reel reads PNG-or-WebP alike through sharp; it just needs the paths.
  await buildStoryReel(
    {
      seriesTitle: comic.seriesTitle,
      chapterTitle: comic.chapterTitle,
      coverPath: webp,
      panels: comic.panels.map((p, i) => ({ path: join(dir, p), dialogue: script?.scenes[i]?.dialogue ?? "" })),
      teaserPath: join(dir, comic.gem.teaser),
    },
    dir,
  );
  // The demo ships its story reel as reel.mp4.
  if (comic.reel !== "reel-story.mp4") await rename(join(dir, "reel-story.mp4"), join(dir, comic.reel));
  await writeFile(join(dir, "comic.json"), JSON.stringify(comic, null, 2));
  console.log(`${id}: story reel rebuilt with the cover`);
}
main().catch((e) => { console.error(e); process.exit(1); });
