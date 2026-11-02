/**
 * Put comics made on this machine into the production store: their files into
 * the bucket, their records into the database. Same credentials as seed-cloud.
 *
 *   TALES_BUCKET=… TALES_DB_INSTANCE=… TALES_DB_USER=… TALES_DB_PASSWORD=… \
 *     npx tsx scripts/publish-comics.ts <id> [id …]
 *
 * Only finished comics are sent, and only the files a reader can open: the
 * lettered panels, the cover, the two reels and the gem's two cards. Run it
 * again with the same id to replace a comic.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeBlob } from "../src/lib/blobs";
import { saveComic, type StoredComic } from "../src/lib/store";

const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", mp4: "video/mp4" };

async function publish(id: string): Promise<void> {
  const dir = join("data", "comics", id);
  const path = join(dir, "comic.json");
  if (!existsSync(path)) throw new Error(`${id}: not a finished comic (no comic.json)`);
  const comic = JSON.parse(await readFile(path, "utf8")) as StoredComic;
  const files = [...comic.panels, comic.cover, comic.reel, comic.spotlightReel, comic.gem.teaser, comic.gem.revealed].filter(
    (f): f is string => Boolean(f),
  );
  for (const name of files) {
    if (!existsSync(join(dir, name))) throw new Error(`${id}: ${name} is missing`);
  }
  for (const name of files) {
    await writeBlob(id, name, await readFile(join(dir, name)), TYPES[name.split(".").pop() ?? ""]);
  }
  await saveComic(comic);
  console.log(`${id}: ${files.length} files and the record — "${comic.chapterTitle}"`);
}

async function main() {
  if (!process.env.TALES_BUCKET || !process.env.TALES_DB_INSTANCE) throw new Error("set TALES_BUCKET and TALES_DB_INSTANCE");
  const ids = process.argv.slice(2);
  if (ids.length === 0) throw new Error("name at least one comic id");
  for (const id of ids) await publish(id);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
