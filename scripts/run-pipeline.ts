/**
 * Idea in, comic + collectible + reel out.
 *
 *   npx tsx scripts/run-pipeline.ts "idea…"
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runComic } from "../src/lib/pipeline";

const IDEA =
  process.argv[2] ??
  "Don Aurelio es un relojero anciano de Bogotá, calvo, con bigote blanco y gafas redondas, que siempre lleva " +
  "un chaleco café. Su nieta Valentina, de 12 años, con trenzas, le lleva el almuerzo al taller. Ese día ve que " +
  "el abuelo esconde un reloj de bolsillo dorado en un cajón y se pone nervioso. Cuando él sale, ella lo abre: " +
  "por dentro de la tapa hay algo grabado. El coleccionable es ese reloj y lo que tiene grabado adentro.";

async function main() {
  const t0 = Date.now();
  const lap = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;
  const work = join(process.cwd(), "tmp", "run");
  const r = await runComic(IDEA, work, { onStep: (s, d) => console.log(`[${lap()}] ${s}${d ? " — " + d : ""}`) });

  console.log(`\n${r.script.seriesTitle} — ${r.script.chapterTitle}`);
  console.log(`paneles: ${r.panelRungs.join(", ")}`);
  r.script.scenes.forEach((s) => console.log(`  [${s.panelNumber}] ${s.description} | ${s.dialogue}`));
  for (const s of r.sightings) console.log(`objeto en viñeta ${s.panelNumber}: "${s.query}" @ ${s.confidence.toFixed(2)}`);
  console.log(`recorrido: ${r.journey.visibleChanges}`);
  console.log(`\nSECRETO DEL GUION: ${r.script.storyObject.secretContent}`);
  console.log(`TEASER: ${r.contents.teaser.join(" | ")}`);
  console.log(`REVELADO: ${r.contents.revealed.join(" | ")}`);
  console.log(`\n${r.teaserPath}\n${r.revealedPath}\n${r.reelPath}`);
  await writeFile(join(work, "result.json"), JSON.stringify(r, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
