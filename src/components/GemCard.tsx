"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { signInAsGuest } from "@/app/sign-in-buttons";

interface Props {
  comicId: string;
  gemName: string;
  teaserSrc: string;
  /** Collector's card URL; only requested once the reader may see it. */
  revealedSrc: string;
  /** Blurred behind the glass: the panel the gem was found in. */
  backdropSrc: string;
  supply: number;
  collected: number;
  /** The reader's copy number, if they already hold one. */
  myNumber: number | null;
  isAuthor: boolean;
  signedIn: boolean;
  /** What it says — only sent by the server to people allowed to read it. */
  revealedLines: string[] | null;
}

/**
 * The gem: everyone sees the object, only collectors read it. Collecting is one
 * tap; the words come into focus and the copy number is theirs ("#37 of 100").
 */
export function GemCard(props: Props) {
  const [myNumber, setMyNumber] = useState(props.myNumber);
  const [collected, setCollected] = useState(props.collected);
  const [lines, setLines] = useState(props.revealedLines);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The author collects like anyone else: the reveal is the moment, and their
  // own copy belongs in their collection with a number.
  const canRead = myNumber !== null;
  const left = Math.max(0, props.supply - collected);
  const soldOut = left === 0 && myNumber === null;

  async function collect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/comics/${props.comicId}/collect`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "sold-out" ? "Every copy has been collected." : "Could not collect it. Try again.");
        return;
      }
      setMyNumber(data.number);
      setCollected(data.collected);
      setLines(data.revealedLines);
      setRevealed(true);
    } catch {
      setError("Could not collect it. Try again.");
    } finally {
      setBusy(false);
    }
  }

  let label = "Hidden in this story";
  let headline = "Something in this story can be kept.";
  if (myNumber !== null) {
    label = "In your collection";
    headline = props.gemName;
  } else if (props.isAuthor) {
    label = "Your story's gem";
    headline = "Collect the first copy of your own gem.";
  }

  return (
    <section className="gem-stage" id="gem" aria-label="The gem">
      <div className="gem-stage-bg" style={{ backgroundImage: `url(${props.backdropSrc})` }} />
      <div className="glass">
        <div>
          <div className="gem-label">{label}</div>
          <p className="gem-headline">{headline}</p>
        </div>

        <button
          type="button"
          className={revealed ? "reveal revealed" : "reveal"}
          onClick={() => canRead && setRevealed((f) => !f)}
          aria-label={revealed ? `${props.gemName}, revealed` : `${props.gemName}, its contents hidden`}
          aria-pressed={revealed}
        >
          {/* Not turned over — nobody writes on the back of an envelope. The same
              object comes into focus, and the words appear on it. */}
          <div className="reveal-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="reveal-hidden" src={props.teaserSrc} alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {canRead && <img className="reveal-shown" src={props.revealedSrc} alt="" />}
            <span className="reveal-shine" aria-hidden="true" />
          </div>
        </button>

        {myNumber !== null && <div className="gem-number">You hold #{myNumber} of {props.supply}</div>}

        <div className="supply">
          <span>
            {collected} collected · {left} left of {props.supply}
          </span>
          <div className="supply-bar">
            <div className="supply-fill" style={{ width: `${(collected / props.supply) * 100}%` }} />
          </div>
        </div>

        {canRead ? (
          <button type="button" className="gem-cta" onClick={() => setRevealed((f) => !f)}>
            {revealed ? "Hide it again" : "Read what it says"}
          </button>
        ) : !props.signedIn ? (
          <>
            <button type="button" className="gem-cta" onClick={() => signIn("facebook")}>
              Continue with Facebook to collect
            </button>
            <button type="button" className="gem-guest" onClick={() => signInAsGuest(window.location.href)}>
              or collect it as a guest
            </button>
          </>
        ) : (
          <button type="button" className="gem-cta" onClick={collect} disabled={busy || soldOut}>
            {soldOut ? "All copies collected" : busy ? "Collecting…" : "Collect this gem"}
          </button>
        )}

        {error && <p className="error" style={{ margin: 0, color: "#ffb4b4" }}>{error}</p>}

        {revealed && lines && lines.length > 0 && <p className="gem-lines">{lines.join("\n")}</p>}
      </div>
    </section>
  );
}
