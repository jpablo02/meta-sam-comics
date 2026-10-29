/**
 * Speech bubbles, placed by looking at the panel and baked into it.
 *
 * Panels are drawn wordless on purpose — an image model asked for a comic draws
 * balloons full of gibberish, and it took Token Comic four rounds to make it
 * stop. So the dialogue is added afterwards. On Token Comic the creator drags
 * each bubble into place in an editor; here nobody does, so placement has to be
 * right on its own:
 *
 *  - Muse Wonder looks at the panel and writes, for each speaker, the phrase
 *    that finds their face ("face of the girl with braids").
 *  - SAM 3.1 segments it. Now the layout knows where every face is.
 *  - Bubbles go in reading order — each one below the last — never over a face,
 *    never over each other, never over the story object, with the tail pointing
 *    at whoever is talking.
 *
 * Measured on a first prototype that did none of the ordering: faces stayed
 * clear and tails found their speakers, but two bubbles overlapped and the
 * second speaker's line sat above the first's.
 *
 * Bubbles are baked in, not overlaid in HTML, so the dialogue travels with the
 * image everywhere it goes: the reader, the reel, the preview Facebook shows
 * when the comic is shared. Text is drawn as glyph outlines from Comic Neue
 * (bundled, OFL), so it renders the same on any server, with no font installed.
 */
import { join } from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";
import type { Character } from "./comicPrompts";
import { segmentImage } from "./trackObject";
import { askWonder, extractJson, str } from "./wonder";

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Line {
  /** null when nobody on the page says it — narration. */
  speaker: string | null;
  text: string;
  /** "(whispering)" and the like: drawn with a dashed outline. */
  whisper: boolean;
}

/**
 * "Valentina: Grandpa! | Don Aurelio (whispering): Not now." → lines in order.
 * A segment with no "Name:" prefix is narration.
 */
export function parseDialogue(dialogue: string, cast: string[]): Line[] {
  const known = new Map(cast.map((n) => [n.toLowerCase(), n]));
  // The script is asked to separate speakers with "|", and does not always: it
  // wrote "Camila: Look! Ramiro: No... that bottle." — two speakers, one bubble,
  // "Ramiro:" printed inside it. So a cast name followed by ":" also starts a new line.
  const escaped = cast.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const speakerStart = escaped ? new RegExp(`\\s+(?=(?:${escaped})\\s*(?:\\([^)]*\\))?\\s*:)`, "g") : null;
  return dialogue
    .split("|")
    .flatMap((part) => (speakerStart ? part.split(speakerStart) : [part]))
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^([^:()]{1,40}?)\s*(\(([^)]*)\))?\s*:\s*(.+)$/);
      const name = m ? known.get(m[1].trim().toLowerCase()) : undefined;
      if (!m || !name) return { speaker: null, text: part.replace(/^[^:]{1,40}:\s*/, ""), whisper: false };
      return { speaker: name, text: m[4].trim(), whisper: /whisper|quiet|under (his|her|their) breath/i.test(m[3] ?? "") };
    });
}

/**
 * One Muse Wonder call: a SAM phrase for each speaker's face, or null if off-panel.
 * `missed` lists phrases that found nothing on an earlier pass, so the retry
 * asks differently instead of repeating them.
 */
async function faceQueries(
  panelPath: string,
  speakers: Character[],
  missed: Record<string, string> = {},
): Promise<Record<string, string>> {
  const roster = speakers
    .map((c) => `- ${c.name}: ${[c.traits.age, c.traits.hair, c.traits.distinctive].filter(Boolean).join(", ")}`)
    .join("\n");
  const reply = await askWonder(
    [
      "A segmentation model will look for each character in this comic panel. Ask for their FACE",
      "when it is visible — the face only, not hair or hat, so the area kept clear stays small.",
      "Ask for the back of their head ONLY when they are turned away (a speaker seen from behind",
      "still talks). It takes a short English noun phrase (3 to 6 words) and returns the single",
      "best match, so each phrase must tell this character apart from the others (e.g. 'face of",
      "the old man with mustache', 'back of the curly-haired woman's head'). Only a character who",
      "is not in the panel at all gets null.",
      "",
      "Characters:",
      roster,
      Object.keys(missed).length
        ? `\nThese phrases found nothing — describe those characters differently: ${JSON.stringify(missed)}`
        : "",
      "",
      'Answer with strict JSON only: {"<name>": "phrase or null", ...}',
    ].join("\n"),
    [panelPath],
  );
  const raw = extractJson(reply);
  const out: Record<string, string> = {};
  for (const c of speakers) {
    const q = str(raw[c.name]).trim();
    if (q && q.toLowerCase() !== "null") out[c.name] = q;
  }
  return out;
}

