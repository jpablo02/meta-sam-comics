/**
 * Where comics and collections live.
 *
 * Postgres when DATABASE_URL is set (production: the comics, their progress and
 * who collected what). Without it, a folder per comic and one JSON file of
 * collections on local disk — the same functions either way, so nothing else
 * knows which one is running. Files live in ./blobs.ts.
 *
 * Local layout:
 *   data/comics/<id>/comic.json     the finished comic
 *   data/comics/<id>/status.json    progress while it is being made
 *   data/comics/<id>/*.png|mp4      its files
 *   data/collections.json           who collected which gem, and its number
 *
 * The demo comic ships in demo/<id>/ with the same layout, read-only.
 */
import { mkdir, readFile, readdir, writeFile, rename, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Step } from "./pipeline";
import { db } from "./db";

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
  /** The comic's own cover art; older comics use their first panel. */
  cover?: string;
  /** Story reel: the one readers share. */
  reel: string;
  /** Spotlight reel: how SAM found the gem. Older comics have none. */
  spotlightReel?: string;
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
  /** "deleted": its author removed it — only this tombstone is left, so it still counts against a guest's limit. */
  state: "running" | "done" | "failed" | "deleted";
  step: Step;
  detail?: string;
  error?: string;
  /** Panels already drawn, for the progress view. */
  drawn?: number[];
  /** The idea as the script writer received it, so a failed comic can be tried again. Never sent to the browser. */
  idea?: string;
  /** Set on every save: how long the comic has gone without a step. */
  updatedAt?: string;
  /** A failed comic tried again: the id of the new one, so the old one stops asking for attention. */
  retriedAs?: string;
}

/**
 * No step for this long means the run died — the server restarted, the job was
 * killed — and nothing will ever mark it failed. The slowest step, a panel
 * falling down every rung of the filter ladder, takes a few minutes.
 */
const STALLED_MS = 20 * 60 * 1000;

