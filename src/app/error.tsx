"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Anything a page throws lands here instead of Next's blank "Application
 * error". The reader gets words and two ways forward; the details go to the
 * console for us.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="feed">
      <section className="card notice">
        <span className="notice-mark" aria-hidden="true">!</span>
        <h1>Something went wrong on this page</h1>
        <p className="muted">It wasn&apos;t anything you did. Try again, or head back to the stories.</p>
        <div className="notice-actions">
          <button type="button" className="button" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="button secondary">
            Back to the stories
          </Link>
        </div>
      </section>
    </main>
  );
}