// ── text ────────────────────────────────────────────────────────────────────

let fontCache: opentype.Font | null = null;
function font(): opentype.Font {
  fontCache ??= opentype.loadSync(join(process.cwd(), "assets", "fonts", "ComicNeue-Bold.ttf"));
  return fontCache;
}

/**
 * One line of Comic Neue as SVG path data, centred on `cx`. Glyph outlines, not
 * <text>: the server that renders the reel may have no fonts installed.
 */
export function centredTextPath(text: string, cx: number, baseline: number, size: number): string {
  const width = font().getAdvanceWidth(text, size);
  return font().getPath(text, cx - width / 2, baseline, size).toPathData(2);
}

/**
 * Wrap, then rebalance: narrow the measure for as long as the line count holds,
 * so "Grandpa! I brought your / lunch!" becomes "Grandpa! I brought / your lunch!".
 * A lone word on the last line reads as a mistake.
 */
function wrap(text: string, size: number, maxWidth: number): string[] {
  let lines = greedyWrap(text, size, maxWidth);
  if (lines.length < 2) return lines;
  for (let w = maxWidth * 0.95; w > maxWidth * 0.4; w *= 0.95) {
    const tighter = greedyWrap(text, size, w);
    if (tighter.length !== lines.length) break;
    lines = tighter;
  }
  return lines;
}

function greedyWrap(text: string, size: number, maxWidth: number): string[] {
  const f = font();
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && f.getAdvanceWidth(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── layout ──────────────────────────────────────────────────────────────────

interface Placed {
  line: Line;
  box: Box;
  lines: string[];
  fontSize: number;
  /** Face the tail points at; absent for narration. */
  target?: Box;
  tail?: Tail;
}

const overlaps = (a: Box, b: Box, gap = 0) =>
  a.x1 < b.x2 + gap && a.x2 + gap > b.x1 && a.y1 < b.y2 + gap && a.y2 + gap > b.y1;

const grow = (b: Box, by: number): Box => ({ x1: b.x1 - by, y1: b.y1 - by, x2: b.x2 + by, y2: b.y2 + by });

/** Points along a tail, for collision checks. */
function tailPoints(t: Tail): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 1; i <= 12; i++) {
    const k = i / 12;
    pts.push([t.baseX + (t.tipX - t.baseX) * k, t.edgeY + (t.tipY - t.edgeY) * k]);
  }
  return pts;
}
const inside = ([x, y]: [number, number], b: Box) => x > b.x1 && x < b.x2 && y > b.y1 && y < b.y2;

/** How many partial layouts survive each step of the search. */
const BEAM_WIDTH = 6;

/**
 * Place every line, in order, without painting later lines into a corner.
 *
 * The first version placed bubbles one at a time, each taking its own best
 * spot. Measured: when the first speaker's head filled the top corner, their
 * bubble landed mid-frame, and reading order then forced the second speaker's
 * bubble to the bottom with a tail across their chest. A letterer lays the page
 * out as a whole, so this keeps the BEAM_WIDTH best partial layouts at each
 * step and returns the cheapest complete one.
 *
 * A spot is legal when it clears every face, the story object, every bubble and
 * tail already placed, and reads after the previous bubble. Among legal spots
 * the cost prefers: short tails, close to and above the speaker, high in the
 * frame, and not on top of the space another speaker needs.
 */
