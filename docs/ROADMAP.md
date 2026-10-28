# Roadmap

What this hackathon build deliberately leaves out, and what comes next.

The demo is narrow on purpose: one art style, four panels, bubbles placed
automatically. Each of those is a choice made to ship a complete loop — idea →
comic → hidden object → collected → shared — in ten days, not a limit of the
approach. Several of the items below already run in production on
[Token Comic](https://tokencomic.us), the platform this demo comes from, live
since July 2024; those are marked **(in production)**.

## Creation

- **More art styles.** The pipeline takes the style as one string; the demo
  fixes it. Token Comic offers a set of presets with sample images
  **(in production)** — the same prompt anchors, just exposed.
- **Longer chapters and free page layouts.** Mixed layouts of 1–4 panels per
  page, chosen by the creator **(in production)**. The demo uses four vertical
  panels so every chapter reads on a phone and doubles as a Reel.
- **Series.** Chapter 2 inherits the cast, places and art style of chapter 1
  through a series bible **(in production)**. Here the collectible's revealed
  text already plants a hook for the next chapter; the next step is to let that
  hook *start* chapter 2.
- **Editable bubbles.** Bubbles are placed automatically and baked in. Token
  Comic lets the creator drag and retype each one **(in production)**.
- **Human artists.** Upload your own panels and let the object pipeline (Muse
  Wonder + SAM) find the collectible in hand-drawn art. Nothing in that half of
  the pipeline assumes the art was generated.

## Collecting

- **Scarcity.** Each object has a fixed number of copies (for example 100),
  numbered in the order people collect them (#37 of 100), with a live counter.
  The count is enforced by the database with one atomic update, so two people
  can never get the last copy.
- **Ownership you can take with you.** Token Comic mints each collected object
  as a token on Arbitrum **(in production)**, paid by card, with no wallet for
  the reader to manage. The demo stores collections in a database; the
  on-chain layer can be switched back on without changing the experience.
- **Creator earnings.** A share of each collection goes to the comic's creator
  **(in production on Token Comic)**.

## Distribution

- **Instagram and Reels.** The pipeline already outputs a vertical reel with a
  spotlight on the object; publishing it as a Reel is the natural next channel.
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
