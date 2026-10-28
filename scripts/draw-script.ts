/**
 * Draw a generated script and find its story object.
 *   npx tsx scripts/draw-script.ts [tmp/script/script.json]
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { toBible, type ComicScript } from "../src/lib/writeScript";
import { drawPortraits, drawPanel } from "../src/lib/drawPanels";
import { locateInPanel, describeJourney, type Sighting } from "../src/lib/locateObject";

async function main() {
  const script: ComicScript = JSON.parse(await readFile(process.argv[2] ?? "tmp/script/script.json", "utf8"));
  const bible = toBible(script);
  const work = join(process.cwd(), "tmp", "script");
  await mkdir(work, { recursive: true });

  const portraits = await drawPortraits(bible, work);
  const panels: string[] = [];
  for (const scene of script.scenes) {
    const out = join(work, `panel-${scene.panelNumber}.webp`);
    const rung = await drawPanel(scene, bible, portraits, out);
    const png = out.replace(".webp", ".png");
    await sharp(out).png().toFile(png);
    panels.push(png);
    console.log(`panel ${scene.panelNumber} [${rung}]`);
  }

  const tiles = await Promise.all(panels.map((p) => sharp(p).resize(540, 960, { fit: "contain", background: "#111" }).toBuffer()));
  await sharp({ create: { width: 2160, height: 960, channels: 3, background: "#111" } })
    .composite(tiles.map((input, i) => ({ input, left: i * 540, top: 0 }))).png().toFile(join(work, "sheet.png"));

  const object = { name: script.storyObject.name, description: script.storyObject.description };
  const found: Sighting[] = [];
  for (const n of script.storyObject.plantedInPanels) {
    const scene = script.scenes.find((s) => s.panelNumber === n)!;
    const s = await locateInPanel(panels[n - 1], { panelNumber: n, description: scene.imagePrompt, location: scene.location, characters: scene.characters }, object, work);
    console.log(s ? `object in panel ${n}: "${s.query}" @ ${s.confidence.toFixed(2)} — ${s.reason}` : `object in panel ${n}: NOT FOUND`);
    if (s) found.push(s);
  }
  const j = await describeJourney(found, object);
  console.log(`journey: ${j.label} — ${j.visibleChanges}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
