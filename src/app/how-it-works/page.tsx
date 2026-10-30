import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = {
  title: `How it works · ${APP_NAME}`,
  description: "One idea, four Meta models, and a story with something worth keeping.",
};

/** The idea the example comic on this page was made from. */
const IDEA =
  "Camila es una pescadora joven de Cartagena… Al amanecer saca de la red una botella verde con un papel " +
  "enrollado adentro. Se la muestra a su abuelo Ramiro, que palidece al reconocerla y se niega a abrirla.";

const MODELS = [
  {
    name: "Muse Spark",
    does: "Writes the script from your idea — cast, places, four panels, dialogue — and the words hidden inside the gem.",
  },
  {
    name: "Muse Image",
    does: "Draws each character once, the gem once, then every panel, the cover and the gem's two cards — anchored on those references.",
  },
  {
    name: "Muse Wonder",
    does: "Looks at the finished art the way a reader would: decides what to search for, and checks that what was found is really the gem.",
  },
  {
    name: "SAM 3.1",
    does: "Cuts the gem out of the panels pixel by pixel, and finds every speaker's face so the bubbles never cover one.",
  },
];

function Step({
  n,
  title,
  model,
  children,
  art,
}: {
  n: number;
  title: string;
  model: string;
  children: React.ReactNode;
  art: React.ReactNode;
}) {
  return (
    <section className="how-step">
      <div className="how-step-text">
        <span className="how-step-n">{String(n).padStart(2, "0")}</span>
        <h2>{title}</h2>
        <span className="how-chip">{model}</span>
        <div className="how-copy">{children}</div>
      </div>
      <div className="how-step-art">{art}</div>
    </section>
  );
}

// eslint-disable-next-line @next/next/no-img-element
const Img = (props: { src: string; alt: string; className?: string }) => <img loading="lazy" {...props} />;

export default function HowItWorks() {
  return (
    <main className="how">
      <header className="how-hero">
        <picture className="how-hero-art" aria-hidden="true">
          <source media="(orientation: portrait)" srcSet="/landing/hero-tall.webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/hero-wide.webp" alt="" />
        </picture>
        <Link href="/" className="how-back" aria-label="Back to home">
          ← Home
        </Link>
        <div className="how-hero-content">
          <Link href="/" className="how-brand">
            {APP_NAME}
          </Link>
          <h1>How it works</h1>
          <p>One idea. Four Meta models. A story with something worth keeping.</p>
        </div>
      </header>

      <div className="how-body">
        <Step n={1} title="You write an idea" model="Muse Spark" art={<blockquote className="how-idea">“{IDEA}”</blockquote>}>
          <p>
            A sentence or two, in Spanish or English. Muse Spark turns it into a four-panel script in English: the
            cast, the places, what happens and who says what.
          </p>
          <p>
            And the <strong>gem</strong> — one object inside the story that readers will want to keep. Here, the
            bottle. What the letter inside it says is written now, and kept back.
          </p>
        </Step>

        <Step
          n={2}
          title="The cast and the gem are drawn once"
          model="Muse Image"
          art={
            <div className="how-row">
              <Img src="/how/cast-camila.webp" alt="Camila's character sheet" />
              <Img src="/how/cast-ramiro.webp" alt="Ramiro's character sheet" />
              <Img src="/how/gem-sheet.webp" alt="The gem's reference sheet: the green bottle" className="how-gold" />
            </div>
          }
        >
          <p>
            Before any panel, every character gets a full-body sheet, and the gem gets one of its own — its shape,
            its size in a hand, the letter rolled <em>inside</em>, the cork <em>in</em> its neck.
          </p>
          <p>Every panel is drawn from those pictures, not from a description. That is why Camila is Camila in all four, and the bottle never changes size.</p>
        </Step>

        <Step
          n={3}
          title="Four panels, and a cover"
          model="Muse Image"
          art={
            <div className="how-fan">
              <Img src="/how/cover.webp" alt="The comic's cover" />
              <Img src="/how/lettered-1.webp" alt="Panel 1" />
              <Img src="/how/lettered-2.webp" alt="Panel 2" />
              <Img src="/how/lettered-3.webp" alt="Panel 3" />
              <Img src="/how/lettered-4.webp" alt="Panel 4" />
            </div>
          }
        >
          <p>
            Vertical panels, made to be read on a phone — and already the shape of a Reel. Then a cover of its own:
            the cast, the world, and the gem catching the light somewhere in it.
          </p>
        </Step>

        <Step
          n={4}
          title="Finding the gem in the art"
          model="Muse Wonder + SAM 3.1"
          art={
            <div className="how-row how-row-2">
              <Img src="/how/panel-spotlight.webp" alt="Panel 2 with everything but the bottle dimmed" />
              <Img src="/how/gem-crop.webp" alt="The bottle, cut out of the panel" className="how-gold how-small" />
            </div>
          }
        >
          <p>
            The art is finished, so now it is <em>read</em>. Muse Wonder knows from the script which object to look
            for and how to ask for it. SAM 3.1 cuts it out of each panel, edge to edge. Muse Wonder then checks the
            cut-out: is this really the bottle from the story?
          </p>
          <p>That is how the app knows where the gem is in every panel — and what the gem looks like on its card.</p>
        </Step>

        <Step
          n={5}
          title="Lettered around faces"
          model="SAM 3.1"
          art={<Img src="/how/lettered-3.webp" alt="Panel 3 with two speech bubbles placed around the faces" className="how-single" />}
        >
          <p>
            SAM finds every speaker&apos;s face. The bubbles are then laid out together, the way a letterer would:
            in reading order, each tail pointing at the one who speaks, never over a face — and never over the gem.
          </p>
        </Step>

        <Step
          n={6}
          title="The gem: everyone sees it, collectors read it"
          model="Muse Spark + Muse Image"
          art={
            <div className="how-flip" tabIndex={0} aria-label="The gem card: hover or focus to turn it over">
              <div className="how-flip-inner">
                <Img src="/how/card-teaser.webp" alt="The gem card, its letter unreadable" />
                <Img src="/how/card-revealed.webp" alt="The gem card, its letter written out" className="how-flip-back" />
              </div>
            </div>
          }
        >
          <p>
            Two cards of the same object. The one everybody sees keeps the writing blurred. The one a collector
            gets carries the real words — written by Muse Spark, drawn into the object by Muse Image: ink in the
            paper, letters cut into metal. They tell you something the comic did not.
          </p>
          <p className="how-hint">Hover the card to turn it over.</p>
        </Step>

        <Step
          n={7}
          title="Share it, and watch it get collected"
          model="Facebook"
          art={
            <div className="how-collect">
              <span className="how-badge">#37 of 100</span>
              <span>Every gem has a fixed number of copies, numbered in the order people collect them.</span>
            </div>
          }
        >
          <p>
            Sign in with Facebook, share the comic — its preview is the blurred gem — and post the reel. Friends who
            collect it get their numbered copy, and the text only they can read.
          </p>
        </Step>

        <section className="how-models">
          <h2>Under the hood</h2>
          <div className="how-models-grid">
            {MODELS.map((m) => (
              <div key={m.name} className="how-model">
                <strong>{m.name}</strong>
                <span>{m.does}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="how-end">
          <p className="how-end-tag">{APP_TAGLINE}</p>
          <Link href="/" className="button how-cta">
            Make your first comic
          </Link>
          <p className="how-legal">
            <a href="/privacy">Privacy</a> · <a href="/data-deletion">Data deletion</a>
          </p>
        </section>
      </div>
    </main>
  );
}
