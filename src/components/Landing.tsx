import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { SignInButtons } from "@/app/sign-in-buttons";

/**
 * Golden motes rising from the open book: the gems hidden in every story.
 * Fixed positions and timings, not random — the server and the browser must
 * render the same markup.
 */
const MOTES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + ((i * 7) % 4),
  delay: -((i * 1.7) % 14),
  duration: 10 + ((i * 3) % 9),
  drift: ((i % 5) - 2) * 14,
}));

/**
 * The front door, signed out. Many worlds spilling out of one open book —
 * every idea fits — with the pitch in the light at its centre.
 */
export function Landing({ providers, exampleId }: { providers: Array<"facebook" | "google">; exampleId?: string }) {
  return (
    <main className="landing">
      <picture className="landing-art" aria-hidden="true">
        <source media="(orientation: portrait)" srcSet="/landing/hero-tall.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/hero-wide.webp" alt="" fetchPriority="high" />
      </picture>
      <div className="landing-shade" aria-hidden="true" />
      <div className="landing-motes" aria-hidden="true">
        {MOTES.map((m, i) => (
          <span
            key={i}
            style={
              {
                left: `${m.left}%`,
                width: m.size,
                height: m.size,
                animationDelay: `${m.delay}s`,
                animationDuration: `${m.duration}s`,
                "--drift": `${m.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="landing-content">
        <h1 className="landing-title">{APP_NAME}</h1>
        <p className="landing-tagline">{APP_TAGLINE}</p>
        <p className="landing-sub">Turn your ideas into comics. Share them and watch your followers collect them.</p>

        <div className="landing-actions">
          <SignInButtons providers={providers} />
          {exampleId && (
            <Link href={`/c/${exampleId}`} className="landing-example">
              See an example first
            </Link>
          )}
        </div>
      </div>

      <footer className="landing-legal">
        <a href="/how-it-works">How it works</a> · <a href="/privacy">Privacy</a> · <a href="/data-deletion">Data deletion</a>
      </footer>
    </main>
  );
}
