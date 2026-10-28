import Link from "next/link";
import { availableProviders } from "@/lib/auth";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { currentUser } from "@/lib/session";
import { collectedCount, listComics } from "@/lib/store";
import { comicPath, fileUrl } from "@/lib/urls";
import { ComicPost } from "@/components/ComicPost";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/ui";
import { SignInButtons, SignOutButton } from "./sign-in-buttons";

export const dynamic = "force-dynamic";

/** Signed out: the pitch over a real comic. Signed in: the feed. */
export default async function Home() {
  const [user, comics] = await Promise.all([currentUser(), listComics()]);

  if (!user) {
    const showcase = comics[comics.length - 1];
    return (
      <main className="hero">
        {showcase && (
          <div className="hero-art" aria-hidden="true">
            {showcase.panels.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={fileUrl(showcase.id, p, 360)} alt="" />
            ))}
          </div>
        )}
        <div className="hero-content">
          <h1>{APP_NAME}</h1>
          <p>{APP_TAGLINE}</p>
          <div className="glass">
            <span>
              Write an idea in a sentence or two. Get a four-panel comic — and a gem hidden inside it that your
              friends can collect.
            </span>
            <SignInButtons providers={availableProviders()} />
            {showcase && (
              <Link href={comicPath(showcase.id)} style={{ textAlign: "center", fontWeight: 600 }}>
                See one first
              </Link>
            )}
          </div>
          <p className="small" style={{ opacity: 0.7 }}>
            <a href="/privacy">Privacy</a> · <a href="/data-deletion">Data deletion</a>
          </p>
        </div>
      </main>
    );
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
          <ComicPost key={c.id} comic={c} collected={counts[i]} />
        ))}

        <div className="footer-links">
          <a href="/privacy">Privacy</a> · <a href="/data-deletion">Data deletion</a> · <SignOutButton />
        </div>
      </main>
    </>
  );
}
