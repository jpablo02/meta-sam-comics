/**
 * The Cloud Run Job: make one comic and exit.
 *
 * Each execution gets its comic in TALES_JOB (base64 JSON, set by startComic)
 * and works on the container's own disk; makeComic uploads the files and writes
 * the comic to the database. A failed comic is recorded as failed and the
 * execution ends with an error, so it shows red in the console too.
 */
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeComic, type ComicJob } from "../src/lib/jobs";

async function main() {
  const raw = process.env.TALES_JOB;
  if (!raw) throw new Error("TALES_JOB is not set");
  const job = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as ComicJob;
  console.log(`[comic ${job.id}] start`);
  await makeComic(job, join(tmpdir(), "tales", job.id));
  console.log(`[comic ${job.id}] done`);
}
main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
