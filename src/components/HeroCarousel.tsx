"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface HeroSlide {
  href: string;
  cover: string;
  series: string;
  title: string;
  logline: string;
  gemName: string;
  gemLeft: number;
}

const EVERY_MS = 6500;

/**
 * The top of the feed: every comic takes a turn, the most collected first.
 * It stops while a reader is on it, and never moves for someone who asked
 * their system for less motion.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), EVERY_MS);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[index];
  // Only the current cover and the next are loaded: the rest wait their turn.
  const next = (index + 1) % slides.length;

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
            <Link href={`${slide.href}#gem`} className="button hero-gem">
              {slide.gemLeft > 0 ? "Collect the gem" : "See the gem"}
            </Link>
          </div>
        </div>
      </div>
      {slides.length > 1 && (
        <div className="hero-dots">
          {slides.map((s, i) => (
            <button
              key={s.href}
              type="button"
              className={i === index ? "hero-dot on" : "hero-dot"}
              aria-label={`Show ${s.title}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
