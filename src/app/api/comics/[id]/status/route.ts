import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { comicDir, getStatus } from "@/lib/store";
import { PANEL_COUNT } from "@/lib/writeScript";

/** Progress of a comic being made, and which panels are already drawn. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = await getStatus(id).catch(() => null);
  if (!status) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dir = comicDir(id);
  const drawn: number[] = [];
  for (let n = 1; n <= PANEL_COUNT; n++) {
    if (existsSync(join(dir, `panel-${n}.png`))) drawn.push(n);
  }
  return NextResponse.json(
    { state: status.state, step: status.step, detail: status.detail, error: status.error, drawn },
    { headers: { "Cache-Control": "no-store" } },
  );
}
