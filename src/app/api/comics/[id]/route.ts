import { NextResponse } from "next/server";
import { deleteBlobs } from "@/lib/blobs";
import { currentUser } from "@/lib/session";
import { deleteComic, getComic } from "@/lib/store";

/**
 * Delete a comic. Only its author can, and only a finished one — a comic still
 * being made has nothing to delete yet, and its run would save it again.
 *
 * The records go first, in one transaction: from that moment the comic is gone
 * everywhere and its files can no longer be served. The files go after; if that
 * fails, nothing can reach them anyway, and the error is logged.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { id } = await params;
  if (!/^[a-z0-9-]+$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const comic = await getComic(id).catch(() => null);
  if (!comic || comic.author.id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteComic(comic);
  await deleteBlobs(id).catch((e) => console.error(`[delete ${id}] files left in the bucket:`, e));
  return NextResponse.json({ ok: true });
}
