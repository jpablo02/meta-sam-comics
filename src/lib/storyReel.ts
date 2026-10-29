/**
 * The reel a reader posts — as opposed to the spotlight reel (buildReel.ts),
 * which dims each panel around the object to show HOW the gem was found. That
 * one is for the demo; this one is for a feed.
 *
 *   title card → every lettered panel, panning slowly top to bottom (the order
 *   its bubbles read in), held as long as its dialogue takes to read → the gem,
 *   blurred, with where to collect it.
 *
 * Crossfades between shots; 1080x1920 at 30 fps, ready for Reels and Stories.
 * Card text is drawn as glyph outlines, like the bubbles, so the server needs
 * no fonts.
 */
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { APP_NAME } from "./brand";
import { centredTextPath } from "./bubbles";

const execFileAsync = promisify(execFile);

const W = 1080;
const H = 1920;
const FPS = 30;
/** How far each panel pushes in over its shot: 4%, felt more than seen. */
const ZOOM = 0.04;
const FADE = 0.45;
const TITLE_SECONDS = 2.2;
const END_SECONDS = 3.4;

/** Long enough to read the panel's dialogue at a relaxed pace. */
function panelSeconds(dialogue: string): number {
  return Math.min(5.5, 2.6 + dialogue.replace(/\s+/g, " ").length * 0.045);
}

function textBlock(lines: Array<{ text: string; size: number; fill: string }>, top: number): string {
  let y = top;
  return lines
    .map(({ text, size, fill }) => {
      y += size * 1.25;
      return `<path d="${centredTextPath(text, W / 2, y, size)}" fill="${fill}"/>`;
    })
    .join("");
}

/** Blurred, darkened full-frame background from any image. */
async function backdrop(image: string): Promise<Buffer> {
  return sharp(image)
    .resize(W, H, { fit: "cover" })
    .blur(40)
    .modulate({ brightness: 0.45, saturation: 1.2 })
    .png()
    .toBuffer();
}

/**
 * The opening shot. With a cover, the cover itself, titled low over a shade —
 * faces sit high on a cover, so the top is the one place a title must not go.
 * Without one, the title over a blurred first panel.
 */
async function titleCard(series: string, chapter: string, out: string, firstPanel: string, cover?: string): Promise<void> {
  const lines = [
    { text: series.toUpperCase(), size: 44, fill: "#ffd27a" },
    { text: chapter, size: 92, fill: "#ffffff" },
  ];
  if (!cover) {
    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${textBlock(lines, H / 2 - 120)}</svg>`;
    await sharp(await backdrop(firstPanel)).composite([{ input: Buffer.from(svg) }]).png().toFile(out);
    return;
  }
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.8"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>${textBlock(lines, H - 330)}</svg>`;
  await sharp(cover).resize(W, H, { fit: "cover" }).composite([{ input: Buffer.from(svg) }]).png().toFile(out);
}

async function endCard(teaser: string, out: string): Promise<void> {
  const cardW = 640;
  const card = await sharp(teaser).resize({ width: cardW }).png().toBuffer();
  const { height: cardH = 960 } = await sharp(card).metadata();
  const radius = 36;
  const mask = Buffer.from(`<svg width="${cardW}" height="${cardH}"><rect width="${cardW}" height="${cardH}" rx="${radius}"/></svg>`);
  const rounded = await sharp(card).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const top = 300;
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${textBlock(
    [{ text: "A gem is hidden in this story", size: 56, fill: "#ffffff" }],
    120,
  )}${textBlock(
    [
      { text: "Collect it to read what it says", size: 44, fill: "#ffd27a" },
      { text: `on ${APP_NAME}`, size: 64, fill: "#ffffff" },
    ],
    top + cardH + 50,
  )}</svg>`;
  await sharp(await backdrop(teaser))
    .composite([
      { input: rounded, top, left: (W - cardW) / 2 },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .png()
    .toFile(out);
}

export interface StoryReelInput {
  seriesTitle: string;
  chapterTitle: string;
  /** The comic's cover, if it has one: the reel opens on it. */
  coverPath?: string;
  /** Lettered panels, in reading order, with the dialogue each one carries. */
  panels: Array<{ path: string; dialogue: string }>;
  teaserPath: string;
}

/** Build the story reel. Returns the MP4 path. */
export async function buildStoryReel(input: StoryReelInput, workDir: string): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not resolve a binary");

  const title = join(workDir, "story-title.png");
  const end = join(workDir, "story-end.png");
  await titleCard(input.seriesTitle, input.chapterTitle, title, input.panels[0].path, input.coverPath);
  await endCard(input.teaserPath, end);

  // A cover is art: it gets the same slow push-in as the panels, and a beat longer.
  const shots: Array<{ path: string; seconds: number; move: boolean }> = [
    { path: title, seconds: input.coverPath ? TITLE_SECONDS + 0.8 : TITLE_SECONDS, move: Boolean(input.coverPath) },
  ];
  for (const [i, p] of input.panels.entries()) {
    const framed = join(workDir, `story-panel-${i + 1}.png`);
    await sharp(p.path).resize(W, H, { fit: "cover" }).png().toFile(framed);
    shots.push({ path: framed, seconds: panelSeconds(p.dialogue), move: true });
  }
  shots.push({ path: end, seconds: END_SECONDS, move: false });

  const args = ["-y"];
  for (const s of shots) args.push("-loop", "1", "-framerate", String(FPS), "-t", s.seconds.toFixed(2), "-i", s.path);

  /**
   * A slow push-in anchored at the TOP edge. A downward pan was tried first and
   * cut the first bubble off by the end of every shot — bubbles sit at the top.
   * Upscaled before zoompan, which rounds to whole pixels and shakes otherwise.
   */
  const filters = shots.map((s, i) => {
    const frames = Math.round(s.seconds * FPS);
    const move = s.move
      ? `scale=${W * 2}:${H * 2},zoompan=z='1+${ZOOM}*on/${frames}':x='iw/2-iw/zoom/2':y=0:d=1:s=${W}x${H}:fps=${FPS},setpts=N/(${FPS}*TB),`
      : `scale=${W}:${H},fps=${FPS},`;
    return `[${i}:v]${move}format=yuv420p,setsar=1[s${i}]`;
  });
  let last = "s0";
  let offset = 0;
  for (let i = 1; i < shots.length; i++) {
    offset += shots[i - 1].seconds - FADE;
    const label = i === shots.length - 1 ? "out" : `x${i}`;
    filters.push(`[${last}][s${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}[${label}]`);
    last = label;
  }

  const out = join(workDir, "reel-story.mp4");
  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[out]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "25", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    out,
  );
  await execFileAsync(ffmpegPath, args, { maxBuffer: 16 * 1024 * 1024 });
  return out;
}
