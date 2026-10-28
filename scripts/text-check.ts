import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { SAMPLE_CHAPTER } from "../src/lib/chapter";
import { writeContents } from "../src/lib/writeContents";

async function main() {
  const contents = await writeContents(
    SAMPLE_CHAPTER,
    "printed P256 Flaw Report",
    "First held flat by gloved hands over a keyboard, later held crumpled and creased by bare hands.",
  );
  console.log("TITLE    :", contents.title);
  console.log("\nTEASER (visible para todos):");
  contents.teaser.forEach((l) => console.log("   " + l));
  console.log("\nREVEALED (solo quien lo acuña):");
  contents.revealed.forEach((l) => console.log("   " + l));
  console.log("\nFORESHADOW:", contents.foreshadow);
}

main().catch((e) => { console.error(e); process.exit(1); });
