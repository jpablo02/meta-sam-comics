import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { N, keepNames } from "@/components/NoTranslate";

export const metadata: Metadata = {
  title: `How it works · ${APP_NAME}`,
  description: "One idea, four Meta models, and a story with something worth keeping.",
};

/** The idea the example comic on this page was made from. */
const IDEA =
  "Camila es una pescadora joven de Cartagena… Al amanecer saca de la red una botella verde con un papel " +
  "enrollado adentro. Se la muestra a su abuelo Ramiro, que palidece al reconocerla y se niega a abrirla.";

/** What the models did that we did not expect — each one measured while building Tales. */
const SURPRISES = [
  {
    title: "Muse Image writes, if you let it carve",
    body: "Ask it for a caption and it spells badly. Ask it to engrave the gem's exact words into the object — ink soaked into paper, letters cut into wood — and the words come out right, in the object's own material.",
  },
  {
    title: "Muse Image keeps a place without copying the shot",
    body: "Give it an empty picture of a room and it draws the same room from a new angle in every panel — the same window, the same table — instead of pasting the reference's camera.",
  },
  {
    title: "Muse Wonder can direct SAM",
    body: "It writes the words SAM 3.1 searches with, looks at what SAM cut out, and says no when it is the wrong thing. Together they find an object neither would find alone.",
  },
  {
    title: "SAM 3.1 sees who is silent",
    body: "It finds every face in a drawn panel, including the characters who say nothing — which is what lets the bubbles go where nobody is.",
  },
];

const MODELS = [
  {
    name: "Muse Spark",
    role: "The writer and the editor",
    does: "Turns two words into a cast, places, four panels and dialogue. If the script breaks a rule the drawing depends on, it gets it back to fix — before a single picture is drawn. It suggests the gem, and writes the words hidden inside it, with a hook for the next chapter.",
  },
  {
    name: "Muse Image",
    role: "The illustrator who works from references",
    does: "Draws every character, every place and the gem once — then draws each panel from several of those pictures at once, so nothing drifts. It even engraves the gem's exact words into the object: ink in paper, letters cut into wood.",
  },
  {
    name: "Muse Wonder",
    role: "The reader",
    does: "Looks at the finished art the way a reader would. It tells SAM what to look for — the gem, every face — and checks that what SAM found is really the gem. A wrong find goes back, with the phrase that failed, until it is.",
  },
  {
    name: "SAM 3.1",
    role: "The eyes",
    does: "Finds the gem in every panel, pixel by pixel, and every face — speaking or silent. The lettering is laid out around what SAM sees, so no bubble ever covers a face or the gem.",
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
        <span className="how-chip" translate="no">{model}</span>
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
          <Link href="/" className="how-brand" translate="no">
            {APP_NAME}
          </Link>
          <h1>How it works</h1>
          <p>One idea. Four Meta models. A finished comic in minutes — with something worth keeping.</p>
        </div>
      </header>

      <div className="how-body">
        <Step n={1} title="You write an idea" model="Muse Spark" art={<blockquote className="how-idea">“{IDEA}”</blockquote>}>
          <p>
            Two words or a whole paragraph, in Spanish or English — &ldquo;un perro&rdquo; is enough. <N>Muse Spark</N> turns
            it into a four-panel script in English: the cast, the places, what happens and who says what.
          </p>
          <p>
            And the <strong>gem</strong> — one object inside the story that readers will want to keep. You name it,
            or press Suggest and <N>Muse Spark</N> proposes one from your idea. Here, the bottle. What the letter inside it
            says is written now, and kept back.
          </p>
        </Step>

        <Step
          n={2}
          title="The cast, the places and the gem are drawn once"
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
            its size in a hand, the letter rolled <em>inside</em>, the cork <em>in</em> its neck. Every place gets
            one too, drawn empty: the walls, the furniture, where each thing stands.
          </p>
          <p>
            Every panel is drawn from those pictures, not from a description. That is why Camila is Camila in all
            four, the place stays the same place while the camera moves, and the bottle never changes size.
          </p>
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
            the cast, the world, and the gem catching the light somewhere in it. It takes about seven minutes; you can
            watch each panel appear, or leave — a bubble in the corner follows the progress and brings you back.
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
            The art is finished, so now it is <em>read</em>. <N>Muse Wonder</N> knows from the script which object to look
            for and how to ask for it. <N>SAM 3.1</N> cuts it out of each panel, edge to edge. <N>Muse Wonder</N> then checks the
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
            <N>SAM</N> finds every face in the panel — the ones speaking and the ones listening. The bubbles are then laid
            out together, the way a letterer would: in reading order, one per speaker, each tail pointing at the one
            who speaks, never over a face — and never over the gem.
          </p>
        </Step>

        <Step
          n={6}
          title="The gem: everyone sees it, collectors read it"
          model="Muse Spark + Muse Image"
          art={
            <div className="how-flip" tabIndex={0} aria-label="The gem card: hover or focus to reveal it">
              <div className="how-flip-inner">
                <Img src="/how/card-teaser.webp" alt="The gem card, its letter unreadable" />
                <Img src="/how/card-revealed.webp" alt="The gem card, its letter written out" className="how-flip-back" />
              </div>
            </div>
          }
        >
          <p>
            Two cards of the same object. The one everybody sees keeps the writing blurred. The one a collector
            gets carries the real words — written by <N>Muse Spark</N>, drawn into the object by <N>Muse Image</N>: ink in the
            paper, letters cut into metal. They tell you something the comic did not.
          </p>
          <p className="how-hint">Hover the card to reveal it.</p>
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
            Sign in with Facebook, or try it as a guest. Post the link to Facebook — its preview is the cover — or
            share the comic as a video, ready for Reels, Stories or WhatsApp. Friends who collect the gem get their
            numbered copy, and the text only they can read.
          </p>
        </Step>

        <section className="how-models">
          <h2>Under the hood</h2>
          <p className="how-models-lead">
            Four Meta models, working as one studio: <N>Muse Spark</N> writes, <N>Muse Image</N> draws,{" "}
            <N>Muse Wonder</N> reads, <N>SAM 3.1</N> sees — and they check each other&apos;s work.
          </p>
          <div className="how-models-grid">
            {MODELS.map((m) => (
              <div key={m.name} className="how-model">
                <strong translate="no">{m.name}</strong>
                <em className="how-model-role">{m.role}</em>
                <span>{keepNames(m.does)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="how-models">
          <h2>What surprised us</h2>
          <p className="how-models-lead">Things we did not know these models could do until we built Tales.</p>
          <div className="how-models-grid">
            {SURPRISES.map((s) => (
              <div key={s.title} className="how-model">
                <strong>{keepNames(s.title)}</strong>
                <span>{keepNames(s.body)}</span>
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
