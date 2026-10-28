/**
 * Locate the story object in the panels the script plants it in, plus panel 1
 * as a negative control (the report is not there; papers on a desk are).
 *
 *   npx tsx scripts/locate-check.ts [panelsDir]
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { locateInPanel, describeJourney, type SceneBrief, type Sighting } from "../src/lib/locateObject";

const OBJECT = {
  name: "P256 Flaw Report",
  description: "a printed, highly technical research abstract on white paper; the first tangible evidence of a flaw in P256 encryption",
};

const SCENES: Record<number, SceneBrief> = {
  1: { panelNumber: 1, location: "Wesley's Penthouse Office", characters: ["Wesley"],
       description: "Wesley stands by his desk on the phone, alarmed, while monitors show a market crash." },
  2: { panelNumber: 2, location: "Zully's Tech Lab", characters: ["Zully"],
       description: "Zully hunches over her desk examining a printed report she holds, a phone on speaker beside her." },
  3: { panelNumber: 3, location: "Zully's Tech Lab", characters: ["Zully", "Wesley"],
       description: "Zully hands Wesley the crumpled printout; his eyes fixed on the paper." },
};

async function main() {
  const dir = process.argv[2] ?? "tmp/consistency";
  const work = join(process.cwd(), "tmp", "locate");
  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });

  const found: Sighting[] = [];
  for (const n of [1, 2, 3]) {
    const s = await locateInPanel(join(process.cwd(), dir, `panel-${n}.png`), SCENES[n], OBJECT, work);
    const tag = n === 1 ? " (control: should be NOT FOUND)" : "";
    if (!s) { console.log(`panel ${n}: NOT FOUND${tag}`); continue; }
    console.log(`panel ${n}: FOUND via "${s.query}" @ ${s.confidence.toFixed(2)} — ${s.reason}${tag}`);
    console.log(`          crop ${s.cropPath}`);
    if (n !== 1) found.push(s);
  }

  const journey = await describeJourney(found, OBJECT);
  console.log(`\nlabel   : ${journey.label}\nchanges : ${journey.visibleChanges}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
