/**
 * Can Muse Image hold two characters across four panels?
 * Redraws the sample chapter from its real script with Token Comic's formula.
 *
 *   npx tsx scripts/consistency-check.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { ComicBible, PanelScene } from "../src/lib/comicPrompts";
import { drawPortraits, drawPanel, type PanelShape } from "../src/lib/drawPanels";

const BIBLE: ComicBible = {
  artStyle:
    "semi-realistic digital painting, detailed rendering, soft cinematic lighting, rich color palette, painterly comic style",
  characters: [
    {
      name: "Zully",
      traits: {
        age: "late 20s", build: "athletic and lean", skin: "fair skin",
        hair: "long, straight red hair", eyes: "intense red eyes",
        outfit: "form-fitting black leather biker-style jumpsuit with silver zippers",
        distinctive: "small geometric circuit tattoo on her left wrist",
      },
    },
    {
      name: "Wesley",
      traits: {
        age: "early 30s", build: "lean and well-maintained", skin: "fair skin",
        hair: "short, neatly styled black hair", eyes: "sharp blue eyes",
        outfit: "custom-tailored dark grey three-piece suit, crisp white shirt, and a dark silk tie",
        distinctive: "high-end minimalist watch on his left wrist",
      },
    },
  ],
  locations: [
    { name: "Wesley's Penthouse Office", description: "A high-rise, opulent penthouse office. Floor-to-ceiling windows over a city at night. Dark polished wood, steel and glass. A sleek desk with monitors glowing with financial data." },
    { name: "Zully's Tech Lab", description: "A high-tech, slightly chaotic home lab. Multiple large monitors with code, exposed wiring and server racks, a cluttered desk with a high-end keyboard and energy drink cans. Cool blue monitor glow with warm task lighting." },
  ],
  storyObject: {
    name: "P256 Flaw Report",
    description: "a printed, highly technical research abstract on white paper",
    plantedInPanels: [2, 3],
  },
};

const SCENES: Array<PanelScene & { shape: PanelShape }> = [
  { panelNumber: 1, shape: "tall", location: "Wesley's Penthouse Office", characters: ["Wesley"],
    imagePrompt: "Wide shot of Wesley standing beside his large desk, phone pressed to his ear, eyes wide with alarm. Glowing monitors display crashing charts and red numbers. City lights outside the windows. Dramatic lighting, impending doom." },
  { panelNumber: 2, shape: "square", location: "Zully's Tech Lab", characters: ["Zully"],
    imagePrompt: "Medium shot of Zully hunched over her desk, eyes glued to a printout in her hand. Monitors behind her show cryptographic algorithms and error messages. A phone on the desk on speaker. Grim, focused expression." },
  { panelNumber: 3, shape: "square", location: "Zully's Tech Lab", characters: ["Zully", "Wesley"],
    imagePrompt: "Close-up on Zully's and Wesley's hands almost touching as Zully hands Wesley the crumpled printout. Zully's eyes intense, looking at Wesley; Wesley's gaze fixed on the paper, jaw clenched. Soft cinematic lighting on their faces." },
  { panelNumber: 4, shape: "tall", location: "Zully's Tech Lab", characters: ["Zully", "Wesley"],
    imagePrompt: "Medium shot of Zully and Wesley standing side by side in the lab, looking directly at each other. Zully resolute, Wesley determined, a flicker of hope in his eyes. Screens glow on their faces. A united front, a hint of affection." },
];

async function main() {
  const work = join(process.cwd(), "tmp", "consistency");
  await mkdir(work, { recursive: true });

  console.log("portraits...");
  const portraits = await drawPortraits(BIBLE, work);
  for (const [name, p] of portraits) {
    const png = p.replace(".webp", ".png");
    await sharp(p).png().toFile(png);
    console.log("  ", name, "->", png);
  }

  for (const scene of SCENES) {
    const out = join(work, `panel-${scene.panelNumber}.webp`);
    const t0 = Date.now();
    const rung = await drawPanel(scene, scene.shape, BIBLE, portraits, out);
    const png = out.replace(".webp", ".png");
    const m = await sharp(out).png().toFile(png);
    console.log(`panel ${scene.panelNumber} (${scene.characters.join("+")}) ${m.width}x${m.height} in ${((Date.now() - t0) / 1000).toFixed(1)}s  [${rung}]`);
  }

  // One contact sheet, to judge consistency at a glance.
  const tiles = await Promise.all(
    SCENES.map((s) => sharp(join(work, `panel-${s.panelNumber}.png`)).resize(540, 960, { fit: "contain", background: "#111" }).toBuffer()),
  );
  await sharp({ create: { width: 540 * 4, height: 960, channels: 3, background: "#111" } })
    .composite(tiles.map((input, i) => ({ input, left: i * 540, top: 0 })))
    .png().toFile(join(work, "sheet.png"));
  console.log("sheet ->", join(work, "sheet.png"));
}

main().catch((e) => { console.error(e); process.exit(1); });
