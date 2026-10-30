import sharp from "sharp";
import { findCollection, getComic, getStatus } from "@/lib/store";
import { blobInfo, readBlob, signedUrl, writeBlob } from "@/lib/blobs";
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

  const info = await blobInfo(id, name);
  if (!info) return new Response("Not found", { status: 404 });

  const ext = name.split(".").pop() ?? "";
  const search = new URL(req.url).searchParams;
  const w = Number(search.get("w"));
  // JPEG for link previews: not every crawler reads WebP.
  const jpg = search.get("f") === "jpg";
  const privateFile = comic && name === comic.gem.revealed;
  const resize = WIDTHS.has(w) && ext !== "mp4";

  // A function's response tops out at 4.5 MB on Vercel and a reel is ~6 MB: a
  // public file at full size goes straight from storage, through a short-lived
  // link (which also lets the video seek). The collector's card never does.
  if (!resize && !privateFile) {
    const url = await signedUrl(id, name);
    if (url) return Response.redirect(url, 302);
  }

  // Revalidate every time: a file can be redrawn under the same name (a remade
  // demo, a repaired panel), and a max-age kept showing the old art for an hour.
  // The ETag makes the check a cheap 304 when nothing changed.
  const cache = privateFile ? "private, no-store" : "public, no-cache";
  const etag = `"${Math.round(info.mtimeMs).toString(36)}-${info.size.toString(36)}-${w || 0}${jpg ? "j" : ""}"`;
  if (!privateFile && req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": cache } });
  }

  if (resize) {
    const resized = `${name}.w${w}.${jpg ? "jpg" : "webp"}`;
    const cached = await blobInfo(id, resized);
    let body: Buffer;
    // A resized copy older than its original is a copy of the old art.
    if (cached && cached.mtimeMs >= info.mtimeMs) {
      body = await readBlob(id, resized);
    } else {
      const img = sharp(await readBlob(id, name)).resize({ width: w });
      body = await (jpg ? img.jpeg({ quality: 85 }) : img.webp({ quality: 82 })).toBuffer();
      // Read-only disks (the shipped demo on a host) just skip the cache.
      await writeBlob(id, resized, body, jpg ? "image/jpeg" : "image/webp").catch(() => {});
    }
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": jpg ? "image/jpeg" : "image/webp", "Cache-Control": cache, ETag: etag },
    });
  }

  return new Response(new Uint8Array(await readBlob(id, name)), {
    headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Content-Length": String(info.size), "Cache-Control": cache, ETag: etag },
  });
}
