/**
 * Re-letter a finished run's panels with the current bubble code, without
 * redrawing anything (Muse Wonder + SAM only, no Muse Image).
 *
 *   npx tsx scripts/reletter.ts [runDir]
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import sharp from "sharp";
import { bakeBubbles, type Box } from "../src/lib/bubbles";
import type { ComicResult } from "../src/lib/pipeline";

const runDir = process.argv[2] ?? join("tmp", "run");

async function main() {
  const r = JSON.parse(await readFile(join(runDir, "result.json"), "utf8")) as ComicResult;
  for (const scene of r.script.scenes) {
    const n = scene.panelNumber;
    const raw = join(runDir, basename(r.panels[n - 1]));
    const avoid: Box[] = [];
    const s = r.sightings.find((x) => x.panelNumber === n);
    if (s) {
      const { width = 0, height = 0 } = await sharp(raw).metadata();
      const a = s.appearance;
      avoid.push({ x1: (a.box.x1 * width) / a.canvas.w, y1: (a.box.y1 * height) / a.canvas.h, x2: (a.box.x2 * width) / a.canvas.w, y2: (a.box.y2 * height) / a.canvas.h });
    }
    const out = join(runDir, `panel-${n}-lettered.png`);
    const { unplaced } = await bakeBubbles(raw, scene.dialogue ?? "", r.script.characters, out, avoid, n);
    console.log(`panel ${n}: ${unplaced.length ? `unplaced ${unplaced.length}` : "ok"}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
