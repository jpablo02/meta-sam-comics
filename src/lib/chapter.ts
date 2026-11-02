/**
 * What a chapter has to tell the models about itself.
 *
 * Deliberately a plain data shape, not a constant baked into the pipeline. It
 * comes straight out of the script that generated the chapter, with its
 * scenes, cast and locations, and the pipeline only sees the shape.
 *
 * It matters more than it looks. Asked to compare two crops with no story
 * around them, a multimodal model answers as a forensic examiner and says two
 * different sheets of paper — correctly. Given the plot, it answers as a reader.
 * And it does not question what it is told: during development a placeholder
 * character name went into this context by mistake, and the model repeated the
 * wrong name back in its reasoning. Context is amplified, not checked.
 */

export interface Scene {
  /** 1-based position in reading order. */
  panelNumber: number;
  location: string;
  characters: string[];
  /** What happens, in prose. */
  description: string;
  /** What is said, if anything. */
  dialogue?: string;
}

export interface Chapter {
  seriesTitle: string;
  chapterTitle: string;
  genre: string;
  tone: string;
  logline: string;
  /** The series' arc, beyond this chapter. Gives the reveal something to point at. */
  synopsis: string;
  scenes: Scene[];
  /** The object readers can collect. Named as the story names it. */
  secretObjectName: string;
  /** Panel images, in reading order. Index matches SAM's panel index. */
  panelPaths: string[];
}

/** One-paragraph brief for the models: who handles the object and what happens to it. */
export function storySummary(chapter: Chapter): string {
  const beats = chapter.scenes
    .map((s) => `Panel ${s.panelNumber} (${s.location}): ${s.description}`)
    .join(" ");
  return `${chapter.logline} ${beats}`;
}
