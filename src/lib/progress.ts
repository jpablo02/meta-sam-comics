/**
 * How far along a comic is, as a percentage the reader can watch.
 *
 * Steps are weighted by how long they really take, not counted equally: the
 * four panels are most of the seven minutes, the script and the dialogue a few
 * seconds each. Where a step starts, measured on the test batches:
 */
const STARTS: Record<string, number> = {
  script: 0,
  portraits: 8,
  panels: 20,
  cover: 60,
  object: 66,
  dialogue: 76,
  contents: 84,
  collectible: 87,
  reel: 95,
  done: 100,
};

export function percentOf(step: string, detail?: string): number {
  const start = STARTS[step] ?? 0;
  // "2/4" while drawing the second panel: the first is done.
  const panel = step === "panels" ? detail?.match(/^(\d+)\/(\d+)/) : null;
  if (panel) return Math.round(start + ((Number(panel[1]) - 1) / Number(panel[2])) * (STARTS.cover - start));
  return start;
}
