import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { isStalled, unfinishedBy } from "@/lib/store";
import { percentOf } from "@/lib/progress";

/** The first words of the reader's own idea: how they tell two comics in progress apart. */
function labelOf(idea: string | undefined): string {
  const first = (idea ?? "").split(/\n/)[0].trim();
  return first.length > 28 ? `${first.slice(0, 27).trimEnd()}…` : first || "Your comic";
}

/**
 * The signed-in reader's comics still being made, or failed and not tried
 * again — for the progress bubbles. Only ever their own, so their own idea's
 * first words can go back to them.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ comics: [] });
  const statuses = await unfinishedBy(user.id).catch(() => []);
  const comics = statuses.map((s) => {
    const running = s.state === "running" && !isStalled(s);
    return {
      id: s.id,
      state: running ? "running" : "failed",
      percent: running ? percentOf(s.step, s.detail) : 0,
      label: labelOf(s.idea),
    };
  });
  return NextResponse.json({ comics }, { headers: { "Cache-Control": "no-store" } });
}
