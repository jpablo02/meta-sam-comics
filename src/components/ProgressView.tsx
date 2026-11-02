"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelStrip } from "./PanelStrip";

const STEPS = [
  { key: "script", label: "Writing the story" },
  { key: "portraits", label: "Casting the characters" },
  { key: "panels", label: "Drawing the panels" },
  { key: "cover", label: "Painting the cover" },
  { key: "object", label: "Finding the gem in the art" },
  { key: "dialogue", label: "Lettering the dialogue" },
  { key: "contents", label: "Writing what the gem hides" },
  { key: "collectible", label: "Making the gem card" },
  { key: "reel", label: "Cutting the reel" },
] as const;

interface Status {
  state: "running" | "done" | "failed";
  step: string;
  detail?: string;
  drawn: number[];
  canRetry?: boolean;
  /** Why it failed: Meta's content filter, a run that stopped answering, or anything else. */
  reason?: "filtered" | "stalled" | "error";
}

/** What a reader is told, by kind of failure. Never the raw error. */
const FAILURES = {
  filtered: {
    title: "Meta’s safety filter stopped one of the pictures.",
    body:
      "The image model often refuses scenes with fire, injuries, blood, weapons or violence — even gentle " +
      "ones. Trying again sometimes works. If it keeps happening, tell the same story through a calmer " +
      "moment: a memory, a look, the object in someone’s hands.",
  },
  stalled: {
    title: "This comic stopped making progress.",
    body: "The run behind it was interrupted before it finished. Nothing was lost on your side — start it again.",
  },
  error: {
    title: "This comic didn’t come out right.",
    body:
      "One of the models answered in a way the studio couldn’t use. It isn’t your idea: the same idea " +
      "usually works on a second try.",
  },
} as const;

/**
 * The wait, shown honestly: every line ticks when that step has really
 * finished, and each panel appears the moment it is drawn.
 */
export function ProgressView({ id, total }: { id: string; total: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function retry() {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`/api/comics/${id}/retry`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !body.id) throw new Error(body.error ?? "Could not start it again.");
      router.push(`/c/${body.id}`);
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : String(e));
      setRetrying(false);
    }
  }

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch(`/api/comics/${id}/status`, { cache: "no-store" });
        if (res.ok) {
          const s = (await res.json()) as Status;
          if (stop) return;
          setStatus(s);
          if (s.state === "done") {
            router.refresh();
            return;
          }
          if (s.state === "failed") return;
        }
      } catch {
        // Network blip: try again on the next tick.
      }
      if (!stop) setTimeout(poll, 2500);
    }
    poll();
    return () => {
      stop = true;
    };
  }, [id, router]);

  const current = STEPS.findIndex((s) => s.key === status?.step);
  const panels = Array.from({ length: total }, (_, i) =>
    status?.drawn.includes(i + 1) ? `/api/comics/${id}/files/panel-${i + 1}.png?w=720` : null,
  );

  return (
    <>
      <article className="post">
        <div className="post-body">
          <h1 className="post-title">Your comic is being made</h1>
          <span className="muted">About seven minutes. You can leave this page — it keeps going.</span>
        </div>
        <PanelStrip panels={panels} total={total} alt="Your comic" />
        <div style={{ height: 8 }} />
      </article>

      <section className="card">
        {status?.state === "failed" ? (
          <div className="retry">
            <p className="retry-title">{FAILURES[status.reason ?? "error"].title}</p>
            <p className="muted" style={{ margin: 0 }}>
              {FAILURES[status.reason ?? "error"].body}
            </p>
            <div className="retry-actions">
              {status.canRetry && (
                <button type="button" className="button" onClick={retry} disabled={retrying}>
                  {retrying ? "Starting…" : "Try again"}
                </button>
              )}
              <Link href="/create" className="button secondary">
                Write a new idea
              </Link>
            </div>
            {retryError && <p className="error" style={{ margin: 0 }}>{retryError}</p>}
          </div>
        ) : (
          <ol className="steps">
            {STEPS.map((s, i) => {
              const cls = current > i || status?.state === "done" ? "step done" : current === i ? "step now" : "step";
              return (
                <li key={s.key} className={cls}>
                  <span className="step-mark" aria-hidden="true">
                    {cls === "step done" ? "✓" : ""}
                  </span>
                  {s.label}
                  {current === i && status?.detail ? <span className="muted"> · {status.detail}</span> : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
