import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { collectGem, collectedCount, getComic } from "@/lib/store";

/** Collect a comic's gem: one copy per person, numbered, while copies last. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to collect" }, { status: 401 });

  const result = await collectGem(id, user.id);
  if (!result.ok) {
    const status = result.reason === "sold-out" ? 409 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  }
  const comic = await getComic(id);
  return NextResponse.json({
    number: result.collection.number,
    supply: comic?.gem.supply ?? 0,
    collected: await collectedCount(id),
    revealedLines: comic?.gem.revealedLines ?? [],
  });
}