export function layoutBubbles(
  lines: Line[],
  faces: Map<string, Box>,
  obstacles: Box[],
  width: number,
  height: number,
): Placed[] {
  let beam: Array<{ placed: Placed[]; cost: number }> = [{ placed: [], cost: 0 }];
  for (const line of lines) {
    const next: Array<{ placed: Placed[]; cost: number }> = [];
    for (const state of beam) {
      for (const option of bubbleOptions(line, state.placed, lines, faces, obstacles, width, height)) {
        next.push({ placed: [...state.placed, option.placed], cost: state.cost + option.score });
      }
    }
    beam = next.sort((a, b) => a.cost - b.cost).slice(0, BEAM_WIDTH);
  }
  return beam[0]?.placed ?? [];
}

/** The best few legal spots for one line, given what is already on the panel. */
function bubbleOptions(
  line: Line,
  placed: Placed[],
  allLines: Line[],
  faces: Map<string, Box>,
  obstacles: Box[],
  width: number,
  height: number,
): Array<{ placed: Placed; score: number }> {
  const margin = width * 0.03;
  const fontSize = Math.round(width * 0.04);
  const pad = fontSize * 0.75;
  const lineHeight = fontSize * 1.18;
  const blocked = [...[...faces.values()].map((f) => grow(f, width * 0.015)), ...obstacles];
  const speakerFaces = [...new Set(allLines.map((l) => l.speaker).filter((s): s is string => !!s))]
    .map((s) => faces.get(s))
    .filter((f): f is Box => !!f);

  const target = line.speaker ? faces.get(line.speaker) : undefined;
  const maxText = width * 0.5 - pad * 2;
  const textLines = wrap(line.text, fontSize, maxText);
  const textWidth = Math.max(...textLines.map((l) => font().getAdvanceWidth(l, fontSize)));
  const w = Math.min(width - margin * 2, Math.max(width * 0.26, textWidth + pad * 2));
  const h = textLines.length * lineHeight + pad * 1.6;
  const prev = placed[placed.length - 1];
  const prevH = prev ? prev.box.y2 - prev.box.y1 : 0;

  /**
   * Comic reading order is left to right, then down. The next bubble reads
   * after the previous one if it sits clearly BELOW it, or roughly level with
   * it and to its RIGHT. Allowing only "below" (the first version) pushed a
   * right-hand speaker's bubble to the bottom of the frame with a tail across
   * their chest, just because the left-hand speaker happened to talk first.
   */
  // "Below" means mostly under it, not a few pixels lower: measured, a bubble
  // half a line lower and to the LEFT was read first.
  const readsAfterPrev = (box: Box) =>
    !prev || box.y1 >= prev.box.y2 - prevH * 0.3 || (box.x1 >= prev.box.x2 && box.y1 >= prev.box.y1 - prevH * 0.25);

  const found: Array<{ box: Box; score: number }> = [];
  const startY = prev ? Math.max(margin, prev.box.y1 - prevH * 0.25) : margin;
  for (let y = startY; y + h <= height * 0.82; y += height * 0.012) {
    for (let x = margin; x + w <= width - margin; x += width * 0.02) {
      const box = { x1: x, y1: y, x2: x + w, y2: y + h };
      if (!readsAfterPrev(box)) continue;
      if (blocked.some((b) => overlaps(box, b))) continue;
      if (placed.some((p) => overlaps(box, p.box, width * 0.015))) continue;
      // A bubble may not sit on a tail already drawn…
      if (placed.some((p) => p.tail && tailPoints(p.tail).some((pt) => inside(pt, box)))) continue;

      let score = (y / height) * 0.35; // higher in the frame reads first
      if (target) {
        // …and its own tail may not cross another bubble. Measured: one did,
        // and cut through the other speaker's words.
        const tail = tailGeometry(box, target, height);
        if (placed.some((p) => tailPoints(tail).some((pt) => inside(pt, p.box)))) continue;
        score += (Math.hypot(tail.tipX - tail.baseX, tail.tipY - tail.edgeY) / height) * 1.2;
        const cx = (target.x1 + target.x2) / 2;
        score += (Math.abs(x + w / 2 - cx) / width) * 1.0; // near the speaker
        // Above the head is best, beside it is fine, below it reads as wrong.
        if (box.y2 <= target.y1) score += ((target.y1 - box.y2) / height) * 0.8;
        else if (box.y1 >= target.y2) score += 0.9;
        else score += 0.3;
      }
      // The space right above another speaker is where THEIR bubble belongs.
      // Measured: taking it pushed the second speaker's line to the bottom of
      // the frame with a tail across their chest.
      for (const other of speakerFaces) {
        if (other === target) continue;
        const sharesColumn = box.x1 < other.x2 && box.x2 > other.x1;
        if (sharesColumn && box.y2 <= other.y1) score += 0.5;
      }
      found.push({ box, score });
    }
  }

  const make = (box: Box): Placed => ({
    line,
    box,
    lines: textLines,
    fontSize,
    target,
    tail: target ? tailGeometry(box, target, height) : undefined,
  });

  if (found.length === 0) {
    // Nowhere clear: accept an overlap rather than drop the line.
    const top = prev ? prev.box.y2 + margin : margin;
    return [{ placed: make({ x1: margin, y1: top, x2: margin + w, y2: top + h }), score: 5 }];
  }
  // Keep spots that are genuinely different, not six neighbours of one.
  const picks: Array<{ box: Box; score: number }> = [];
  for (const c of found.sort((a, b) => a.score - b.score)) {
    if (picks.some((p) => Math.abs(p.box.x1 - c.box.x1) < width * 0.1 && Math.abs(p.box.y1 - c.box.y1) < height * 0.05)) continue;
    picks.push(c);
    if (picks.length === BEAM_WIDTH) break;
  }
  return picks.map((c) => ({ placed: make(c.box), score: c.score }));
}

