import Link from "next/link";
import { availableProviders, isGuest } from "@/lib/auth";
import { currentUser } from "@/lib/session";
import { collectedCount, listComics } from "@/lib/store";
import { ComicCover } from "@/components/ComicCover";
import { Landing } from "@/components/Landing";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/ui";
import { SignOutButton } from "./sign-in-buttons";

export const dynamic = "force-dynamic";

/** Signed out: the pitch. Signed in: the feed. */
export default async function Home() {
  const [user, comics] = await Promise.all([currentUser(), listComics()]);

  if (!user) {
    const example = comics.find((c) => c.author.id === "demo") ?? comics[0];
    return <Landing providers={availableProviders()} exampleId={example?.id} />;
  }

  const counts = await Promise.all(comics.map((c) => collectedCount(c.id)));
  const firstName = user.name.split(/\s+/)[0];

  return (
    <>
      <TopBar user={user} />
      <main className="feed">
        <section className="card composer">
          <Avatar name={user.name} image={user.image} />
          <Link href="/create" className="composer-fake">
            What&apos;s your story, {firstName}?
          </Link>
        </section>

        {comics.map((c, i) => (
          <ComicCover key={c.id} comic={c} collected={counts[i]} canShare={!isGuest(user.id)} />
        ))}

        <div className="footer-links">
          <a href="/how-it-works">How it works</a> · <a href="/privacy">Privacy</a> · <a href="/data-deletion">Data deletion</a> · <SignOutButton />
        </div>
      </main>
    </>
  );
}
