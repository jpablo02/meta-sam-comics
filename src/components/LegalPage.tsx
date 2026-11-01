import Link from "next/link";
import type { Author } from "@/lib/store";
import { TopBar } from "./TopBar";

/**
 * Privacy and data deletion — Facebook Login requires both URLs before the app
 * can go Live. They wear the app's own clothes: a card in the feed, under the
 * same top bar, so a reader who follows the link never feels they left.
 */
export function LegalPage({
  user,
  title,
  updated,
  children,
}: {
  user: Author | null;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <TopBar user={user} />
      <main className="feed">
        <article className="card legal">
          <h1>{title}</h1>
          <p className="legal-updated">Last updated {updated}</p>
          {children}
        </article>
        <nav className="legal-links" aria-label="More">
          <Link href="/how-it-works">How it works</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/data-deletion">Data deletion</Link>
          <Link href="/">Home</Link>
        </nav>
      </main>
    </>
  );
}
