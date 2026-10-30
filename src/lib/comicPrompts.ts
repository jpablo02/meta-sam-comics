/**
 * How to ask an image model for a comic that holds together.
 *
 * Ported from Token Comic (tokencomic.us), where every rule below was paid for
 * with a round of real chapters coming back wrong. The short version of what
 * those rounds taught:
 *
 *  - Text alone never holds a face across independent generations. Each
 *    character gets a full-body PORTRAIT once, and every panel receives the
 *    portraits of the characters actually in it as reference images.
 *  - References that arrive unlabelled are read as style inspiration. The prompt
 *    has to say what the attachments are and that they win.
 *  - The character sheet goes BEFORE the scene, and the scene loses any clothing
 *    or hair it invented — otherwise two instructions contradict each other and
 *    the model flips a coin per panel.
 *  - Name the invariants exhaustively, and name what MAY change (pose, angle,
 *    light). A legitimate outlet steers better than prohibition alone.
 *  - Comic models love drawing pages, grids, bubbles and captions. Ask for one
 *    silent full-bleed illustration, positively, and put the exclusions last.
 */

export interface CharacterTraits {
  age?: string;
  build?: string;
  skin?: string;
  hair?: string;
  eyes?: string;
  outfit?: string;
  distinctive?: string;
}

export interface Character {
  name: string;
  traits: CharacterTraits;
  /** Free prose; rides along after the discrete traits, never instead of them. */
  appearance?: string;
}

export interface Location {
  name: string;
  description: string;
}

export interface PanelScene {
  panelNumber: number;
  /** Camera, action, mood. Must NOT describe how characters look. */
  imagePrompt: string;
  characters: string[];
  location?: string;
}

export interface StoryObject {
  name: string;
  description: string;
  /** Real size against a hand ("about 25 cm tall, held in one hand"). */
  scale?: string;
  /** Panels where the object appears, 1-based. */
  plantedInPanels: number[];
}

export interface ComicBible {
  artStyle: string;
  characters: Character[];
  locations: Location[];
  storyObject?: StoryObject;
}

/** What a comic model draws when it hears "comic". Excluded on every panel. */
const LAYOUT_EXCLUSIONS =
  "caption boxes, narration boxes, title boxes, text panels, speech bubbles, speech " +
  "balloons, thought bubbles, comic panel borders, gutters, multi-panel grid, page " +
  "layout, captions, labels, watermarks, signatures, logos, emoji, white frame, white " +
  "border, picture frame, margins around the image";

/** Stray lettering. Excluded everywhere EXCEPT on a panel showing the story object. */
const TEXT_EXCLUSIONS = "any text, letters, words, numbers, gibberish characters";

/** Sent last, as an exclusion list rather than a sentence to reason about. */
export const NEGATIVE_PROMPT = `${LAYOUT_EXCLUSIONS}, ${TEXT_EXCLUSIONS}`;

function renderCharacter(c: Character): string {
  const t = c.traits;
  const attrs = [
    t.age && `age: ${t.age}`,
    t.build && `build: ${t.build}`,
    t.skin && `skin: ${t.skin}`,
    t.hair && `hair: ${t.hair}`,
    t.eyes && `eyes: ${t.eyes}`,
    t.outfit && `outfit: ${t.outfit}`,
    t.distinctive && `distinctive features: ${t.distinctive}`,
  ].filter(Boolean);
  const prose = c.appearance?.trim();
  return `[CHARACTER SHEET] ${c.name} — ${attrs.join(", ")}${prose ? `; ${prose}` : ""}`;
}

function fidelityDirective(): string {
  return (
    "CHARACTER FIDELITY IS CRITICAL — the characters in [CHARACTER SHEET] are ORIGINAL " +
    "characters of this comic. Render each one EXACTLY as their sheet says (same face, " +
    "hair cut and color, eye color, skin tone, build, outfit and distinctive features) so " +
    "they are recognisably the SAME person in every image. These names do NOT refer to any " +
    "existing franchise or celebrity. SKIN TONE and BODY TYPE are fixed identity. " +
    "WARDROBE AND HAIR ARE LOCKED: same garments, colors, accessories and hair length in " +
    "every panel; permanent marks (tattoos, scars) appear identically every time. " +
    "ONLY these may change from panel to panel: pose, gesture, facial expression, camera " +
    "angle and distance, lighting and the surrounding environment"
  );
}

