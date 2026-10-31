"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface HeroSlide {
  href: string;
  cover: string;
  series: string;
  title: string;
  logline: string;
}

const EVERY_MS = 6500;

/**
 * The top of the feed: every comic takes a turn, the most collected first.
 * It stops while a reader is on it, and never moves for someone who asked
 * their system for less motion. The arrow keys step through it too.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Changing the slide by hand restarts the clock, so it never jumps right after.
  const [turn, setTurn] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), EVERY_MS);
    return () => clearInterval(timer);
  }, [paused, count, turn]);

  function go(to: number) {
    setIndex(((to % count) + count) % count);
    setTurn((t) => t + 1);
  }

  useEffect(() => {
    if (count < 2) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement;
      // Arrows belong to whoever is typing, and to an open dialog.
      if (t.closest("input, textarea, select, [contenteditable], dialog")) return;
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      const by = e.key === "ArrowRight" ? 1 : -1;
      setIndex((i) => (i + by + count) % count);
      setTurn((n) => n + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  if (count === 0) return null;
  const slide = slides[index];
  // Only the current cover and the next are loaded: the rest wait their turn.
  const next = (index + 1) % count;

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Stories"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero-frame">
        {slides.map((s, i) =>
          i === index || i === next ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s.href} src={s.cover} alt="" className={i === index ? "hero-art shown" : "hero-art"} />
          ) : null,
        )}
        <div className="hero-shade" />
        <div className="hero-text" key={slide.href} aria-live={paused ? "polite" : "off"}>
          <span className="hero-series">{slide.series}</span>
          <h1 className="hero-title">{slide.title}</h1>
          <p className="hero-logline">{slide.logline}</p>
          <div className="hero-actions">
            <Link href={slide.href} className="button">
              Read the comic
            </Link>
          </div>
        </div>
        {count > 1 && (
          <>
            <button type="button" className="hero-arrow prev" aria-label="Previous story" onClick={() => go(index - 1)}>
              ‹
            </button>
            <button type="button" className="hero-arrow next" aria-label="Next story" onClick={() => go(index + 1)}>
              ›
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="hero-dots">
          {slides.map((s, i) => (
            <button
              key={s.href}
              type="button"
              className={i === index ? "hero-dot on" : "hero-dot"}
              aria-label={`Show ${s.title}`}
              aria-current={i === index}
              onClick={() => go(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
