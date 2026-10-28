"use client";

import { useRef, useState } from "react";

/**
 * The comic as a swipeable row of vertical panels — the gesture a carousel post
 * already taught everyone. Slots without a source are panels still being drawn.
 */
export function PanelStrip({ panels, total, alt }: { panels: Array<string | null>; total?: number; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const count = total ?? panels.length;
  const slots = Array.from({ length: count }, (_, i) => panels[i] ?? null);

  const onScroll = () => {
    const el = ref.current;
    if (!el || !el.firstElementChild) return;
    const step = (el.firstElementChild as HTMLElement).offsetWidth + 8;
    setCurrent(Math.min(count - 1, Math.round(el.scrollLeft / step)));
  };

  return (
    <>
      <div className="strip" ref={ref} onScroll={onScroll}>
        {slots.map((src, i) =>
          src ? (
            <div className="strip-panel" key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="appear" src={src} alt={`${alt}, panel ${i + 1} of ${count}`} loading={i === 0 ? "eager" : "lazy"} />
            </div>
          ) : (
            <div className="strip-panel pending" key={i} aria-label={`Panel ${i + 1} is being drawn`}>
              Panel {i + 1}
            </div>
          ),
        )}
      </div>
      <div className="dots" aria-hidden="true">
        {slots.map((_, i) => (
          <span key={i} className={i === current ? "dot on" : "dot"} />
        ))}
      </div>
    </>
  );
}