// ── render ──────────────────────────────────────────────────────────────────

interface Tail {
  d: string;
  baseX: number;
  half: number;
  edgeY: number;
  tipX: number;
  tipY: number;
}

function tailGeometry(b: Box, face: Box, height: number): Tail {
  const cx = (face.x1 + face.x2) / 2;
  // The tail leaves from the edge facing the head: bottom if the head sits lower.
  const below = (face.y1 + face.y2) / 2 >= (b.y1 + b.y2) / 2;
  const edgeY = below ? b.y2 : b.y1;
  const radius = (b.y2 - b.y1) * 0.3;
  const baseX = Math.min(Math.max(cx, b.x1 + radius + 30), b.x2 - radius - 30);
  const half = Math.max(16, (b.x2 - b.x1) * 0.06);
  // Aim at the nearest point of the head — its top when the bubble is above it,
  // its side when the bubble is beside it — stopping just short of it.
  const nx = Math.min(Math.max(baseX, face.x1), face.x2);
  const ny = Math.min(Math.max(edgeY, face.y1), face.y2);
  const back = Math.hypot(nx - baseX, ny - edgeY) || 1;
  let tipX = nx - ((nx - baseX) / back) * 6;
  let tipY = ny - ((ny - edgeY) / back) * 6;
  const maxLen = height * 0.16;
  const dx = tipX - baseX;
  const dy = tipY - edgeY;
  const len = Math.hypot(dx, dy);
  if (len > maxLen) {
    tipX = baseX + (dx / len) * maxLen;
    tipY = edgeY + (dy / len) * maxLen;
  }
  const inset = below ? -3 : 3;
  return {
    d: `M${baseX - half},${edgeY + inset} L${tipX},${tipY} L${baseX + half},${edgeY + inset} Z`,
    baseX,
    half,
    edgeY,
    tipX,
    tipY,
  };
}

