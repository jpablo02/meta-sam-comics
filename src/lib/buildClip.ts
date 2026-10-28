/**
 * Turn a chapter's panels into a video clip SAM 3.1 can track through.
 *
 * SAM takes ONE image or ONE video per request. Tracking identity across
 * several images is only available inside a video, so the panels are stitched
 * into an MP4 — one segment per panel.
 *
 * Two things learned from measuring this against a real chapter:
 *
 *  1. Panels do not share a size. A chapter mixes 9:16 splash panels with
 *     square ones, and a video demands one geometry, so every panel is
 *     letterboxed onto a common canvas.
 *
 *  2. A single frame per panel is not enough. SAM is trained on real footage,
 *     where an object barely moves between frames; one frame per panel gives it
 *     nothing to hold on to. Each panel is held for FRAMES_PER_PANEL frames, so
 *     the track is stable inside the panel. It still does not survive the cut —
 *     see resolveIdentity.
 */
import { execFile } from "node:child_process";
import { mkdir, copyFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

/** Frames each panel is held for. 15 at 15fps = one second per panel. */
export const FRAMES_PER_PANEL = 15;

/**
 * The clip takes the FIRST panel's size. Panels drawn by this app are all the
 * same 9:16, so nothing is letterboxed and SAM's boxes land on panel pixels
 * directly. Panels of other shapes (an imported chapter) are still letterboxed
 * onto it, never stretched — cropObject undoes that either way.
 */
async function clipCanvas(firstPanel: string): Promise<{ width: number; height: number }> {
  const meta = await sharp(firstPanel).metadata();
  if (!meta.width || !meta.height) throw new Error(`Cannot read dimensions of ${firstPanel}`);
  // H.264 with yuv420p needs even dimensions.
  return { width: meta.width - (meta.width % 2), height: meta.height - (meta.height % 2) };
}

export interface ClipResult {
  /** Absolute path of the MP4. */
  path: string;
  /** Total frames. Meta bills a minimum of 50 per request. */
  frameCount: number;
  /** Panel index for a given frame. */
  panelOfFrame: (frame: number) => number;
}

/**
 * Build the clip. `panelPaths` is in reading order; the clip follows it.
 */
export async function buildClip(panelPaths: string[], workDir: string): Promise<ClipResult> {
  if (panelPaths.length === 0) throw new Error("buildClip: no panels given");
  if (!ffmpegPath) throw new Error("ffmpeg-static did not resolve a binary");

  const seqDir = join(workDir, "seq");
  await rm(seqDir, { recursive: true, force: true });
  await mkdir(seqDir, { recursive: true });

  const canvas = await clipCanvas(panelPaths[0]);

  // Fit each panel onto the shared canvas, then hold it for N frames.
  let frame = 0;
  for (const panelPath of panelPaths) {
    const normalized = join(workDir, `norm-${frame}.png`);
    await sharp(panelPath)
      .resize(canvas.width, canvas.height, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
      .toFile(normalized);

    for (let held = 0; held < FRAMES_PER_PANEL; held++) {
      await copyFile(normalized, join(seqDir, `f${String(frame).padStart(4, "0")}.png`));
      frame++;
    }
  }

  const outPath = join(workDir, "chapter.mp4");
  // +faststart so the service does not have to remux the file before reading it.
  await execFileAsync(ffmpegPath, [
    "-y",
    "-framerate", String(FRAMES_PER_PANEL),
    "-i", join(seqDir, "f%04d.png"),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outPath,
  ]);

  return {
    path: outPath,
    frameCount: frame,
    panelOfFrame: (f: number) => Math.floor(f / FRAMES_PER_PANEL),
  };
}
