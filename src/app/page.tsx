import { availableProviders } from "@/lib/auth";
import { gemTitle } from "@/lib/brand";
import { currentUser } from "@/lib/session";
import { collectedCounts, listComics } from "@/lib/store";
import { comicPath, fileUrl } from "@/lib/urls";
import { ComicCover } from "@/components/ComicCover";
import { HeroCarousel } from "@/components/HeroCarousel";
import { Landing } from "@/components/Landing";
import { NewGems } from "@/components/NewGems";
import { NewThisWeek, TopFive } from "@/components/Shelves";
import { TopBar } from "@/components/TopBar";
import { SignOutButton } from "./sign-in-buttons";

export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 24 * 3600 * 1000;

/** Signed out: the pitch. Signed in: a shelf of stories over the feed. */
export default async function Home() {
  const [user, comics] = await Promise.all([currentUser(), listComics()]);

  if (!user) {
    const example = comics.find((c) => c.author.id === "demo") ?? comics[0];
    return <Landing providers={availableProviders()} exampleId={example?.id} />;
  }

  const counts = await collectedCounts();
  const collected = new Map(comics.map((c) => [c.id, counts.get(c.id) ?? 0]));

  // listComics is newest first, and sort is stable: ties stay newest first.
  const mostCollected = [...comics].sort((a, b) => collected.get(b.id)! - collected.get(a.id)!);
  const thisWeek = comics.filter((c) => Date.now() - new Date(c.createdAt).getTime() < WEEK_MS);
  // Too few new ones makes a thin row: then it is simply the latest.
  const fresh = thisWeek.length >= 4 ? thisWeek : comics;

  // Ten turns are enough for a carousel; a dot per comic would not fit a phone.
  const slides = mostCollected.slice(0, 10).map((c) => ({
    href: comicPath(c.id),
    cover: fileUrl(c.id, c.cover ?? c.panels[0], 1080),
    series: c.seriesTitle,
    title: c.chapterTitle,
    logline: c.logline,
  }));
  const newGems = comics.slice(0, 9).map((c) => ({
    comicId: c.id,
    name: gemTitle(c.gem.name),
    teaser: fileUrl(c.id, c.gem.teaser, 360),
    teaserLarge: fileUrl(c.id, c.gem.teaser, 1080),
    seriesTitle: c.seriesTitle,
    chapterTitle: c.chapterTitle,
    comicHref: comicPath(c.id),
    left: Math.max(0, c.gem.supply - collected.get(c.id)!),
    supply: c.gem.supply,
  }));

  return (
    <>
      <TopBar user={user} wide />
      <HeroCarousel slides={slides} />
      <div className="home">
        <aside className="home-side">
          <NewGems gems={newGems} />
        </aside>

        <main className="home-main">
          <TopFive comics={mostCollected.slice(0, 5)} />
          <NewThisWeek comics={fresh.slice(0, 12)} title={fresh === thisWeek ? "New this week" : "Latest stories"} />

          {comics.map((c) => (
            <ComicCover key={c.id} comic={c} collected={collected.get(c.id)!} />
          ))}

          <div className="footer-links">
            <a href="/how-it-works">How it works</a> · <a href="/privacy">Privacy</a> · <a href="/data-deletion">Data deletion</a> · <SignOutButton />
          </div>
        </main>
      </div>
    </>
  );
}
