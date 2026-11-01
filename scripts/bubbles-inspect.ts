/**
 * Re-letter stored comics into tmp/inspect and draw what the letterer saw:
 * green = a speaker's face it found, red = a bubble, red dashed = forced (no
 * legal spot). Prints, per panel, who speaks, who was found, who became narration.
 *
 *   npx tsx scripts/bubbles-inspect.ts <comicId> [<comicId> ...]
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { bakeBubbles } from "../src/lib/bubbles";

async function inspect(id: string) {
  const dir = join("data", "comics", id);
  const script = JSON.parse(await readFile(join(dir, "script.json"), "utf8"));
  const out = join("tmp", "inspect", id);
  await mkdir(out, { recursive: true });
  const tiles: Buffer[] = [];
  for (const scene of script.scenes) {
    const n = scene.panelNumber;
    const raw = join(dir, `panel-${n}.png`);
    const lettered = join(out, `panel-${n}-lettered.png`);
    const r = await bakeBubbles(raw, scene.dialogue ?? "", script.characters, lettered, [], n, scene.characters);
    const { width = 0, height = 0 } = await sharp(raw).metadata();
    const s = Math.round(width * 0.004);
    const rect = (b: any, color: string, dash = "") =>
      `<rect x="${b.x1}" y="${b.y1}" width="${b.x2 - b.x1}" height="${b.y2 - b.y1}" fill="none" stroke="${color}" stroke-width="${s}"${dash}/>`;
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
${Object.values(r.faces ?? {}).map((b) => rect(b, "#00e000")).join("\n")}
${(r.bubbles ?? []).map((b) => rect(b.box, "#ff2020", b.forced ? ` stroke-dasharray="${s * 4} ${s * 3}"` : "")).join("\n")}
</svg>`;
    const marked = join(out, `panel-${n}-marked.png`);
    await sharp(lettered).composite([{ input: Buffer.from(svg) }]).png().toFile(marked);
    tiles.push(await sharp(marked).resize(540, 960, { fit: "contain", background: "#111" }).toBuffer());
    console.log(
      `${id} p${n} in-scene=[${scene.characters.join(", ")}] found=[${Object.keys(r.faces ?? {}).join(", ")}]` +
        `${r.unplaced.length ? ` NARRATION=[${r.unplaced.join(", ")}]` : ""}` +
        `${r.bubbles?.some((b) => b.forced) ? " FORCED" : ""}\n   ${scene.dialogue}`,
    );
  }
  await sharp({ create: { width: 540 * tiles.length, height: 960, channels: 3, background: "#111" } })
    .composite(tiles.map((input, i) => ({ input, left: i * 540, top: 0 })))
    .png()
    .toFile(join(out, "sheet.png"));
}

async function main() {
  for (const id of process.argv.slice(2)) await inspect(id).catch((e) => console.error(id, e.message));
}
main();
