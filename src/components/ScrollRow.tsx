"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A row that scrolls sideways. A finger swipes it; a mouse gets arrows, which
 * move one screenful and disappear at either end.
 */
export function ScrollRow({ children, label }: { children: ReactNode; label: string }) {
  const row = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const measure = () =>
      setEnds({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      resize.disconnect();
    };
  }, []);

  function page(dir: 1 | -1) {
    const el = row.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="scroll-row">
      <div className="shelf-row" ref={row} role="list" aria-label={label}>
        {children}
      </div>
      {!ends.start && (
        <button type="button" className="row-arrow prev" aria-label={`Scroll ${label} back`} onClick={() => page(-1)}>
          ‹
        </button>
      )}
      {!ends.end && (
        <button type="button" className="row-arrow next" aria-label={`Scroll ${label} forward`} onClick={() => page(1)}>
          ›
        </button>
      )}
    </div>
  );
}
