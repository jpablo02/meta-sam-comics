/**
 * Make a batch of test comics on this machine, all at once: varied ideas chosen
 * to fail if anything is going to. They land in the local feed as "Tales test".
 *
 *   npx tsx --env-file=.env.local scripts/local-test-batch.ts
 */
import { makeComic } from "../src/lib/jobs";
import { comicDir } from "../src/lib/store";

const IDEAS = [
  "An astronaut alone on Mars finds a black box from a mission that was never launched. The gem: the black box.",
  "A mischievous dog steals grandpa's old brass key and runs through the whole village with it.",
  "Dos hermanas pelean por la herencia de su madre.",
  "Three friends chase a motorcycle thief through the night market of Bogota.",
  "A tired detective receives a blackmail letter that names the mayor.",
];

(async () => {
  const stamp = Date.now().toString(36).slice(-5);
  const results = await Promise.allSettled(
    IDEAS.map((idea, i) => {
      const id = `batch-${stamp}-${i + 1}`;
      const job = { id, author: { id: "tales-test", name: "Tales test" }, createdAt: new Date().toISOString(), idea };
      console.log(`start ${id}: ${idea}`);
      return makeComic(job, comicDir(id)).then(() => id);
    }),
  );
  for (const [i, r] of results.entries()) {
    console.log(`${i + 1}. ${r.status === "fulfilled" ? `done ${r.value}` : `FAILED ${String(r.reason).slice(0, 300)}`}`);
  }
})();
