/**
 * The product's name and one-line pitch, in one place.
 *
 * Every page, the metadata and the share text read from here, so renaming is
 * one edit. The collectible is a "gem": a hidden gem inside every story.
 */
export const APP_NAME = "Tales";
export const APP_TAGLINE = "Every story hides a gem.";
export const COLLECTIBLE_NAME = "Gem";

const SMALL_WORDS = new Set(["a", "an", "and", "at", "by", "for", "from", "in", "inside", "of", "on", "or", "the", "to", "with"]);

/**
 * A gem's name as a title: "survived photo" → "Survived Photo", "leather collar
 * with engraved plate" → "Leather Collar with Engraved Plate". The script writer
 * names the object as it would in a sentence; on a card it is a title. Words
 * that already carry a capital ("Mom's", "REX") are left as written.
 */
export function gemTitle(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      if (/[A-Z]/.test(word)) return word;
      if (i > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
