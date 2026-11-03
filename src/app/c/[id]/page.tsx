import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME, gemTitle } from "@/lib/brand";
import { isGuest } from "@/lib/auth";
import { currentUser } from "@/lib/session";
import { collectedCount, findCollection, getComic, getStatus } from "@/lib/store";
import { PANEL_COUNT } from "@/lib/writeScript";
import { comicPath, facebookShareUrl, fileUrl, siteUrl } from "@/lib/urls";
import { GemCard } from "@/components/GemCard";
import { ProgressView } from "@/components/ProgressView";
import { TopBar } from "@/components/TopBar";
import { ShareReelButton } from "@/components/ShareReelButton";
import { Avatar, ShareIcon, timeAgo } from "@/components/ui";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  return getComic(id).catch(() => null);
}

/** What Facebook and X show when the page is shared: the comic's cover, with its title and story. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const comic = await load((await params).id);
  if (!comic) return { title: APP_NAME };
  const title = `${comic.chapterTitle} — ${comic.seriesTitle}`;
  const image = `${siteUrl()}${fileUrl(comic.id, comic.cover ?? comic.panels[0], 1080)}&f=jpg`;
  return {
    title: `${title} · ${APP_NAME}`,
    description: `${comic.logline} A gem is hidden in this story.`,
    openGraph: {
      title,
      description: `${comic.logline} A gem is hidden in this story — collect it to read what it says.`,
      url: siteUrl() + comicPath(comic.id),
      siteName: APP_NAME,
      type: "article",
      images: [{ url: image, width: 1080, height: 1620, alt: `The cover of ${comic.chapterTitle}` }],
    },
    // X shows a large picture only when asked to.
    twitter: {
      card: "summary_large_image",
      title,
      description: `${comic.logline} A gem is hidden in this story.`,
      images: [image],
    },
  };
}

export default async function ComicPage({ params }: Params) {
  const { id } = await params;
  const [user, comic] = await Promise.all([currentUser(), load(id)]);

  if (!comic) {
    const status = /^[a-z0-9-]+$/.test(id) ? await getStatus(id).catch(() => null) : null;
    // A deleted comic leaves only a tombstone behind.
    if (!status || status.state === "deleted") notFound();
    return (
      <>
        <TopBar user={user} />
        <main className="feed">
          <ProgressView id={id} total={PANEL_COUNT} />
        </main>
      </>
    );
  }

  const [collected, mine] = await Promise.all([
    collectedCount(id),
    user ? findCollection(id, user.id) : Promise.resolve(null),
  ]);
  const isAuthor = user?.id === comic.author.id;
  const canRead = mine !== null;

  return (
    <>
      <TopBar user={user} />
      <main className="feed">
        <article className="post">
          <div className="post-head">
            <Avatar name={comic.author.name} image={comic.author.image} />
            <div className="post-head-text">
              <span className="post-author">
                <span translate="no">{comic.author.name}</span> <span>made a comic</span>
              </span>
              <span className="post-meta">
                {timeAgo(comic.createdAt)} · {comic.seriesTitle}
              </span>
            </div>
          </div>
          <div className="post-body">
            <h1 className="post-title" style={{ fontSize: 22 }}>
              {comic.chapterTitle}
            </h1>
            {comic.logline}
          </div>

          {/* Read top to bottom, like a webtoon: one panel per screen on a phone. The cover
              stays in the feed and the reel — opening the comic from it starts the story. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {comic.panels.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p}
                src={fileUrl(comic.id, p, 1080)}
                alt={`${comic.chapterTitle}, panel ${i + 1} of ${comic.panels.length}`}
                style={{ width: "100%", aspectRatio: "9 / 16", objectFit: "cover" }}
                loading={i === 0 ? "eager" : "lazy"}
              />
            ))}
          </div>

          <div className="actions" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <ShareReelButton
              src={fileUrl(comic.id, comic.reel)}
              filename={`${comic.chapterTitle.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "tales"}.mp4`}
              title={`${comic.chapterTitle} — ${comic.seriesTitle}`}
            />
            {isGuest(user?.id) ? (
              <p className="guest-share-note">Sign in with Facebook to post the link.</p>
            ) : (
              <a href={facebookShareUrl(comic.id)} className="action" target="_blank" rel="noopener noreferrer">
                <ShareIcon /> Post link to Facebook
              </a>
            )}
          </div>
        </article>

        <GemCard
          comicId={comic.id}
          gemName={gemTitle(comic.gem.name)}
          teaserSrc={fileUrl(comic.id, comic.gem.teaser, 1080)}
          revealedSrc={fileUrl(comic.id, comic.gem.revealed, 1080)}
          backdropSrc={fileUrl(comic.id, comic.gem.teaser, 360)}
          supply={comic.gem.supply}
          collected={collected}
          myNumber={mine?.number ?? null}
          isAuthor={isAuthor}
          signedIn={user !== null}
          revealedLines={canRead ? comic.gem.revealedLines : null}
        />
      </main>
    </>
  );
}