/** Prompt for one character's full-body identity reference. */
export function portraitPrompt(character: Character, bible: ComicBible): string {
  return [
    bible.artStyle,
    "Character reference sheet of ONE single character: FULL BODY from head to feet, " +
      "standing upright facing the viewer, arms relaxed, neutral expression, evenly lit, on " +
      "a plain flat neutral background. The entire body inside the frame; the face clearly " +
      "visible and in sharp focus",
    fidelityDirective(),
    renderCharacter(character),
    "Render the character's real body proportions exactly as described — do not idealise",
    "This is a reference sheet, not a story panel: exactly ONE person, no scenery, no " +
      "props, no action, no text, no labels",
  ].join(". ");
}

/**
 * Prompt for the story object's reference sheet — the object's portrait.
 *
 * Without it, every panel drew the object from a sentence: the green bottle
 * changed size from panel to panel, and in one its rolled letter sat on top of
 * the cork instead of inside the glass. A sentence leaves room for that; pixels
 * do not. Drawn once, passed to every panel that plants it — as the character
 * portraits are.
 */
export function objectSheetPrompt(object: StoryObject, bible: ComicBible): string {
  return [
    bible.artStyle,
    `Object reference sheet of ONE single object: ${object.name} — ${object.description}`,
    "Shown whole and intact, in three-quarter view, centred, evenly lit, on a plain flat " +
      "neutral background, filling most of the frame, in sharp focus",
    "Every part in its real place, the way the physical object is assembled: what is inside " +
      "something is visibly INSIDE it, what closes it closes it, nothing floating or detached",
    object.scale ? `Real size: ${object.scale} — draw its true proportions` : "",
    "Any writing on it is present but too small or faint to read",
    "This is a reference sheet, not a story panel: exactly ONE object, no hands, no people, " +
      "no scenery, no labels, no captions",
  ]
    .filter(Boolean)
    .join(". ");
}

export interface CoverInput {
  artStyle: string;
  logline: string;
  /** The cast on the cover, in the order their portraits are attached. */
  cast: Character[];
  gemName: string;
  /** Where the story happens, for the backdrop. */
  setting?: string;
  /** Whether the gem's reference image is attached after the portraits. */
  withGemReference: boolean;
}

/**
 * Prompt for the comic's cover — its own image, not a panel. It sells the
 * story the way a cover does: the cast, the world, and the gem catching the
 * light somewhere in it. The title is laid over it by the app, never drawn:
 * lettering in the art would be one more thing to get wrong.
 *
 * The cast is described in words too, as on a panel. With names alone the
 * portraits were ignored: the demo's cover came back with a stranger in a cap
 * where Ramiro and his sombrero vueltiao should be — twice.
 */
