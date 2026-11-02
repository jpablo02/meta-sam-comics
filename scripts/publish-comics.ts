/**
 * Put comics made on this machine into the production store: their files into
 * the bucket, their records into the database.
 *
 *   npx tsx scripts/publish-comics.ts <id> [id …]
 *
 * The bucket and database are read from the deployed worker's own settings,
 * and the password from Secret Manager, with this machine's gcloud login — so
 * it writes exactly where production reads, and no secret is typed or shown.
 *
 * Only finished comics are sent, and only the files a reader can open: the
 * lettered panels, the cover, the two reels and the gem's two cards. Run it
 * again with the same id to replace a comic.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROJECT = "token-comic-498321";
const JOB = "tales-worker --region us-east4";

/** Load the worker's TALES_* settings and the database password into this process. */
function loadProductionSettings(): void {
  const job = JSON.parse(execSync(`gcloud run jobs describe ${JOB} --project ${PROJECT} --format=json`, { encoding: "utf8" }));
  const env: Array<{ name: string; value?: string }> = job.spec.template.spec.template.spec.containers[0].env;
  for (const e of env) if (e.value && e.name.startsWith("TALES_")) process.env[e.name] = e.value;
  process.env.TALES_DB_PASSWORD = execSync(
    `gcloud secrets versions access latest --secret tales-db-password --project ${PROJECT}`,
    { encoding: "utf8" },
  ).trim();
}

const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", mp4: "video/mp4" };

type WriteBlob = typeof import("../src/lib/blobs").writeBlob;
type SaveComic = typeof import("../src/lib/store").saveComic;
type StoredComic = import("../src/lib/store").StoredComic;

const makePublisher = (writeBlob: WriteBlob, saveComic: SaveComic) => async (id: string): Promise<void> => {
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
};

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) throw new Error("name at least one comic id");
  loadProductionSettings();
  if (!process.env.TALES_BUCKET || !process.env.TALES_DB_INSTANCE) throw new Error("the worker has no TALES_BUCKET or TALES_DB_INSTANCE");
  console.log(`bucket ${process.env.TALES_BUCKET} · database ${process.env.TALES_DB_NAME ?? "tales"} on ${process.env.TALES_DB_INSTANCE}`);
  // Imported only now: the store reads its settings when it loads.
  const { writeBlob } = await import("../src/lib/blobs");
  const { saveComic } = await import("../src/lib/store");
  const publish = makePublisher(writeBlob, saveComic);
  for (const id of ids) await publish(id);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
