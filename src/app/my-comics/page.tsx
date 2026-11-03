import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { collectedCount, comicsBy } from "@/lib/store";
import { comicPath, fileUrl } from "@/lib/urls";
import { TopBar } from "@/components/TopBar";
import { MyComics, type MyComic } from "@/components/MyComics";

export const dynamic = "force-dynamic";

/** Everything the reader has made, and the way to take any of it down. */
export default async function MyComicsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const comics = await comicsBy(user.id);
  const counts = await Promise.all(comics.map((c) => collectedCount(c.id)));
  const items: MyComic[] = comics.map((c, i) => ({
    id: c.id,
    href: comicPath(c.id),
    cover: fileUrl(c.id, c.cover ?? c.panels[0], 360),
    seriesTitle: c.seriesTitle,
    chapterTitle: c.chapterTitle,
    createdAt: c.createdAt,
    collected: counts[i],
  }));

  return (
    <>
      <TopBar user={user} />
      <main className="feed">
        <section className="card">
          <h1 style={{ margin: "0 0 4px", fontSize: 24 }}>My comics</h1>
          <p className="muted" style={{ margin: "0 0 16px" }}>
            {items.length === 0 ? "You have not made a comic yet." : `${items.length} made`}
          </p>
          {items.length === 0 ? (
            <Link href="/create" className="button">
              Make your first comic
            </Link>
          ) : (
            <MyComics comics={items} />
          )}
        </section>
      </main>
    </>
  );
}