export function isStalled(status: ComicStatus): boolean {
  if (status.state !== "running") return false;
  const last = Date.parse(status.updatedAt ?? status.createdAt);
  return Number.isFinite(last) && Date.now() - last > STALLED_MS;
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

/**
 * Write-then-rename, so a reader never sees half a file. On Windows the rename
 * is refused while the progress view happens to be reading the file — a finished
 * comic showed "EPERM … status.json" — so a busy target is tried again.
 */
async function writeJson(path: string, value: unknown): Promise<void> {
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2));
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(tmp, path);
      return;
    } catch (e) {
      const busy = ["EPERM", "EBUSY", "EACCES"].includes((e as NodeJS.ErrnoException).code ?? "");
      if (!busy || attempt === 9) throw e;
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

export async function getComic(id: string): Promise<StoredComic | null> {
  const sql = await db();
  if (sql) {
    const { rows } = await sql.query("SELECT data FROM comics WHERE id = $1", [id]);
    return (rows[0]?.data as StoredComic) ?? null;
  }
  return readJson<StoredComic>(join(comicDir(id), "comic.json"));
}

export async function getStatus(id: string): Promise<ComicStatus | null> {
  const sql = await db();
  if (sql) {
    const { rows } = await sql.query("SELECT data FROM statuses WHERE id = $1", [id]);
    return (rows[0]?.data as ComicStatus) ?? null;
  }
  return readJson<ComicStatus>(join(comicDir(id), "status.json"));
}

export async function saveStatus(status: ComicStatus): Promise<void> {
  status = { ...status, updatedAt: new Date().toISOString() };
  const sql = await db();
  if (sql) {
    await sql.query(
      "INSERT INTO statuses (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = now()",
      [status.id, status],
    );
    return;
  }
  const dir = comicDir(status.id);
  await mkdir(dir, { recursive: true });
  await writeJson(join(dir, "status.json"), status);
}

export async function saveComic(comic: StoredComic): Promise<void> {
  const sql = await db();
  if (sql) {
    await sql.query(
      "INSERT INTO comics (id, created_at, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $3",
      [comic.id, comic.createdAt, comic],
    );
    return;
  }
  await writeJson(join(comicDir(comic.id), "comic.json"), comic);
}

/** Comics this author has made or is making. Failed ones don't count. */
/** How long a failed comic keeps showing on its author's home page. */
const UNFINISHED_MS = 6 * 3600 * 1000;

/**
 * The author's comics still being made, and the ones that failed recently and
 * were not tried again — newest first. The progress page says "you can leave";
 * this is how the reader finds their way back.
 */
export async function unfinishedBy(authorId: string): Promise<ComicStatus[]> {
  const sql = await db();
  let statuses: ComicStatus[];
  if (sql) {
    const { rows } = await sql.query(
      "SELECT data FROM statuses WHERE data->'author'->>'id' = $1 AND data->>'state' IN ('running', 'failed') " +
        "ORDER BY data->>'createdAt' DESC LIMIT 10",
      [authorId],
    );
    statuses = rows.map((r) => r.data as ComicStatus);
  } else {
    const root = join(DATA_DIR, "comics");
    if (!existsSync(root)) return [];
    const all = await Promise.all((await readdir(root)).map((id) => readJson<ComicStatus>(join(root, id, "status.json"))));
    statuses = all.filter((s): s is ComicStatus => s?.author.id === authorId && (s.state === "running" || s.state === "failed"));
  }
  return statuses
    .filter((s) =>
      s.state === "running" && !isStalled(s)
        ? true
        : !s.retriedAs && Date.now() - Date.parse(s.updatedAt ?? s.createdAt) < UNFINISHED_MS,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
}

export async function comicsStartedBy(authorId: string): Promise<number> {
  const sql = await db();
  if (sql) {
    const { rows } = await sql.query(
      "SELECT count(*)::int AS n FROM statuses WHERE data->'author'->>'id' = $1 AND data->>'state' <> 'failed'",
      [authorId],
    );
    return rows[0].n as number;
  }
  const root = join(DATA_DIR, "comics");
  if (!existsSync(root)) return 0;
  const statuses = await Promise.all((await readdir(root)).map((id) => readJson<ComicStatus>(join(root, id, "status.json"))));
  return statuses.filter((s) => s?.author.id === authorId && s.state !== "failed").length;
}

/** Every finished comic, newest first. */
export async function listComics(): Promise<StoredComic[]> {
  const sql = await db();
  if (sql) {
    const { rows } = await sql.query("SELECT data FROM comics ORDER BY created_at DESC LIMIT 200");
    return rows.map((r) => r.data as StoredComic);
  }
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

/** The finished comics this author made, newest first. */
export async function comicsBy(authorId: string): Promise<StoredComic[]> {
  const sql = await db();
  if (sql) {
    const { rows } = await sql.query(
      "SELECT data FROM comics WHERE data->'author'->>'id' = $1 ORDER BY created_at DESC",
      [authorId],
    );
    return rows.map((r) => r.data as StoredComic);
  }
  return (await listComics()).filter((c) => c.author.id === authorId);
}

/**
 * Delete a comic for good: the comic, every collected copy of its gem, and the
 * idea it was made from. What stays is a tombstone in its status — no idea, no
 * name — so a deleted comic still counts against a guest's limit and its page
 * says "not found" instead of showing a progress view. Its files are removed by
 * the caller (./blobs.ts).
 *
 * Today collecting is free, so deleting takes the collectors' copies with it.
 * Once a gem can be bought, a comic with buyers will be hidden from the public
 * instead, and its collectors will keep it — see docs/ROADMAP.md.
 */
export async function deleteComic(comic: StoredComic): Promise<void> {
  const tombstone: ComicStatus = {
    id: comic.id,
    author: { id: comic.author.id, name: "" },
    createdAt: comic.createdAt,
    state: "deleted",
    step: "done",
    updatedAt: new Date().toISOString(),
  };
  const sql = await db();
  if (sql) {
    const client = await sql.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM collections WHERE comic_id = $1", [comic.id]);
      await client.query("DELETE FROM comics WHERE id = $1", [comic.id]);
      await client.query(
        "INSERT INTO statuses (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = now()",
        [comic.id, tombstone],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
    return;
  }
  // The demo ships read-only in demo/; only comics made here can go.
  const dir = join(DATA_DIR, "comics", comic.id);
  if (!existsSync(join(dir, "comic.json"))) throw new Error(`not a local comic: ${comic.id}`);
  await exclusive(async () => {
    await writeJson(COLLECTIONS, (await readCollections()).filter((c) => c.comicId !== comic.id));
  });
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await writeJson(join(dir, "status.json"), tombstone);
}

// ── Collections ─────────────────────────────────────────────────────────────

async function readCollections(): Promise<Collection[]> {
  return (await readJson<Collection[]>(COLLECTIONS)) ?? [];
}

/**
 * One writer at a time. Collecting is a read-check-write; two of them
 * interleaved could hand out the same number, or a 101st copy. In Postgres the
 * comic's row is locked for the length of one INSERT (see collectInDb); on disk
 * a queue does the job.
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

export async function collectGem(comicId: string, userId: string): Promise<CollectResult> {
  const sql = await db();
  if (sql) return collectInDb(sql, comicId, userId);
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

/**
 * Atomic: the comic's row is locked (FOR UPDATE), so two collectors of the same
 * gem take turns — one gets #37, the next #38, and nobody gets #101. The
 * unique (comic_id, user_id) key makes a double tap return the copy they hold.
 */
async function collectInDb(sql: NonNullable<Awaited<ReturnType<typeof db>>>, comicId: string, userId: string): Promise<CollectResult> {
  const client = await sql.connect();
  try {
    await client.query("BEGIN");
    const comic = await client.query("SELECT (data->'gem'->>'supply')::int AS supply FROM comics WHERE id = $1 FOR UPDATE", [comicId]);
    if (comic.rowCount === 0) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "not-found" };
    }
    const had = await client.query("SELECT number, at FROM collections WHERE comic_id = $1 AND user_id = $2", [comicId, userId]);
    if (had.rowCount) {
      await client.query("COMMIT");
      const r = had.rows[0];
      return { ok: true, collection: { comicId, userId, number: r.number, at: new Date(r.at).toISOString() }, alreadyHad: true };
    }
    const { rows } = await client.query("SELECT count(*)::int AS n FROM collections WHERE comic_id = $1", [comicId]);
    if (rows[0].n >= comic.rows[0].supply) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "sold-out" };
    }
    const at = new Date().toISOString();
    await client.query("INSERT INTO collections (comic_id, user_id, number, at) VALUES ($1, $2, $3, $4)", [comicId, userId, rows[0].n + 1, at]);
    await client.query("COMMIT");
    return { ok: true, collection: { comicId, userId, number: rows[0].n + 1, at }, alreadyHad: false };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

const fromRow = (r: { comic_id: string; user_id: string; number: number; at: Date }): Collection => ({
  comicId: r.comic_id,
  userId: r.user_id,
  number: r.number,
  at: new Date(r.at).toISOString(),
});

export async function collectedCount(comicId: string): Promise<number> {
  const sql = await db();
  if (sql) {
    const { rows } = await sql.query("SELECT count(*)::int AS n FROM collections WHERE comic_id = $1", [comicId]);
    return rows[0].n;
  }
  return (await readCollections()).filter((c) => c.comicId === comicId).length;
}

/** How many copies of each gem have been collected, in one read — the home page needs them all. */
export async function collectedCounts(): Promise<Map<string, number>> {
  const sql = await db();
  if (sql) {
    const { rows } = await sql.query("SELECT comic_id, count(*)::int AS n FROM collections GROUP BY comic_id");
    return new Map(rows.map((r) => [r.comic_id as string, r.n as number]));
  }
  const counts = new Map<string, number>();
  for (const c of await readCollections()) counts.set(c.comicId, (counts.get(c.comicId) ?? 0) + 1);
  return counts;
}

export async function findCollection(comicId: string, userId: string): Promise<Collection | null> {
  const sql = await db();
  if (sql) {
    const { rows } = await sql.query("SELECT * FROM collections WHERE comic_id = $1 AND user_id = $2", [comicId, userId]);
    return rows[0] ? fromRow(rows[0]) : null;
  }
  return (await readCollections()).find((c) => c.comicId === comicId && c.userId === userId) ?? null;
}

export async function collectionsOf(userId: string): Promise<Collection[]> {
  const sql = await db();
  if (sql) {
    const { rows } = await sql.query("SELECT * FROM collections WHERE user_id = $1 ORDER BY at DESC", [userId]);
    return rows.map(fromRow);
  }
  return (await readCollections()).filter((c) => c.userId === userId);
}
