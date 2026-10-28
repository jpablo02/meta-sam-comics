/**
 * Where comics and collections live.
 *
 * A folder per comic and one JSON file of collections, on local disk. This is
 * the demo's store, not the production one (that decision is still open): every
 * read and write goes through the functions below, so swapping it for a
 * database touches this file only.
 *
 *   data/comics/<id>/comic.json     the finished comic
 *   data/comics/<id>/status.json    progress while it is being made
 *   data/comics/<id>/*.png|mp4      its files
 *   data/collections.json           who collected which gem, and its number
 *
 * The demo comic ships in demo/<id>/ with the same layout, read-only.
 */
import { mkdir, readFile, readdir, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Step } from "./pipeline";

export const DATA_DIR = process.env.TALES_DATA_DIR ?? join(process.cwd(), "data");
const DEMO_DIR = join(process.cwd(), "demo");
const COLLECTIONS = join(DATA_DIR, "collections.json");

/** How many copies of each gem exist. */
export const GEM_SUPPLY = 100;

export interface Author {
  id: string;
  name: string;
  image?: string | null;
}

export interface StoredComic {
  id: string;
  author: Author;
  createdAt: string;
  idea: string;
  seriesTitle: string;
  chapterTitle: string;
  logline: string;
  /** File names inside the comic's folder, in reading order. */
  panels: string[];
  reel: string;
  gem: {
    name: string;
    /** Public card: the object, its contents unreadable. */
    teaser: string;
    /** Collector's card. Never served to anyone else. */
    revealed: string;
    teaserLines: string[];
    revealedLines: string[];
    supply: number;
  };
}

export interface ComicStatus {
  id: string;
  author: Author;
  createdAt: string;
  state: "running" | "done" | "failed";
  step: Step;
  detail?: string;
  error?: string;
}

export interface Collection {
  comicId: string;
  userId: string;
  /** 1-based: "#37 of 100". */
  number: number;
  at: string;
}

export function comicDir(id: string): string {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`bad comic id: ${id}`);
  const demo = join(DEMO_DIR, id);
  return existsSync(demo) ? demo : join(DATA_DIR, "comics", id);
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Write-then-rename, so a reader never sees half a file. */
async function writeJson(path: string, value: unknown): Promise<void> {
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2));
  await rename(tmp, path);
}

export async function getComic(id: string): Promise<StoredComic | null> {
  return readJson<StoredComic>(join(comicDir(id), "comic.json"));
}

export async function getStatus(id: string): Promise<ComicStatus | null> {
  return readJson<ComicStatus>(join(comicDir(id), "status.json"));
}

export async function saveStatus(status: ComicStatus): Promise<void> {
  const dir = comicDir(status.id);
  await mkdir(dir, { recursive: true });
  await writeJson(join(dir, "status.json"), status);
}

export async function saveComic(comic: StoredComic): Promise<void> {
  await writeJson(join(comicDir(comic.id), "comic.json"), comic);
}

/** Every finished comic, newest first. */
export async function listComics(): Promise<StoredComic[]> {
  const ids = new Set<string>();
  for (const root of [join(DATA_DIR, "comics"), DEMO_DIR]) {
    if (!existsSync(root)) continue;
    for (const id of await readdir(root)) ids.add(id);
  }
  const comics = await Promise.all([...ids].map((id) => getComic(id).catch(() => null)));
  return comics
    .filter((c): c is StoredComic => c !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Collections ─────────────────────────────────────────────────────────────

async function readCollections(): Promise<Collection[]> {
  return (await readJson<Collection[]>(COLLECTIONS)) ?? [];
}

/**
 * One writer at a time. Collecting is a read-check-write; two of them
 * interleaved could hand out the same number, or a 101st copy. In a database
 * this is a single conditional UPDATE … RETURNING; here a queue does the job.
 */
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

export type CollectResult =
  | { ok: true; collection: Collection; alreadyHad: boolean }
  | { ok: false; reason: "sold-out" | "not-found" };

export function collectGem(comicId: string, userId: string): Promise<CollectResult> {
  return exclusive(async () => {
    const comic = await getComic(comicId);
    if (!comic) return { ok: false, reason: "not-found" } as const;

    const all = await readCollections();
    const mine = all.find((c) => c.comicId === comicId && c.userId === userId);
    if (mine) return { ok: true, collection: mine, alreadyHad: true } as const;

    const taken = all.filter((c) => c.comicId === comicId).length;
    if (taken >= comic.gem.supply) return { ok: false, reason: "sold-out" } as const;

    const collection: Collection = { comicId, userId, number: taken + 1, at: new Date().toISOString() };
    await mkdir(DATA_DIR, { recursive: true });
    await writeJson(COLLECTIONS, [...all, collection]);
    return { ok: true, collection, alreadyHad: false } as const;
  });
}

export async function collectedCount(comicId: string): Promise<number> {
  return (await readCollections()).filter((c) => c.comicId === comicId).length;
}

export async function findCollection(comicId: string, userId: string): Promise<Collection | null> {
  return (await readCollections()).find((c) => c.comicId === comicId && c.userId === userId) ?? null;
}

export async function collectionsOf(userId: string): Promise<Collection[]> {
  return (await readCollections()).filter((c) => c.userId === userId);
}
