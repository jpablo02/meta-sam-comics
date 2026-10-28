/**
 *   npx tsx scripts/script-check.ts "idea…"
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { writeScript, validateScript } from "../src/lib/writeScript";

const IDEA =
  process.argv[2] ??
  "Sofía es una detective de Medellín, morena, de pelo negro rizado, que siempre usa una gabardina verde oliva. " +
  "Investiga la desaparición de su hermano menor, Tomás. En el cuarto de Tomás encuentra un tiquete de bus viejo " +
  "con algo escrito a mano por detrás. Ese tiquete es el coleccionable: lo que dice atrás es la pista de dónde está Tomás.";

async function main() {
  const t0 = Date.now();
  const script = await writeScript(IDEA);
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)  problemas: ${validateScript(script).length}\n`);
  console.log(`${script.seriesTitle} — ${script.chapterTitle}  [${script.genre} / ${script.tone}]`);
  console.log(`logline: ${script.logline}\n`);
  for (const c of script.characters) console.log(`PERSONAJE ${c.name}: ${JSON.stringify(c.traits)}`);
  for (const l of script.locations) console.log(`LUGAR ${l.name}: ${l.description.slice(0, 110)}…`);
  const o = script.storyObject;
  console.log(`\nOBJETO ${o.name} (viñetas ${o.plantedInPanels.join(", ")}): ${o.description}`);
  console.log(`SECRETO: ${o.secretContent}\n`);
  for (const s of script.scenes) {
    console.log(`[${s.panelNumber}] (${s.characters.join("+")} @ ${s.location}) ${s.description}`);
    console.log(`     img: ${s.imagePrompt}`);
    console.log(`     dlg: ${s.dialogue}`);
  }
  const dir = join(process.cwd(), "tmp", "script");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "script.json"), JSON.stringify(script, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
