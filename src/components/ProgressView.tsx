"use client";

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
  error?: string;
  drawn: number[];
}

/**
 * The wait, shown honestly: every line ticks when that step has really
 * finished, and each panel appears the moment it is drawn.
 */
export function ProgressView({ id, total }: { id: string; total: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);

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
          <p className="error" style={{ margin: 0 }}>
            Something went wrong while making this comic. {status.error ? `(${status.error})` : ""}
          </p>
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
