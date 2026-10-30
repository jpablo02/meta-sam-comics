/**
 * Put the shipped demo comic into the production store: its files into the
 * bucket, its record into the database. Run once per deploy that changes it.
 *
 *   TALES_BUCKET=… TALES_DB_INSTANCE=… TALES_DB_USER=… TALES_DB_PASSWORD=… \
 *     npx tsx scripts/seed-cloud.ts [id]
 *
 * Needs Google credentials on this machine (gcloud auth application-default login).
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeBlob } from "../src/lib/blobs";
import { saveComic, type StoredComic } from "../src/lib/store";

const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", mp4: "video/mp4" };

async function main() {
  if (!process.env.TALES_BUCKET || !process.env.TALES_DB_INSTANCE) throw new Error("set TALES_BUCKET and TALES_DB_INSTANCE");
  const id = process.argv[2] ?? "tides-of-cartagena";
  const dir = join("demo", id);
  const comic = JSON.parse(await readFile(join(dir, "comic.json"), "utf8")) as StoredComic;
  const wanted = new Set([...comic.panels, comic.cover, comic.reel, comic.spotlightReel, comic.gem.teaser, comic.gem.revealed].filter(Boolean));
  for (const name of await readdir(dir)) {
    if (!wanted.has(name)) continue;
    await writeBlob(id, name, await readFile(join(dir, name)), TYPES[name.split(".").pop() ?? ""]);
    console.log(`uploaded ${name}`);
  }
  await saveComic(comic);
  console.log(`${id}: in the database`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
