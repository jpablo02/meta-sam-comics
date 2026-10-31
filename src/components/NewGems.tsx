"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface NewGem {
  comicId: string;
  name: string;
  teaser: string;
  teaserLarge: string;
  seriesTitle: string;
  chapterTitle: string;
  comicHref: string;
  left: number;
  supply: number;
}

/**
 * The newest gems, as circles. A gem means nothing before its story, so a tap
 * does not open the gem: it says which story hides it and sends you to read it.
 */
export function NewGems({ gems }: { gems: NewGem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const gem = open === null ? null : gems[open];

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (gem && !d.open) d.showModal();
    if (!gem && d.open) d.close();
  }, [gem]);

  function step(by: number) {
    setOpen((i) => (i === null ? i : (i + by + gems.length) % gems.length));
  }

  return (
    <section className="shelf-card gem-circles-card">
      <h2 className="shelf-title">New gems</h2>
      <div className="gem-circles">
        {gems.map((g, i) => (
          <button key={g.comicId} type="button" className="gem-circle" onClick={() => setOpen(i)}>
            <span className="gem-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.teaser} alt="" />
            </span>
            <span className="gem-circle-name">{g.name}</span>
          </button>
        ))}
      </div>

      <dialog
        ref={dialog}
        className="gem-modal"
        aria-label={gem?.name}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        onKeyDown={(e) => {
          if (gems.length < 2) return;
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        {gem && (
          <div className="gem-modal-body">
            <button type="button" className="gem-modal-close" aria-label="Close" onClick={() => setOpen(null)}>
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={gem.teaserLarge} className="gem-modal-art" src={gem.teaserLarge} alt={gem.name} />
            <div className="gem-modal-info">
              <span className="gem-label">A gem hides in this story</span>
              <h2 className="gem-headline">{gem.name}</h2>
              <p className="gem-modal-meta">
                It is hidden in <em>{gem.chapterTitle}</em>, from <em>{gem.seriesTitle}</em>. Read the comic to find it,
                then collect it to read what it says.
              </p>
              <p className="gem-number">
                {gem.left > 0 ? `${gem.left} of ${gem.supply} left` : `All ${gem.supply} collected`}
              </p>
              <Link href={gem.comicHref} className="gem-cta">
                Read the comic
              </Link>
              {gems.length > 1 && (
                <div className="gem-modal-nav">
                  <button type="button" onClick={() => step(-1)} aria-label="Previous gem">
                    ←
                  </button>
                  <span>
                    {open! + 1} / {gems.length}
                  </span>
                  <button type="button" onClick={() => step(1)} aria-label="Next gem">
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
