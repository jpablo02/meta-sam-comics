import Link from "next/link";
import type { StoredComic } from "@/lib/store";
import { comicPath, fileUrl } from "@/lib/urls";

/** The rows above the feed. Each one is a different door into the same comics. */

export function GemCircles({ comics }: { comics: StoredComic[] }) {
  return (
    <section className="shelf-card gem-circles-card">
      <h2 className="shelf-title">New gems</h2>
      <div className="gem-circles">
        {comics.map((c) => (
          <Link key={c.id} href={`${comicPath(c.id)}#gem`} className="gem-circle">
            <span className="gem-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(c.id, c.gem.teaser, 360)} alt="" />
            </span>
            <span className="gem-circle-name">{c.gem.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function TopFive({ comics }: { comics: StoredComic[] }) {
  return (
    <section className="shelf-card">
      <h2 className="shelf-title">
        Top 5 <span>most collected gems</span>
      </h2>
      <div className="shelf-row">
        {comics.map((c, i) => (
          <Link key={c.id} href={comicPath(c.id)} className="top-item" aria-label={`Number ${i + 1}: ${c.chapterTitle}`}>
            <span className="top-number" aria-hidden="true">
              {i + 1}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl(c.id, c.cover ?? c.panels[0], 360)} alt="" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function NewThisWeek({ comics, title }: { comics: StoredComic[]; title: string }) {
  return (
    <section className="shelf-card">
      <h2 className="shelf-title">{title}</h2>
      <div className="shelf-row">
        {comics.map((c) => (
          <Link key={c.id} href={comicPath(c.id)} className="new-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl(c.id, c.cover ?? c.panels[0], 720)} alt="" />
            <span className="new-title">{c.chapterTitle}</span>
            <span className="new-series">{c.seriesTitle}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
