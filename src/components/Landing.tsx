import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import type { StoredComic } from "@/lib/store";
import { comicPath, fileUrl } from "@/lib/urls";
import { SignInButtons } from "@/app/sign-in-buttons";

const STEPS = [
  { n: "1", title: "Write an idea", body: "A sentence or two, in Spanish or English." },
  { n: "2", title: "Get a comic", body: "Four panels, drawn and lettered for you." },
  { n: "3", title: "Hide a gem", body: "Friends collect it to read what it says." },
];

/**
 * The front door, signed out. Not a comic — the promise: objects from many
 * stories, each one keeping its secret, drifting behind the pitch.
 */
export function Landing({ comics, providers }: { comics: StoredComic[]; providers: Array<"facebook" | "google"> }) {
  const gems = comics.map((c) => fileUrl(c.id, c.gem.teaser, 360));
  // Enough cards to fill the backdrop, whatever the number of comics.
  const cards = gems.length ? Array.from({ length: 8 }, (_, i) => gems[i % gems.length]) : [];
  const example = comics.find((c) => c.author.id === "demo") ?? comics[0];

  return (
    <main className="landing">
      <div className="landing-cards" aria-hidden="true">
        {cards.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className={`landing-card c${i}`} />
        ))}
      </div>
      <div className="landing-glow" aria-hidden="true" />

      <div className="landing-content">
        <span className="landing-chip">Stories with something to keep</span>
        <h1 className="landing-title">{APP_NAME}</h1>
        <p className="landing-tagline">{APP_TAGLINE}</p>
        <p className="landing-sub">
          Turn an idea into a comic. Somewhere in it is an object — a letter, a key, a dagger — that everyone can
          see and only collectors can read.
        </p>

        <ol className="landing-steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="landing-step-n">{s.n}</span>
              <strong>{s.title}</strong>
              <span>{s.body}</span>
            </li>
          ))}
        </ol>

        <div className="landing-actions">
          <SignInButtons providers={providers} />
          {example && (
            <Link href={comicPath(example.id)} className="landing-example">
              See an example first
            </Link>
          )}
        </div>

        <p className="landing-legal">
          <a href="/privacy">Privacy</a> · <a href="/data-deletion">Data deletion</a>
        </p>
      </div>
    </main>
  );
}
