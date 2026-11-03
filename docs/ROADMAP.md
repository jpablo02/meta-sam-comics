# Roadmap

What this hackathon build deliberately leaves out, and what comes next.

The demo is narrow on purpose: one art style, four panels, bubbles placed
automatically. Each of those is a choice made to ship a complete loop — idea →
comic → hidden object → collected → shared — in ten days, not a limit of the
approach.

## Motion

- **Comics to animated episodes.** Today Tales makes comics. Every character,
  place and gem is drawn once as a reference and each panel is drawn from those
  references — the consistency an animated episode needs. When Meta's Model API
  offers video generation, a story becomes a short animated, anime-style episode
  made from the same references, the gem still hidden inside it.

## Creation

- **More art styles.** The pipeline takes the style as one string; the demo
  fixes it. A set of presets with sample images is the same prompt anchors,
  just exposed.
- **Longer chapters and free page layouts.** Mixed layouts of 1–4 panels per
  page, chosen by the creator. The demo uses four vertical
  panels so every chapter reads on a phone and doubles as a Reel.
- **Series.** Chapter 2 inherits the cast, places and art style of chapter 1
  through a series bible. Here the collectible's revealed
  text already plants a hook for the next chapter; the next step is to let that
  hook *start* chapter 2.
- **Editable bubbles.** Bubbles are placed automatically and baked in. The
  next step is to let the creator drag and retype each one.
- **Human artists.** Upload your own panels and let the object pipeline (Muse
  Wonder + SAM) find the collectible in hand-drawn art. Nothing in that half of
  the pipeline assumes the art was generated.

## Collecting

- **Scarcity — already in.** Each gem has 100 copies, numbered in the order
  people collect them (#37 of 100). Each copy is numbered inside a transaction
  that locks the comic's row, so two people can never get the same number or
  the 101st copy.
- **Creator earnings.** A share of each collection goes to the comic's creator.

## Distribution

- **Reels from a Tales Page.** Every comic already comes with a vertical reel,
  and "Share video" hands it to the phone's share sheet (Reels, Stories,
  WhatsApp). Meta's Reels publishing API posts to Pages, not personal profiles,
  so the next step is a Tales Facebook Page that publishes the best comics.
- **More languages.** Ideas can already be written in any language. Output is
  English for now; the script and the object text can be generated in the
  reader's language.

## Known limits of this build

Measured while building, kept honest here:

- **Bubble layout.** When the first speaker's head fills the top corner of a
  panel, the second speaker's bubble can land low, with a long tail. Reading
  order stays correct; it is not elegant. A letterer would ask for the panel to
  be redrawn — a future version can do the same.
- **Partial masks.** SAM sometimes segments only part of an object (the
  crumpled half of a report, not its heading). The collectible is revealed from
  the best sighting, so it does not reach the reader, but the reel's spotlight
  can be tighter than the object.
- **Generation time.** A chapter takes about seven minutes end to end. The UI
  shows each panel the moment it is drawn, so the wait is part of the show — but
  it is a wait.
