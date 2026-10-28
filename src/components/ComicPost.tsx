import Link from "next/link";
import type { StoredComic } from "@/lib/store";
import { comicPath, facebookShareUrl, fileUrl } from "@/lib/urls";
import { PanelStrip } from "./PanelStrip";
import { Avatar, BookIcon, GemIcon, PlayIcon, ShareIcon, timeAgo } from "./ui";

/** A comic as a post: author, title, swipeable panels, and its gem waiting below. */
export function ComicPost({ comic, collected }: { comic: StoredComic; collected: number }) {
  const left = Math.max(0, comic.gem.supply - collected);
  const href = comicPath(comic.id);

  return (
    <article className="post">
      <div className="post-head">
        <Avatar name={comic.author.name} image={comic.author.image} />
        <div className="post-head-text">
          <span className="post-author">
            {comic.author.name} <span>made a comic</span>
          </span>
          <span className="post-meta">
            {timeAgo(comic.createdAt)} · {comic.seriesTitle}
          </span>
        </div>
      </div>

      <div className="post-body">
        <h2 className="post-title">
          <Link href={href}>{comic.chapterTitle}</Link>
        </h2>
        {comic.logline}
      </div>

      <PanelStrip panels={comic.panels.map((p) => fileUrl(comic.id, p, 720))} alt={comic.chapterTitle} />

      <Link href={href} className="gem-row">
        <span className="gem-icon">
          <GemIcon />
        </span>
        <span>
          <strong>A gem is hidden in this story.</strong>
          <br />
          {left > 0 ? `${left} of ${comic.gem.supply} left to collect` : "All copies collected"}
        </span>
      </Link>

      <div className="actions">
        <Link href={href} className="action">
          <BookIcon /> Read
        </Link>
        <a href={fileUrl(comic.id, comic.reel)} className="action" download>
          <PlayIcon /> Reel
        </a>
        <a href={facebookShareUrl(comic.id)} className="action" target="_blank" rel="noopener noreferrer">
          <ShareIcon /> Share
        </a>
      </div>
    </article>
  );
}