export function coverPrompt(c: CoverInput): string {
  const refs: string[] = [];
  if (c.cast.length > 0) {
    refs.push(
      `The ${c.withGemReference ? `first ${c.cast.length} attached images are` : "attached images are"} ` +
        `IDENTITY REFERENCES of the cast, one per image, in this order: ${c.cast.map((p) => p.name).join(", ")}. ` +
        "They are NOT style inspiration. Copy each character exactly — same face, skin tone, hair color, " +
        "length and cut, outfit and build. Take ONLY identity from them. Where the references and any text " +
        "disagree, the REFERENCES WIN",
      fidelityDirective(),
      ...c.cast.map(renderCharacter),
    );
  }
  if (c.withGemReference) {
    refs.push(
      `The ${c.cast.length > 0 ? "LAST attached image" : "attached image"} is the reference of ${c.gemName}: ` +
        "draw that exact object",
    );
  }
  return [
    c.artStyle,
    "A COMIC BOOK COVER illustration — one striking, iconic image that sells the whole story, not a scene from it",
    ...refs,
    `The story: ${c.logline}`,
    c.setting ? `The world behind them: ${c.setting}` : "",
    "The cast in a dramatic, characterful cover pose, larger than life, their faces in the upper half of the frame",
    `${c.gemName} is in the image — held, half-hidden or glinting in the light — intriguing, noticed on a second look, not centre stage`,
    "The bottom fifth is calmer — ground, water, shadow — where a title will be laid over later",
    "Full-bleed vertical cover art filling the whole image edge to edge",
    "Do NOT include any text, title, letters, logos, price, barcode, speech bubbles, panel borders or frame",
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove clothing/hair phrasing a script writer slipped into the scene. */
export function stripAppearance(scene: string): string {
  return scene
    .replace(/\([^)]*(?:jumpsuit|suit|jacket|dress|shirt|hair|gloves?)[^)]*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Prompt for one panel. The portraits of `scene.characters` must be attached as
 * reference images, in the same order as they are named here — followed, when
 * `withObjectSheet` is set, by the story object's reference sheet, LAST.
 */
export function panelPrompt(scene: PanelScene, bible: ComicBible, withObjectSheet = false): string {
  const present = bible.characters.filter((c) =>
    scene.characters.some((n) => n.trim().toLowerCase() === c.name.trim().toLowerCase()),
  );
  const parts: string[] = [bible.artStyle];

  if (present.length > 0) {
    parts.push(
      `The ${withObjectSheet ? `first ${present.length} attached images` : "attached images"} are ` +
        "IDENTITY REFERENCES: full-body reference sheets of the " +
        "characters in this panel, one per image, in this order: " +
        `${present.map((c) => c.name).join(", ")}. They are NOT style inspiration and NOT a ` +
        "layout to copy. Copy each character exactly — same face, skin tone, hair color, " +
        "length and cut, tattoos and marks, apparent age and body proportions. Take ONLY " +
        "identity from them; pose, expression, angle, lighting and setting come from the " +
        "scene. Where the references and any text disagree, the REFERENCES WIN. The names are " +
        "metadata for you — never write them in the image",
    );
    parts.push(fidelityDirective());
    parts.push(...present.map(renderCharacter));
  }

  const sceneText = stripAppearance(scene.imagePrompt);
  parts.push(`[SCENE] ${sceneText}`);
  if (present.length > 0) {
    parts.push(
      "[PRECEDENCE] The character sheets above are the single source of truth for how " +
        "every character LOOKS. If the scene implies clothing or features the sheet does " +
        "not list, ignore it",
    );
  }

  const location = bible.locations.find(
    (l) => l.name.trim().toLowerCase() === scene.location?.trim().toLowerCase(),
  );
  if (location) {
    parts.push(
      `[SET SHEET] ${location.name}: ${location.description}. This must look like the SAME ` +
        "physical place in every panel set here; only angle, framing and light may change",
    );
  }

  /**
   * The object must be SEEN and must not be READ.
   *
   * The first version said "hide its contents: folded, edge-on or obscured",
   * while the exclusion list banned any text at all. Two orders that cannot both
   * hold, and the model settled it by crumpling the report into a ball — no text
   * visible, nothing recognisable either. That wrecks the collectible: SAM needs
   * something to find, and the reader needs to know what they are looking at.
   *
   * So the object keeps its shape and its heading; only the body is withheld,
   * by distance, angle and focus rather than by destroying the object. And on
   * these panels the blanket text exclusion is dropped, so the heading is not
   * fighting the negative prompt.
   */
  const object = bible.storyObject;
  const objectHere = Boolean(object && object.plantedInPanels.includes(scene.panelNumber));
  if (object && objectHere) {
    parts.push(
      `[STORY OBJECT] ${object.name} appears in this panel — ${object.description}. It is ` +
        "clearly visible and keeps its real shape: intact, not crumpled into a ball, held or " +
        "placed so the reader recognises it at once. Only printing the real object would " +
        "carry may be legible — a report's title, a company logo, a route number — never its " +
        `name used as a label ("${object.name}" is how the story refers to it, not text on ` +
        "it, unless it is literally its printed title). Its BODY must stay unreadable — fine " +
        "print or handwriting too small, too far, at an angle or out of focus to make out. " +
        "Show that it has contents; do not let them be read. There is exactly ONE of it in " +
        "the panel — never a second copy lying nearby",
    );
    if (withObjectSheet) {
      parts.push(
        `[OBJECT REFERENCE] The ${present.length > 0 ? "LAST attached image" : "attached image"} is ` +
          `the reference sheet of ${object.name}. Draw THIS exact object: same shape, ` +
          "proportions, materials, colours and wear, every part where the sheet puts it " +
          `(what is inside stays inside, what closes it stays closed)` +
          (object.scale ? `, at its real size — ${object.scale} — next to hands and bodies` : "") +
          ". Take only the object from it; its position, angle and light come from the scene",
      );
    }
  }

  parts.push(
    "Render a SINGLE full-frame comic illustration of this one scene only — not a page, " +
      "not a grid, no panel borders; the artwork fills the whole image edge to edge",
  );
  parts.push(
    objectHere
      ? "No caption box, no narration box and no speech bubbles — the only lettering in " +
          "the frame is what is printed on the story object"
      : "A silent wordless illustration — no caption box, no narration box, no text surfaces",
  );
  parts.push(
    `Do NOT include any of the following: ${objectHere ? LAYOUT_EXCLUSIONS : NEGATIVE_PROMPT}`,
  );

  return parts.join(". ").replace(/\s+/g, " ").trim();
}
