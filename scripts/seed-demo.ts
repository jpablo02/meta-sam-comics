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
import type { ComicResult } from "../src/lib/pipeline";
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
  await copyFile(join(runDir, basename(r.reelPath)), join(out, "reel.mp4"));

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
