import Link from "next/link";
import type { StoredComic } from "@/lib/store";
import { comicPath, fileUrl } from "@/lib/urls";
import { Avatar, BookIcon, GemIcon, timeAgo } from "./ui";

/**
 * A comic in the feed: its cover, not the comic. Reading happens on the comic's
 * own page, top to bottom — the feed only has to make you want to open it.
 * Sharing lives there too, next to the comic it shares.
 */
export function ComicCover({ comic, collected }: { comic: StoredComic; collected: number }) {
  const left = Math.max(0, comic.gem.supply - collected);
  const href = comicPath(comic.id);

  return (
    <article className="post">
      <div className="post-head">
        <Avatar name={comic.author.name} image={comic.author.image} />
        <div className="post-head-text">
          <span className="post-author">
            <span translate="no">{comic.author.name}</span> <span>made a comic</span>
          </span>
          <span className="post-meta">{timeAgo(comic.createdAt)}</span>
        </div>
      </div>

      <div className="post-body">{comic.logline}</div>

      {/* A real cover keeps its upper third calm for the title; a first panel does not. */}
      <Link href={href} className={comic.cover ? "cover has-art" : "cover"} aria-label={`Read ${comic.chapterTitle}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileUrl(comic.id, comic.cover ?? comic.panels[0], 720)} alt="" loading="lazy" />
        <div className="cover-text">
          <span className="cover-series">{comic.seriesTitle}</span>
          <span className="cover-title">{comic.chapterTitle}</span>
          <span className="cover-meta">
            {comic.panels.length} panels · <GemIcon size={14} /> {left > 0 ? `${left} gems left` : "all gems collected"}
          </span>
        </div>
      </Link>

      <div className="actions" style={{ gridTemplateColumns: "1fr" }}>
        <Link href={href} className="action">
          <BookIcon /> Read
        </Link>
      </div>
    </article>
  );
}
