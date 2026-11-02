"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface Unfinished {
  id: string;
  state: "running" | "failed";
  percent: number;
}

type Bubble = { kind: "running"; id: string; percent: number; count: number } | { kind: "failed"; id: string } | { kind: "ready"; id: string };

const POLL_MS = 5000;

/**
 * A comic takes minutes, and the progress page says the reader can leave. This
 * bubble follows them around the app: how far along their comic is, and one
 * tap back to it — then "Ready" when it is done, or a red mark if it failed.
 * Hidden on the comic's own page, which already shows all of it.
 */
export function ProgressBubble() {
  const { status } = useSession();
  const pathname = usePathname();
  const [bubble, setBubble] = useState<Bubble | null>(null);
  // Comics seen running: when one leaves the list, it either finished or failed.
  const watched = useRef(new Set<string>());

  useEffect(() => {
    if (status !== "authenticated") return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch("/api/me/unfinished", { cache: "no-store" });
        const { comics } = (await res.json()) as { comics: Unfinished[] };
        if (stop) return;
        const running = comics.filter((c) => c.state === "running");
        const failed = comics.find((c) => c.state === "failed");

        let ready: string | null = null;
        for (const id of watched.current) {
          if (comics.some((c) => c.id === id)) continue;
          watched.current.delete(id);
          // Left the list without failing: it is done.
          ready = id;
        }
        for (const c of running) watched.current.add(c.id);

        setBubble((prev) => {
          if (running.length > 0) {
            const slowest = running.reduce((a, b) => (b.percent < a.percent ? b : a));
            return { kind: "running", id: slowest.id, percent: slowest.percent, count: running.length };
          }
          if (ready) return { kind: "ready", id: ready };
          if (failed) return { kind: "failed", id: failed.id };
          // A "ready" bubble stays until it is opened.
          return prev?.kind === "ready" ? prev : null;
        });
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

  // Finished while the reader was watching it: there is nothing left to point to.
  useEffect(() => {
    if (bubble?.kind === "ready" && pathname === `/c/${bubble.id}`) setBubble(null);
  }, [bubble, pathname]);

  if (!bubble || pathname === `/c/${bubble.id}`) return null;

  const href = `/c/${bubble.id}`;
  const clear = () => bubble.kind === "ready" && setBubble(null);

  if (bubble.kind === "ready") {
    return (
      <Link href={href} className="bubble bubble-ready" onClick={clear} aria-label="Your comic is ready — open it">
        <span className="bubble-ring">✓</span>
        <span className="bubble-label">Ready</span>
      </Link>
    );
  }
  if (bubble.kind === "failed") {
    return (
      <Link href={href} className="bubble bubble-failed" aria-label="A comic of yours didn’t finish — see what happened">
        <span className="bubble-ring">!</span>
        <span className="bubble-label">Didn’t finish</span>
      </Link>
    );
  }
  const deg = Math.round((bubble.percent / 100) * 360);
  return (
    <Link
      href={href}
      className="bubble"
      aria-label={`Your comic is being made: ${bubble.percent}% — see progress`}
    >
      <span className="bubble-ring" style={{ background: `conic-gradient(var(--accent) ${deg}deg, var(--surface-2) 0)` }}>
        <span className="bubble-percent">{bubble.percent}%</span>
      </span>
      <span className="bubble-label">{bubble.count > 1 ? `${bubble.count} comics` : "Your comic"}</span>
    </Link>
  );
}
