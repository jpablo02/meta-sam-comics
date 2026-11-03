"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { timeAgo } from "./ui";

export interface MyComic {
  id: string;
  href: string;
  cover: string;
  seriesTitle: string;
  chapterTitle: string;
  createdAt: string;
  collected: number;
}

/**
 * The author's comics, each with a way to delete it. Deleting asks first, in
 * place, and says what else goes with it: every collected copy of its gem.
 */
export function MyComics({ comics }: { comics: MyComic[] }) {
  const router = useRouter();
  const [list, setList] = useState(comics);
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/comics/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setList((l) => l.filter((c) => c.id !== id));
      setAsking(null);
      router.refresh();
    } catch {
      setError("That comic could not be deleted. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {error && <p className="my-comics-error" role="alert">{error}</p>}
      <div className="my-comics-grid">
        {list.map((c) => (
          <div key={c.id} className="my-comic">
            <Link href={c.href} className="my-comic-cover" aria-label={`Read ${c.chapterTitle}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.cover} alt="" loading="lazy" />
            </Link>
            <strong className="my-comic-title">{c.chapterTitle}</strong>
            <span className="muted small">
              {timeAgo(c.createdAt)} · {c.collected === 1 ? "1 collected" : `${c.collected} collected`}
            </span>
            {asking === c.id ? (
              <div className="my-comic-confirm" role="group" aria-label={`Delete ${c.chapterTitle}?`}>
                <p>
                  Delete this comic?{" "}
                  {c.collected > 0 &&
                    (c.collected === 1
                      ? "1 person collected its gem — that copy goes too. "
                      : `${c.collected} people collected its gem — their copies go too. `)}
                  This can&apos;t be undone.
                </p>
                <div className="my-comic-confirm-actions">
                  <button type="button" className="button small danger" onClick={() => remove(c.id)} disabled={busy === c.id}>
                    {busy === c.id ? "Deleting…" : "Delete"}
                  </button>
                  <button type="button" className="button small secondary" onClick={() => setAsking(null)} disabled={busy === c.id}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="my-comic-delete" onClick={() => setAsking(c.id)}>
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
