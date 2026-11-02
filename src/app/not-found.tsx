import Link from "next/link";
import { currentUser } from "@/lib/session";
import { TopBar } from "@/components/TopBar";

/** A broken or mistyped link: still inside Tales, with a way back. */
export default async function NotFound() {
  const user = await currentUser().catch(() => null);
  return (
    <>
      <TopBar user={user} />
      <main className="feed">
        <section className="card notice">
          <span className="notice-mark" aria-hidden="true">?</span>
          <h1>This page isn&apos;t here</h1>
          <p className="muted">The link may be mistyped, or the comic it pointed to no longer exists.</p>
          <div className="notice-actions">
            <Link href="/" className="button">
              Back to the stories
            </Link>
            {user && (
              <Link href="/create" className="button secondary">
                Make a comic
              </Link>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
