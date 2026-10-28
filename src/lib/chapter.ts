/**
 * What a chapter has to tell the models about itself.
 *
 * Deliberately a plain data shape, not a constant baked into the pipeline. On
 * Token Comic this comes straight out of the session that generated the
 * chapter, where the agent already stored the scenes, the cast and the
 * locations; here the sample chapter ships one by hand. Either way the pipeline
 * only sees the shape.
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

/**
 * The sample chapter, published on Token Comic in August 2026.
 *
 * Note what the script asked the illustrator for: in the panels where the
 * report appears, its content is explicitly "obscured" and "without being
 * readable". That is not a rendering accident — a Token Comic chapter shows you
 * that the object exists and withholds what it says, and collecting it is what
 * opens it. This pipeline reveals what the script deliberately hid.
 */
export const SAMPLE_CHAPTER: Chapter = {
  seriesTitle: "Encrypted Love",
  chapterTitle: "Elliptic Curve P256",
  genre: "Action and Romance",
  tone: "Dramatic",
  logline:
    "When a critical flaw in the Elliptic Curve P256 encryption threatens to collapse their " +
    "financial world, a crypto trader and his computer-genius girlfriend must join forces to " +
    "save everything — testing both their wits and their growing love.",
  synopsis:
    "As a wave of sophisticated cyberattacks threatens to unravel the digital foundations of " +
    "global finance, brilliant computer genius Zully and daring crypto trader Wesley find " +
    "themselves at the center of a world-shattering crisis. Their extraordinary intellects and " +
    "fiercely growing bond will be tested against unseen enemies and algorithmic chaos.",
  secretObjectName: "P256 Flaw Report",
  scenes: [
    {
      panelNumber: 1,
      location: "Wesley's Penthouse Office",
      characters: ["Wesley"],
      description:
        "Wesley is in his luxurious office, on the phone with a panicked expression while the " +
        "screens in front of him show a crypto market collapse.",
      dialogue:
        "No... This can't be happening! The entire market is... no, not P256. It's supposed to be uncrackable!",
    },
    {
      panelNumber: 2,
      location: "Zully's Tech Lab",
      characters: ["Zully"],
      description:
        "Zully is in her lab, surrounded by screens of code. She holds a printed report, " +
        "examining it with intense concentration. The printout is visible, but its content is obscured.",
      dialogue:
        "Wesley, I've been running simulations. It's not a crack. It's a flaw. A critical one. " +
        "And I just found the first proof of concept.",
    },
    {
      panelNumber: 3,
      location: "Zully's Tech Lab",
      characters: ["Zully", "Wesley"],
      description:
        "Close-up of Zully and Wesley together. She hands him the crumpled printout, their " +
        "fingers almost touching. The document is partially visible, showing faint lines of code " +
        "without being readable.",
      dialogue:
        "This report confirms it. A fundamental vulnerability in the curve itself. Every digital asset is at risk.",
    },
    {
      panelNumber: 4,
      location: "Zully's Tech Lab",
      characters: ["Zully", "Wesley"],
      description:
        "Zully and Wesley look at each other, tension evident, but also a spark of determination " +
        "and mutual support. They are ready to face the challenge together.",
      dialogue: "Then we fix it. Together. We always do.",
    },
  ],
  panelPaths: [
    "public/chapter/panel-0.png",
    "public/chapter/panel-1.png",
    "public/chapter/panel-2.png",
    "public/chapter/panel-3.png",
  ],
};
