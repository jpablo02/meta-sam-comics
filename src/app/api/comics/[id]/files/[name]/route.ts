import { readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { comicDir, findCollection, getComic, getStatus } from "@/lib/store";
import { currentUser } from "@/lib/session";

const TYPES: Record<string, string> = { png: "image/png", webp: "image/webp", mp4: "video/mp4" };
const WIDTHS = new Set([360, 720, 1080]);

/**
 * Serve one of a comic's files.
 *
 * The collector's card is the only guarded file: it is served to people who
 * collected the gem, the author included, nobody else — that is the whole product.
 * Everything else is public, as the comic is. `?w=` returns a resized WebP
 * (cached next to the original) so the feed does not download 5 MB PNGs.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await params;
  if (!/^[\w.-]+$/.test(name)) return new Response("Bad name", { status: 400 });

  const comic = await getComic(id).catch(() => null);
  if (comic) {
    const allowed = [...comic.panels, comic.cover, comic.reel, comic.spotlightReel, comic.gem.teaser, comic.gem.revealed].filter(Boolean);
    if (!allowed.includes(name)) return new Response("Not found", { status: 404 });
    if (name === comic.gem.revealed) {
      const user = await currentUser();
      const mayRead = user && (await findCollection(id, user.id));
      if (!mayRead) return new Response("Collect the gem to read it", { status: 403 });
    }
  } else {
    // Still being made: only the panels drawn so far, for the progress view.
    const status = await getStatus(id).catch(() => null);
    if (!status || !/^panel-\d\.png$/.test(name)) return new Response("Not found", { status: 404 });
  }

  const path = join(comicDir(id), name);
  if (!existsSync(path)) return new Response("Not found", { status: 404 });

  const ext = name.split(".").pop() ?? "";
  const search = new URL(req.url).searchParams;
  const w = Number(search.get("w"));
  // JPEG for link previews: not every crawler reads WebP.
  const jpg = search.get("f") === "jpg";
  const privateFile = comic && name === comic.gem.revealed;
  const cache = privateFile ? "private, no-store" : "public, max-age=3600";

  if (WIDTHS.has(w) && ext !== "mp4") {
    const resized = `${path}.w${w}.${jpg ? "jpg" : "webp"}`;
    let body: Buffer;
    if (existsSync(resized)) {
      body = await readFile(resized);
    } else {
      const img = sharp(path).resize({ width: w });
      body = await (jpg ? img.jpeg({ quality: 85 }) : img.webp({ quality: 82 })).toBuffer();
      // Read-only disks (the shipped demo on a host) just skip the cache.
      await writeFile(resized, body).catch(() => {});
    }
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": jpg ? "image/jpeg" : "image/webp", "Cache-Control": cache },
    });
  }

  const { size } = await stat(path);
  return new Response(new Uint8Array(await readFile(path)), {
    headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Content-Length": String(size), "Cache-Control": cache },
  });
}
