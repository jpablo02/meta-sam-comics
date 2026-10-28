/**
 * The chapter as a vertical video: every panel in order, a spotlight on the
 * story object wherever SAM found it, ending on the collectible.
 *
 * Nothing here is new information — it is what the pipeline already knows,
 * put in the shape people actually share. 1080x1920 at 15 fps is a Reel, a
 * Story or a Short as-is.
 *
 * The spotlight is the point. A reader scrolling past sees a comic; the dimming
 * tells them which object in it is the one you can own, before they have read a
 * word.
 */
import { execFile } from "node:child_process";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import type { PanelAppearance } from "./trackObject";

const execFileAsync = promisify(execFile);

export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
const FPS = 15;

/** Seconds on screen. */
const PANEL_SECONDS = 1.6;
const SPOTLIGHT_SECONDS = 1.4;
const ENDCARD_SECONDS = 2.6;

export interface ReelPanel {
  path: string;
  /** Where the object is in this panel, if it is in it. */
  sighting?: PanelAppearance;
}

/** The panel with everything but the object dimmed, and a glow around it. */
async function spotlight(panelPath: string, sighting: PanelAppearance, outPath: string): Promise<void> {
  const sx = REEL_WIDTH / sighting.canvas.w;
  const sy = REEL_HEIGHT / sighting.canvas.h;
  const pad = 18;
  const x = Math.max(0, Math.round(sighting.box.x1 * sx) - pad);
  const y = Math.max(0, Math.round(sighting.box.y1 * sy) - pad);
  const w = Math.min(REEL_WIDTH - x, Math.round((sighting.box.x2 - sighting.box.x1) * sx) + pad * 2);
  const h = Math.min(REEL_HEIGHT - y, Math.round((sighting.box.y2 - sighting.box.y1) * sy) + pad * 2);
  const r = 22;

  // An even-odd path: the full frame minus a rounded hole where the object is.
  const svg = `<svg width="${REEL_WIDTH}" height="${REEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <path fill="#000" fill-opacity="0.68" fill-rule="evenodd"
        d="M0,0H${REEL_WIDTH}V${REEL_HEIGHT}H0Z
           M${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x + r}Q${x},${y + h} ${x},${y + h - r}V${y + r}Q${x},${y} ${x + r},${y}Z"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="#f5b942" stroke-width="5" stroke-opacity="0.95"/>
</svg>`;

  await sharp(panelPath)
    .resize(REEL_WIDTH, REEL_HEIGHT, { fit: "cover" })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath);
}

/** Build the reel. Returns the MP4 path. */
export async function buildReel(panels: ReelPanel[], collectiblePath: string, workDir: string): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not resolve a binary");
  const seq = join(workDir, "reel-seq");
  await rm(seq, { recursive: true, force: true });
  await mkdir(seq, { recursive: true });

  let frame = 0;
  const hold = async (image: string, seconds: number) => {
    for (let i = 0; i < Math.round(seconds * FPS); i++) {
      await copyFile(image, join(seq, `f${String(frame++).padStart(5, "0")}.png`));
    }
  };

  for (const [i, panel] of panels.entries()) {
    const plain = join(workDir, `reel-panel-${i}.png`);
    await sharp(panel.path).resize(REEL_WIDTH, REEL_HEIGHT, { fit: "cover" }).png().toFile(plain);
    await hold(plain, PANEL_SECONDS);

    if (panel.sighting) {
      const lit = join(workDir, `reel-panel-${i}-spot.png`);
      await spotlight(panel.path, panel.sighting, lit);
      await hold(lit, SPOTLIGHT_SECONDS);
    }
  }

  // End card: the collectible, centred on black.
  const card = join(workDir, "reel-endcard.png");
  await sharp(collectiblePath)
    .resize(REEL_WIDTH, REEL_HEIGHT, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
    .png()
    .toFile(card);
  await hold(card, ENDCARD_SECONDS);

  const out = join(workDir, "reel.mp4");
  await execFileAsync(ffmpegPath, [
    "-y", "-framerate", String(FPS), "-i", join(seq, "f%05d.png"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ]);
  return out;
}
