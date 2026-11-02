import { Fragment, type ReactNode } from "react";
import { APP_NAME } from "@/lib/brand";

/**
 * Names that a browser's automatic translation must leave alone. Chrome turned
 * "Tales" into "Cuentos" on a reader's phone; "Muse Wonder" would come back as
 * something like "Maravilla de la musa". The rest of the page still translates —
 * that is what lets a Spanish speaker read the buttons.
 */
export function N({ children }: { children: ReactNode }) {
  return <span translate="no">{children}</span>;
}

/** The product's name, never translated. */
export function Brand() {
  return <N>{APP_NAME}</N>;
}

const NAMES = /(Muse Spark|Muse Image|Muse Wonder|SAM 3\.1|Facebook|Tales)/;

/** A sentence held in a string, with the names in it kept as they are. */
export function keepNames(text: string): ReactNode {
  return text.split(NAMES).map((part, i) => (i % 2 === 1 ? <N key={i}>{part}</N> : <Fragment key={i}>{part}</Fragment>));
}
