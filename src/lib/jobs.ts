/**
 * Run the pipeline for a reader and record its progress.
 *
 * The comic takes about seven minutes, so the request that starts it returns at
 * once with an id. Where it then runs:
 *
 *  - TALES_RUN_JOB set (production): one execution of a Cloud Run Job per comic,
 *    with no request time limit — Vercel's functions stop long before seven
 *    minutes. The job uploads every file and writes the comic when it is done.
 *  - otherwise (local): in this process, straight into the comic's folder.
 *
 * Either way, makeComic records the status at every step; the UI polls it, so
 * progress is what has really finished.
 */
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { runComic, type Step } from "./pipeline";
import { comicDir, saveComic, saveStatus, GEM_SUPPLY, type Author, type ComicStatus } from "./store";
import { putFile } from "./blobs";
import { googleAuth } from "./gcp";
import { PANEL_COUNT } from "./writeScript";

export interface ComicJob {
  id: string;
  author: Author;
  createdAt: string;
  /** The idea as the script writer receives it, gem hint included. */
  idea: string;
}

function newId(): string {
  return `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

/** The idea as the script writer receives it: the gem hint, if any, is part of it. */
function fullIdea(idea: string, gemHint?: string): string {
  const hint = gemHint?.trim();
  return hint ? `${idea.trim()}\n\nThe gem — the object hidden in this story that readers will collect: ${hint}` : idea.trim();
}

export async function startComic(author: Author, idea: string, gemHint?: string): Promise<string> {
  const job: ComicJob = { id: newId(), author, createdAt: new Date().toISOString(), idea: fullIdea(idea, gemHint) };
  const status: ComicStatus = { id: job.id, author, createdAt: job.createdAt, state: "running", step: "script" };
  await saveStatus(status);

  if (process.env.TALES_RUN_JOB) {
    try {
      await launchJob(process.env.TALES_RUN_JOB, job);
    } catch (e) {
      console.error(`[comic ${job.id}] could not start the job`, e);
      await saveStatus({ ...status, state: "failed", error: "Could not start making the comic. Try again." });
    }
  } else {
    void makeComic(job, comicDir(job.id)).catch(() => {});
  }
  return job.id;
}

/** One execution of the worker job, carrying this comic as its only input. */
async function launchJob(jobName: string, job: ComicJob): Promise<void> {
  const client = await googleAuth().getClient();
  await client.request({
    url: `https://run.googleapis.com/v2/${jobName}:run`,
    method: "POST",
    data: {
      overrides: {
        containerOverrides: [{ env: [{ name: "TALES_JOB", value: Buffer.from(JSON.stringify(job)).toString("base64") }] }],
      },
    },
  });
}

/**
 * Make the comic in workDir and publish it. When workDir is not the comic's own
 * folder (the worker's scratch disk), every file is uploaded to the store as it
 * becomes final: each panel as soon as it is drawn, for the progress view, and
 * the rest at the end.
 */
export async function makeComic(job: ComicJob, workDir: string): Promise<void> {
  const remote = workDir !== comicDir(job.id);
  let status: ComicStatus = { id: job.id, author: job.author, createdAt: job.createdAt, state: "running", step: "script", drawn: [] };
  const drawn: number[] = [];

  // Steps arrive faster than uploads finish: one write at a time, in order.
  let chain: Promise<void> = Promise.resolve();
  const onStep = (step: Step, detail?: string) => {
    chain = chain
      .then(async () => {
        for (let n = 1; n <= PANEL_COUNT; n++) {
          const png = join(workDir, `panel-${n}.png`);
          if (drawn.includes(n) || !existsSync(png)) continue;
          if (remote) await putFile(job.id, `panel-${n}.png`, png);
          drawn.push(n);
        }
        status = { ...status, step, detail, drawn: [...drawn] };
        await saveStatus(status);
      })
      .catch((e) => console.error(`[comic ${job.id}] progress`, e));
  };

  try {
    const r = await runComic(job.idea, workDir, { onStep });
    await chain;
    const finals = [r.coverPath, ...r.lettered, r.storyReelPath, r.reelPath, r.teaserPath, r.revealedPath];
    if (remote) for (const f of finals) await putFile(job.id, basename(f), f);
    await saveComic({
      id: job.id,
      author: job.author,
      createdAt: job.createdAt,
      idea: job.idea,
      seriesTitle: r.script.seriesTitle,
      chapterTitle: r.script.chapterTitle,
      logline: r.script.logline,
      cover: basename(r.coverPath),
      panels: r.lettered.map((p) => basename(p)),
      reel: basename(r.storyReelPath),
      spotlightReel: basename(r.reelPath),
      gem: {
        name: r.script.storyObject.name,
        teaser: basename(r.teaserPath),
        revealed: basename(r.revealedPath),
        teaserLines: r.contents.teaser,
        revealedLines: r.contents.revealed,
        supply: GEM_SUPPLY,
      },
    });
    await saveStatus({ ...status, state: "done", step: "done", detail: undefined });
  } catch (e) {
    await chain;
    console.error(`[comic ${job.id}]`, e);
    await saveStatus({ ...status, state: "failed", error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}
