"use client";

import "./globals.css";

/** When even the layout fails: the same message, with its own page around it. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="feed">
          <section className="card notice">
            <span className="notice-mark" aria-hidden="true">!</span>
            <h1>Something went wrong</h1>
            <p className="muted">It wasn&apos;t anything you did. Try again in a moment.</p>
            <div className="notice-actions">
              <button type="button" className="button" onClick={reset}>
                Try again
              </button>
              {/* A plain link: the router itself may be what failed. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="button secondary">
                Back to the stories
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
