/**
 * A comic's files: panels, cover, gem cards, reels.
 *
 * Local disk while developing (the comic's folder), Cloud Storage when
 * TALES_BUCKET is set — at comics/<id>/<name>. The bucket is private: every
 * file goes out through the files route, which is what keeps the collector's
 * card for collectors.
 */
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { gcs } from "./gcp";
import { comicDir } from "./store";

const BUCKET = process.env.TALES_BUCKET;

export interface BlobInfo {
  size: number;
  /** When it was last written — what tells a redrawn file from the old one. */
  mtimeMs: number;
}

function object(id: string, name: string) {
  return gcs().bucket(BUCKET!).file(`comics/${id}/${name}`);
}

export async function blobInfo(id: string, name: string): Promise<BlobInfo | null> {
  if (BUCKET) {
    try {
      const [meta] = await object(id, name).getMetadata();
      return { size: Number(meta.size), mtimeMs: new Date(meta.updated ?? 0).getTime() };
    } catch {
      return null;
    }
  }
  const path = join(comicDir(id), name);
  if (!existsSync(path)) return null;
  const s = await stat(path);
  return { size: s.size, mtimeMs: s.mtimeMs };
}

export async function readBlob(id: string, name: string): Promise<Buffer> {
  if (BUCKET) {
    const [body] = await object(id, name).download();
    return body;
  }
  return readFile(join(comicDir(id), name));
}

export async function writeBlob(id: string, name: string, body: Buffer, contentType?: string): Promise<void> {
  if (BUCKET) {
    await object(id, name).save(body, { contentType, resumable: false });
    return;
  }
  const dir = comicDir(id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), body);
}

/** A ten-minute link straight to a file in the bucket; null on local disk. */
export async function signedUrl(id: string, name: string): Promise<string | null> {
  if (!BUCKET) return null;
  const [url] = await object(id, name).getSignedUrl({ version: "v4", action: "read", expires: Date.now() + 10 * 60_000 });
  return url;
}

/** Copy a file the pipeline wrote on local disk into the comic's store. */
export async function putFile(id: string, name: string, path: string): Promise<void> {
  const type = name.endsWith(".mp4") ? "video/mp4" : name.endsWith(".webp") ? "image/webp" : "image/png";
  await writeBlob(id, name, await readFile(path), type);
}
