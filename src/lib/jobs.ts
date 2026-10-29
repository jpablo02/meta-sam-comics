/**
 * Run the pipeline for a reader and record its progress.
 *
 * The comic takes about seven minutes, so the request that starts it returns at
 * once with an id; the run carries on in this process and writes status.json at
 * every step. The UI polls that file — progress is what has really finished.
 *
 * In-process is right for the demo and for local runs. In production this
 * becomes a job on a worker with no request time limit (the architecture
 * decision that is still open); the status file becomes a row.
 */
import { randomBytes } from "node:crypto";
import { runComic } from "./pipeline";
import { comicDir, saveComic, saveStatus, GEM_SUPPLY, type Author, type ComicStatus } from "./store";

function newId(): string {
  return `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

/** The idea as the script writer receives it: the gem hint, if any, is part of it. */
function fullIdea(idea: string, gemHint?: string): string {
  const hint = gemHint?.trim();
  return hint ? `${idea.trim()}\n\nThe gem — the object hidden in this story that readers will collect: ${hint}` : idea.trim();
}

export async function startComic(author: Author, idea: string, gemHint?: string): Promise<string> {
  const id = newId();
  const dir = comicDir(id);
  const base = { id, author, createdAt: new Date().toISOString() };
  let status: ComicStatus = { ...base, state: "running", step: "script" };
  await saveStatus(status);

  const text = fullIdea(idea, gemHint);
  void runComic(text, dir, {
    onStep: (step, detail) => {
      status = { ...status, step, detail };
      void saveStatus(status);
    },
  })
    .then(async (r) => {
      const name = (p: string) => p.slice(dir.length + 1).replace(/\\/g, "/");
      await saveComic({
        ...base,
        idea: text,
        seriesTitle: r.script.seriesTitle,
        chapterTitle: r.script.chapterTitle,
        logline: r.script.logline,
        panels: r.lettered.map(name),
        reel: name(r.storyReelPath),
        spotlightReel: name(r.reelPath),
        gem: {
          name: r.script.storyObject.name,
          teaser: name(r.teaserPath),
          revealed: name(r.revealedPath),
          teaserLines: r.contents.teaser,
          revealedLines: r.contents.revealed,
          supply: GEM_SUPPLY,
        },
      });
      await saveStatus({ ...status, state: "done", step: "done", detail: undefined });
    })
    .catch(async (e: unknown) => {
      console.error(`[comic ${id}]`, e);
      await saveStatus({ ...status, state: "failed", error: e instanceof Error ? e.message : String(e) });
    });

  return id;
}
