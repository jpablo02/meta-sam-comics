import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { startComic } from "@/lib/jobs";
import { isGuest } from "@/lib/auth";
import { comicsStartedBy, getStatus, isStalled } from "@/lib/store";
import { GUEST_COMICS } from "@/lib/ideaRules";

/**
 * Make a failed comic again, from the same idea and gem. A reader who hits an
 * error otherwise has no way forward but to type it all again. Only its author
 * can, and only once it has failed. Returns the new comic's id.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { id } = await params;
  const status = await getStatus(id).catch(() => null);
  if (!status || status.author.id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((status.state !== "failed" && !isStalled(status)) || !status.idea) {
    return NextResponse.json({ error: "This comic cannot be tried again." }, { status: 409 });
  }
  if (isGuest(user.id) && (await comicsStartedBy(user.id)) >= GUEST_COMICS) {
    return NextResponse.json(
      { error: `Guests can make ${GUEST_COMICS} comics. Sign in with Facebook to make more.` },
      { status: 403 },
    );
  }

  // status.idea already carries the gem hint.
  return NextResponse.json({ id: await startComic(user, status.idea) });
}
