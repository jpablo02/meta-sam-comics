import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { comicDir, getStatus, isStalled } from "@/lib/store";
import { PANEL_COUNT } from "@/lib/writeScript";

/**
 * Progress of a comic being made, and which panels are already drawn.
 *
 * What went wrong is never sent as the error text itself — a reader cannot act
 * on "The story object … was not found in any of its panels" or the API's JSON.
 * The page gets the kind of failure and explains it in words; the details stay
 * in the server log.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = await getStatus(id).catch(() => null);
  if (!status) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // The worker records what it has uploaded; a local run is read off the disk.
  let drawn = status.drawn;
  if (!drawn) {
    const dir = comicDir(id);
    drawn = [];
    for (let n = 1; n <= PANEL_COUNT; n++) {
      if (existsSync(join(dir, `panel-${n}.png`))) drawn.push(n);
    }
  }

  const stalled = isStalled(status);
  const reason = stalled
    ? "stalled"
    : status.state !== "failed"
      ? undefined
      : /content_policy_violation/.test(status.error ?? "")
        ? "filtered"
        : "error";
  return NextResponse.json(
    // The idea stays on the server: only whether it can be tried again goes out.
    {
      state: stalled ? "failed" : status.state,
      step: status.step,
      detail: status.detail,
      reason,
      drawn,
      canRetry: Boolean(status.idea),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
