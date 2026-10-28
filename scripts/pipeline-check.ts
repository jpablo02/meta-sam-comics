/**
 * End-to-end check against the sample chapter. Prints what each model decided.
 *
 *   npx tsx scripts/pipeline-check.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { buildClip } from "../src/lib/buildClip";
import { uploadFile, trackObject, foldByPanel } from "../src/lib/trackObject";
import { cropFromPanel } from "../src/lib/cropObject";
import { resolveObjects, primaryObject, labelOf, bestAppearance } from "../src/lib/resolveIdentity";

const PROMPT = "white paper document";
const STORY = {
  chapterTitle: "Elliptic Curve P256",
  synopsis:
    "A character named Nyx finds a printed research document called the 'P256 Flaw Report' " +
    "and later shows it to Wesley.",
};

async function main() {
  const work = join(process.cwd(), "tmp", "check");
  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });

  const panels = [0, 1, 2, 3].map((i) => join(process.cwd(), "public", "chapter", `panel-${i}.png`));

  console.log("1. building clip");
  const clip = await buildClip(panels, work);
  console.log(`   ${clip.frameCount} frames`);

  console.log("2. uploading");
  const fileId = await uploadFile(clip.path, "chapter.mp4");
  console.log(`   ${fileId}`);

  console.log(`3. tracking "${PROMPT}" with SAM`);
  const detections = await trackObject(fileId, PROMPT, clip.panelOfFrame);
  const appearances = foldByPanel(detections);
  for (const a of appearances) {
    console.log(
      `   panel ${a.panel}  samObjectId=${a.samObjectId}  conf=${a.confidence.toFixed(3)}  frames=${a.frameCount}`,
    );
  }

  console.log("4. cropping");
  const cropPaths = new Map<string, string>();
  for (const a of appearances) {
    const out = join(work, `crop-p${a.panel}-o${a.samObjectId}.png`);
    const r = await cropFromPanel(panels[a.panel], a, out);
    cropPaths.set(`${a.panel}:${a.samObjectId}`, out);
    console.log(`   panel ${a.panel} -> ${r.width}x${r.height}`);
  }

  console.log("5. resolving identity with Muse Wonder");
  const objects = await resolveObjects(
    appearances,
    (a) => cropPaths.get(`${a.panel}:${a.samObjectId}`)!,
    STORY,
  );

  for (const o of objects) {
    console.log(`\n   OBJECT "${labelOf(o, PROMPT)}"`);
    console.log(`     panels: ${o.appearances.map((a) => a.panel).join(", ")}`);
    for (const e of o.evidence) {
      console.log(`     merged @ ${e.confidence.toFixed(2)}: ${e.reason}`);
      console.log(`       changes: ${e.visibleChanges}`);
    }
  }

  const primary = primaryObject(objects);
  if (primary) {
    const best = bestAppearance(primary);
    console.log(`\n   PRIMARY: "${labelOf(primary, PROMPT)}" across ${primary.appearances.length} panel(s)`);
    console.log(`   best crop: panel ${best.panel} @ ${best.confidence.toFixed(3)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
