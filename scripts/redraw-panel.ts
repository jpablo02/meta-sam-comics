/**
 * Redraw some panels of a finished run, and leave every other panel as it is.
 *
 *   npx tsx scripts/redraw-panel.ts <runDir> <panel> [panel…] [--object <image>]
 *
 * A whole new run rolls the dice on everything — script, cast, gem, cards — to
 * fix one panel. This keeps what came out well and redraws only what did not:
 * the same portraits, the same script (edit result.json first to change a line
 * or the gem's description), and the gem anchored on --object (an object sheet,
 * or a run's own teaser card when it predates object sheets).
 *
 * Each redrawn panel is found again by Muse Wonder + SAM 3.1 and re-lettered;
 * the old version is kept as panel-N.before.png.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { drawPanel } from "../src/lib/drawPanels";
import { locateInPanel } from "../src/lib/locateObject";
import { bakeBubbles, type Box } from "../src/lib/bubbles";
import { toBible } from "../src/lib/writeScript";
import type { ComicResult } from "../src/lib/pipeline";

async function main() {
  const args = process.argv.slice(2);
  const objectAt = args.indexOf("--object");
  const objectRef = objectAt >= 0 ? resolve(args[objectAt + 1]) : null;
  const [runDir, ...rest] = args.filter((_, i) => objectAt < 0 || (i !== objectAt && i !== objectAt + 1));
  const numbers = rest.map(Number).filter((n) => n >= 1);
  if (!runDir || numbers.length === 0) throw new Error("usage: redraw-panel.ts <runDir> <panel> [panel…] [--object <image>]");

  const resultPath = join(runDir, "result.json");
  const r = JSON.parse(await readFile(resultPath, "utf8")) as ComicResult;
  const bible = toBible(r.script);
  const portraits = new Map(
    r.script.characters.map((c) => [c.name.toLowerCase(), join(runDir, `portrait-${c.name.toLowerCase()}.webp`)] as const),
  );
  const object = { name: r.script.storyObject.name, description: r.script.storyObject.description };

  for (const n of numbers) {
    const scene = r.script.scenes.find((s) => s.panelNumber === n);
    if (!scene) throw new Error(`no panel ${n}`);
    const png = join(runDir, `panel-${n}.png`);
    if (existsSync(png)) await copyFile(png, join(runDir, `panel-${n}.before.png`));

    const webp = join(runDir, `panel-${n}.webp`);
    const rung = await drawPanel(scene, bible, portraits, webp, objectRef);
    await sharp(webp).png().toFile(png);
    r.panels[n - 1] = png;
    r.panelRungs[n - 1] = rung;
    console.log(`panel ${n}: drawn (${rung})`);

    // Found again: the old box points at where the gem WAS.
    r.sightings = r.sightings.filter((s) => s.panelNumber !== n);
    const avoid: Box[] = [];
    if (r.script.storyObject.plantedInPanels.includes(n)) {
      const found = await locateInPanel(
        png,
        { panelNumber: n, description: scene.imagePrompt, location: scene.location, characters: scene.characters },
        object,
        runDir,
      );
      if (found) {
        r.sightings.push(found);
        const { width = 0, height = 0 } = await sharp(png).metadata();
        const a = found.appearance;
        avoid.push({ x1: (a.box.x1 * width) / a.canvas.w, y1: (a.box.y1 * height) / a.canvas.h, x2: (a.box.x2 * width) / a.canvas.w, y2: (a.box.y2 * height) / a.canvas.h });
      }
      console.log(`panel ${n}: gem ${found ? `found @ ${found.confidence.toFixed(2)}` : "NOT found"}`);
    }

    const lettered = join(runDir, `panel-${n}-lettered.png`);
    const { unplaced } = await bakeBubbles(png, scene.dialogue ?? "", r.script.characters, lettered, avoid, n);
    r.lettered[n - 1] = lettered;
    console.log(`panel ${n}: lettered${unplaced.length ? `, ${unplaced.length} bubble(s) unplaced` : ""}`);
  }

  r.sightings.sort((a, b) => a.panelNumber - b.panelNumber);
  await writeFile(resultPath, JSON.stringify(r, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