function renderSvg(placed: Placed[], width: number, height: number): string {
  const stroke = Math.max(3, Math.round(width * 0.0045));
  const parts: string[] = [];

  for (const p of placed) {
    const { box: b } = p;
    const r = Math.min((b.y2 - b.y1) / 2, p.fontSize * 1.1);
    const narration = !p.target;
    const dash = p.line.whisper ? ` stroke-dasharray="${stroke * 3} ${stroke * 2}"` : "";
    const fill = narration ? "#fff6d8" : "#ffffff";

    const tail = p.tail ?? null;
    parts.push(`<g filter="url(#shadow)">`);
    if (tail) {
      parts.push(`<path d="${tail.d}" fill="${fill}" stroke="#111" stroke-width="${stroke}" stroke-linejoin="round"${dash}/>`);
    }
    parts.push(
      `<rect x="${b.x1}" y="${b.y1}" width="${b.x2 - b.x1}" height="${b.y2 - b.y1}" rx="${narration ? r * 0.25 : r}" fill="${fill}" stroke="#111" stroke-width="${stroke}"${dash}/>`,
    );
    if (tail) {
      // Paint over the body's outline where the tail joins it, so the two read as one shape.
      const seamW = tail.half * 2 - stroke * 2;
      parts.push(`<rect x="${tail.baseX - seamW / 2}" y="${tail.edgeY - stroke}" width="${seamW}" height="${stroke * 2}" fill="${fill}"/>`);
    }
    parts.push(`</g>`);

    const lineHeight = p.fontSize * 1.18;
    const blockTop = (b.y1 + b.y2) / 2 - (p.lines.length * lineHeight) / 2;
    p.lines.forEach((text, i) => {
      const w = font().getAdvanceWidth(text, p.fontSize);
      const x = (b.x1 + b.x2) / 2 - w / 2;
      const baseline = blockTop + lineHeight * i + p.fontSize * 0.92;
      parts.push(`<path d="${font().getPath(text, x, baseline, p.fontSize).toPathData(2)}" fill="#111"/>`);
    });
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
<defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="${Math.round(width * 0.005)}" stdDeviation="${Math.round(width * 0.006)}" flood-opacity="0.28"/></filter></defs>
${parts.join("\n")}
</svg>`;
}

// ── entry point ─────────────────────────────────────────────────────────────

export interface BakeResult {
  outPath: string;
  /** Speakers whose face was not found — their lines became narration. */
  unplaced: string[];
}

/**
 * Bake a panel's dialogue into it.
 *
 * `avoid` holds boxes that must stay clear — the story object, wherever it was
 * found in this panel. The collectible is the one thing a bubble may never hide.
 */
export async function bakeBubbles(
  panelPath: string,
  dialogue: string,
  cast: Character[],
  outPath: string,
  avoid: Box[] = [],
  panelNumber = 0,
): Promise<BakeResult> {
  const { width = 0, height = 0 } = await sharp(panelPath).metadata();
  const lines = parseDialogue(dialogue, cast.map((c) => c.name));
  if (lines.length === 0) {
    await sharp(panelPath).toFile(outPath);
    return { outPath, unplaced: [] };
  }

  const speakers = cast.filter((c) => lines.some((l) => l.speaker === c.name));
  const faces = new Map<string, Box>();
  let missed: Record<string, string> = {};
  // Two passes: one miss is often just a phrase SAM did not match.
  for (let pass = 0; pass < 2; pass++) {
    const pending = speakers.filter((c) => !faces.has(c.name));
    if (pending.length === 0) break;
    const queries = await faceQueries(panelPath, pending, missed);
    missed = {};
    for (const [name, query] of Object.entries(queries)) {
      const hit = await segmentImage(panelPath, query, panelNumber);
      if (!hit) {
        missed[name] = query;
        continue;
      }
      const sx = width / hit.canvas.w;
      const sy = height / hit.canvas.h;
      faces.set(name, { x1: hit.box.x1 * sx, y1: hit.box.y1 * sy, x2: hit.box.x2 * sx, y2: hit.box.y2 * sy });
    }
    if (Object.keys(missed).length === 0) break;
  }

  // A speaker we could not find speaks from off-panel: narration, not a tail to nowhere.
  const unplaced = speakers.map((c) => c.name).filter((n) => !faces.has(n));
  const resolved = lines.map((l) => (l.speaker && !faces.has(l.speaker) ? { ...l, speaker: null } : l));

  const placed = layoutBubbles(resolved, faces, avoid, width, height);
  const svg = renderSvg(placed, width, height);
  await sharp(panelPath).composite([{ input: Buffer.from(svg) }]).png().toFile(outPath);
  return { outPath, unplaced };
}
