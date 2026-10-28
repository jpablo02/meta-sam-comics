/**
 * The whole pipeline over the sample chapter, writing every intermediate file.
 *
 *   npx tsx scripts/full-check.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { SAMPLE_CHAPTER, storySummary } from "../src/lib/chapter";
import { buildClip } from "../src/lib/buildClip";
import { uploadFile, trackObject, foldByPanel } from "../src/lib/trackObject";
import { cropFromPanel } from "../src/lib/cropObject";
import { resolveObjects, primaryObject, labelOf, bestAppearance } from "../src/lib/resolveIdentity";
import { writeContents } from "../src/lib/writeContents";
import { revealObject } from "../src/lib/revealObject";

const PROMPT = "white paper document";

async function main() {
  const chapter = SAMPLE_CHAPTER;
  const work = join(process.cwd(), "tmp", "full");
  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });

  const panels = chapter.panelPaths.map((p) => join(process.cwd(), p));

  console.log("1. clip");
  const clip = await buildClip(panels, work);

  console.log("2. upload + SAM");
  const fileId = await uploadFile(clip.path, "chapter.mp4");
  const appearances = foldByPanel(await trackObject(fileId, PROMPT, clip.panelOfFrame));
  console.log("   panels:", appearances.map((a) => a.panel).join(", "));

  console.log("3. crops");
  const crops = new Map<string, string>();
  for (const a of appearances) {
    const out = join(work, `crop-p${a.panel}.png`);
    await cropFromPanel(panels[a.panel], a, out);
    crops.set(`${a.panel}:${a.samObjectId}`, out);
  }

  console.log("4. identity");
  const objects = await resolveObjects(
    appearances,
    (a) => crops.get(`${a.panel}:${a.samObjectId}`)!,
    { chapterTitle: chapter.chapterTitle, synopsis: storySummary(chapter) },
  );
  const primary = primaryObject(objects)!;
  const label = labelOf(primary, PROMPT);
  const changes = primary.evidence[0]?.visibleChanges ?? "";
  console.log(`   "${label}" across panels ${primary.appearances.map((a) => a.panel).join(", ")}`);

  console.log("5. text (Muse Spark)");
  const contents = await writeContents(chapter, label, changes);
  console.log(`   "${contents.title}" — ${contents.teaser.length} teaser / ${contents.revealed.length} revealed`);

  console.log("6. artwork (Muse Image)");
  const best = bestAppearance(primary);
  const artwork = join(work, "artwork.webp");
  await revealObject(crops.get(`${best.panel}:${best.samObjectId}`)!, artwork, {
    objectName: chapter.secretObjectName,
    treatment:
      "floating alone against a dark background of glowing blue circuit traces, edges scorched " +
      "and burnt, dramatic rim lighting",
  });

  console.log("7. compose");
  const teaserPath = join(work, "collectible-teaser.png");
  const revealedPath = join(work, "collectible-revealed.png");
  await composeContents(artwork, teaserPath, { title: contents.title, lines: contents.teaser });
  await composeContents(artwork, revealedPath, { title: contents.title, lines: contents.revealed });

  console.log(`\nDONE\n  ${teaserPath}\n  ${revealedPath}`);
  console.log(`\nforeshadow: ${contents.foreshadow}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
