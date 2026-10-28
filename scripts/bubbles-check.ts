/**
 * Bake the dialogue of a finished run into its panels.
 *   npx tsx scripts/bubbles-check.ts [tmp/run]
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { bakeBubbles, type Box } from "../src/lib/bubbles";

async function main() {
  const dir = process.argv[2] ?? "tmp/run";
  const r = JSON.parse(await readFile(join(dir, "result.json"), "utf8"));
  const out: string[] = [];
  for (const scene of r.script.scenes) {
    const n = scene.panelNumber;
    const sighting = r.sightings.find((s: any) => s.panelNumber === n);
    const avoid: Box[] = [];
    if (sighting) {
      const a = sighting.appearance;
      const { width = 0, height = 0 } = await sharp(r.panels[n - 1]).metadata();
      const sx = width / a.canvas.w, sy = height / a.canvas.h;
      avoid.push({ x1: a.box.x1 * sx, y1: a.box.y1 * sy, x2: a.box.x2 * sx, y2: a.box.y2 * sy });
    }
    const path = join(dir, `panel-${n}-bubbles.png`);
    const res = await bakeBubbles(r.panels[n - 1], scene.dialogue ?? "", r.script.characters, path, avoid, n);
    console.log(`panel ${n}: ${JSON.stringify(scene.dialogue)}${res.unplaced.length ? `  (off-panel: ${res.unplaced.join(", ")})` : ""}`);
    out.push(path);
  }
  const tiles = await Promise.all(out.map((p) => sharp(p).resize(540, 960).toBuffer()));
  await sharp({ create: { width: 2160, height: 960, channels: 3, background: "#111" } })
    .composite(tiles.map((input, i) => ({ input, left: i * 540, top: 0 }))).png().toFile(join(dir, "bubbles-sheet.png"));
}
main().catch((e) => { console.error(e); process.exit(1); });
