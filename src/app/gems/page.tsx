import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { collectionsOf, getComic } from "@/lib/store";
import { comicPath, fileUrl } from "@/lib/urls";
import { TopBar } from "@/components/TopBar";
import { GemShelf, type ShelfGem } from "@/components/GemShelf";

export const dynamic = "force-dynamic";

/** The reader's collection: every gem they hold, with its number. */
export default async function GemsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const mine = await collectionsOf(user.id);
  const items = (
    await Promise.all(mine.map(async (c) => ({ c, comic: await getComic(c.comicId).catch(() => null) })))
  ).filter((x) => x.comic !== null);
  const gems: ShelfGem[] = items.map(({ c, comic }) => ({
    comicId: c.comicId,
    name: comic!.gem.name,
    number: c.number,
    supply: comic!.gem.supply,
    collectedAt: c.at,
    seriesTitle: comic!.seriesTitle,
    chapterTitle: comic!.chapterTitle,
    image: fileUrl(c.comicId, comic!.gem.revealed, 360),
    imageLarge: fileUrl(c.comicId, comic!.gem.revealed, 1080),
    comicHref: comicPath(c.comicId),
    lines: comic!.gem.revealedLines,
  }));

  return (
    <>
      <TopBar user={user} />
      <main className="feed">
        <section className="card">
          <h1 style={{ margin: "0 0 4px", fontSize: 24 }}>My Gems</h1>
          <p className="muted" style={{ margin: "0 0 16px" }}>
            {items.length === 0
              ? "Nothing yet. Every comic hides one — collect it to read what it says."
              : `${items.length} collected`}
          </p>
          <GemShelf gems={gems} />
        </section>
      </main>
    </>
  );
}
