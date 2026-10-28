import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { collectionsOf, getComic } from "@/lib/store";
import { comicPath, fileUrl } from "@/lib/urls";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

/** The reader's collection: every gem they hold, with its number. */
export default async function GemsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const mine = await collectionsOf(user.id);
  const items = (
    await Promise.all(mine.map(async (c) => ({ c, comic: await getComic(c.comicId).catch(() => null) })))
  ).filter((x) => x.comic !== null);

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
          <div className="gems-grid">
            {items.map(({ c, comic }) => (
              <Link key={c.comicId} href={comicPath(c.comicId)} className="gem-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(c.comicId, comic!.gem.revealed, 360)} alt="" />
                <strong>{comic!.gem.name}</strong>
                <span className="muted small">
                  #{c.number} of {comic!.gem.supply} · {comic!.chapterTitle}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
