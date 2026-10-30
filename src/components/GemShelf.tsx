"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface ShelfGem {
  comicId: string;
  name: string;
  number: number;
  supply: number;
  collectedAt: string;
  seriesTitle: string;
  chapterTitle: string;
  image: string;
  imageLarge: string;
  comicHref: string;
  lines: string[];
}

/**
 * The reader's gems. A tile opens the gem itself — big, with what it says and
 * which copy is theirs — not the comic: the comic is one tap further, for when
 * they want to remember where it came from.
 */
export function GemShelf({ gems }: { gems: ShelfGem[] }) {
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
    <>
      <div className="gems-grid">
        {gems.map((g, i) => (
          <button key={g.comicId} type="button" className="gem-tile" onClick={() => setOpen(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.image} alt="" />
            <strong>{g.name}</strong>
            <span className="muted small">
              #{g.number} of {g.supply} · {g.chapterTitle}
            </span>
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
            <img key={gem.imageLarge} className="gem-modal-art" src={gem.imageLarge} alt={gem.name} />
            <div className="gem-modal-info">
              <span className="gem-label">In your collection</span>
              <h2 className="gem-headline">{gem.name}</h2>
              <p className="gem-number">
                You hold #{gem.number} of {gem.supply}
              </p>
              <p className="gem-modal-meta">
                From <em>{gem.seriesTitle}</em> — {gem.chapterTitle}
                <br />
                Collected {new Date(gem.collectedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
              {gem.lines.length > 0 && <p className="gem-lines">{gem.lines.join("\n")}</p>}
              <Link href={gem.comicHref} className="gem-cta">
                Read the comic it came from
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
    </>
  );
}
