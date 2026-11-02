import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { isStalled, unfinishedBy } from "@/lib/store";
import { percentOf } from "@/lib/progress";

/** The signed-in reader's comics still being made, or failed and not tried again — for the progress bubble. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ comics: [] });
  const statuses = await unfinishedBy(user.id).catch(() => []);
  const comics = statuses.map((s) => {
    const running = s.state === "running" && !isStalled(s);
    return { id: s.id, state: running ? "running" : "failed", percent: running ? percentOf(s.step, s.detail) : 0 };
  });
  return NextResponse.json({ comics }, { headers: { "Cache-Control": "no-store" } });
}
