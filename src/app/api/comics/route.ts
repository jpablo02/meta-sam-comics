import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { startComic } from "@/lib/jobs";

const MAX_IDEA = 1200;
const MAX_HINT = 300;

/** Start a comic. Returns its id at once; the page polls its status. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { idea?: unknown; gemHint?: unknown };
  const idea = typeof body.idea === "string" ? body.idea.trim() : "";
  const gemHint = typeof body.gemHint === "string" ? body.gemHint.trim() : "";
  if (idea.length < 20) return NextResponse.json({ error: "Tell us a little more — a sentence or two." }, { status: 400 });
  if (idea.length > MAX_IDEA || gemHint.length > MAX_HINT) {
    return NextResponse.json({ error: "That idea is too long." }, { status: 400 });
  }

  const id = await startComic(user, idea, gemHint);
  return NextResponse.json({ id });
}
