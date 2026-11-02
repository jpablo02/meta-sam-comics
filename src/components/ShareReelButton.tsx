"use client";

import { useState } from "react";
import { PlayIcon } from "./ui";

/**
 * Hand the comic's reel to the phone's own share sheet — Facebook (as a Reel or
 * a Story), Instagram, WhatsApp — with the video already attached.
 *
 * Publishing a Reel straight from here is not on offer: Meta's Reels publishing
 * API is for Pages and professional accounts, not a reader's own profile. The
 * share sheet is how a reel reaches Reels from the web. Where there is no share
 * sheet (most desktops), the video is saved instead, with a word on what to do
 * with it; and if the video cannot be fetched at all, it opens in a tab.
 */
export function ShareReelButton({ src, filename, title }: { src: string; filename: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`reel ${res.status}`);
      const file = new File([await res.blob()], filename, { type: "video/mp4" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title });
        } catch (e) {
          // Closing the share sheet is a choice, not an error.
          if ((e as Error).name !== "AbortError") throw e;
        }
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setNote("Saved. Upload it to Facebook or Instagram as a Reel.");
      }
    } catch {
      window.open(src, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="share-reel">
      <button type="button" className="action" onClick={share} disabled={busy}>
        <PlayIcon /> {busy ? "Preparing…" : "Share video"}
      </button>
      {note && <p className="share-reel-note">{note}</p>}
    </div>
  );
}
