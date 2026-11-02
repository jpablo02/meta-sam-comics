"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface Unfinished {
  id: string;
  state: "running" | "failed";
  percent: number;
  label: string;
}

/** One bubble per comic: being made, failed, or done and not opened yet. */
type Bubble = Unfinished | { id: string; state: "ready"; label: string };

const POLL_MS = 5000;

/**
 * A comic takes minutes, and the progress page says the reader can leave. These
 * bubbles follow them around the app, one per comic: how far along it is, and
 * one tap back to it — then "Ready" when it is done, or a red mark if it failed.
 * A comic's bubble is hidden on that comic's own page, which already shows it all.
 */
export function ProgressBubble() {
  const { status } = useSession();
  const pathname = usePathname();
  const [unfinished, setUnfinished] = useState<Unfinished[]>([]);
  const [ready, setReady] = useState<Array<{ id: string; label: string }>>([]);
  // Comics seen running, with their label: when one leaves the list, it is done.
  const watched = useRef(new Map<string, string>());

  useEffect(() => {
    if (status !== "authenticated") return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch("/api/me/unfinished", { cache: "no-store" });
        const { comics } = (await res.json()) as { comics: Unfinished[] };
        if (stop) return;
        const finished: Array<{ id: string; label: string }> = [];
        for (const [id, label] of watched.current) {
          if (comics.some((c) => c.id === id)) continue;
          watched.current.delete(id);
          finished.push({ id, label });
        }
        for (const c of comics) if (c.state === "running") watched.current.set(c.id, c.label);
        setUnfinished(comics);
        if (finished.length > 0) setReady((r) => [...finished, ...r]);
      } catch {
        // Network blip: try again on the next tick.
      }
      if (!stop) timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [status]);

  // Opening a finished comic is what "Ready" was asking for.
  useEffect(() => {
    setReady((r) => r.filter((b) => pathname !== `/c/${b.id}`));
  }, [pathname]);

  const bubbles: Bubble[] = [...ready.map((r) => ({ ...r, state: "ready" as const })), ...unfinished].filter(
    (b) => pathname !== `/c/${b.id}`,
  );
  if (bubbles.length === 0) return null;

  return (
    <div className="bubbles">
      {bubbles.map((b) => {
        const href = `/c/${b.id}`;
        if (b.state === "ready") {
          return (
            <Link key={b.id} href={href} className="bubble bubble-ready" aria-label={`Your comic is ready: ${b.label}`}>
              <span className="bubble-ring">✓</span>
              <span className="bubble-text">
                <span className="bubble-label">Ready</span>
                <span className="bubble-idea">{b.label}</span>
              </span>
            </Link>
          );
        }
        if (b.state === "failed") {
          return (
            <Link key={b.id} href={href} className="bubble bubble-failed" aria-label={`Didn’t finish: ${b.label}`}>
              <span className="bubble-ring">!</span>
              <span className="bubble-text">
                <span className="bubble-label">Didn’t finish</span>
                <span className="bubble-idea">{b.label}</span>
              </span>
            </Link>
          );
        }
        const deg = Math.round((b.percent / 100) * 360);
        return (
          <Link key={b.id} href={href} className="bubble" aria-label={`Being made, ${b.percent}%: ${b.label}`}>
            <span className="bubble-ring" style={{ background: `conic-gradient(var(--accent) ${deg}deg, var(--surface-2) 0)` }}>
              <span className="bubble-percent">{b.percent}%</span>
            </span>
            <span className="bubble-text">
              <span className="bubble-label">Being made</span>
              <span className="bubble-idea">{b.label}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
