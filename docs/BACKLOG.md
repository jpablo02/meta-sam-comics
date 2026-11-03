# Backlog

What is next, what is missing, and what is waiting on a decision. Newest round
first. Submission: **Nov 4, 2026, 9:00 PM ET**.

## Round 1 — owner's first hands-on review (Oct 28)

Done on `feat/polish-round-1`:

- [x] **Signed-out landing** is no longer a whole comic: gems from several
      stories drift behind a centred pitch (name, tagline, three steps,
      Facebook button, "See an example first").
- [x] **Feed shows a cover**, not a swipeable comic. Panel 1 with the title on
      it; reading happens on the comic page, top to bottom, via **Read**.
- [x] **The gem is required.** Empty field → "✨ Suggest one": Muse Spark
      proposes an object from the idea, in the idea's language.
- [x] **The creator can collect their own gem** (and gets a numbered copy in
      My Gems). The creator no longer reads it for free — the reveal is the
      moment, for them too.
- [x] **Engraving looks carved, not pasted.** The revealed card is now drawn
      *from the teaser* (same object, same pose — the flip finally shows the
      same dagger), with material rules: cut into metal, ink into paper, never
      a glowing caption. Tested on the dagger: reads as engraved.
- [x] **Text sized to the object.** The dagger lost 2 of 7 lines and misspelled
      one: the text did not fit the blade. Muse Spark now writes at most ~15
      words for a narrow surface (blade, ring, key, watch lid), more for a page.
      To verify on the next real run.

## Round 2 — done on `feat/gem-sheet`

- [x] **Gem object sheet.** The gem is drawn once (shape, materials, real size
      against a hand, where its contents sit) and passed as the LAST reference
      to every panel that plants it, and to the teaser card.
- [x] **Two reels.** `reel.mp4` is now the **story reel** for sharing (title
      card, slow top-anchored push-in per panel, crossfades, end card with the
      blurred gem and "Collect it on Tales"). The **spotlight reel** stays as
      `reel-spotlight.mp4` for the demo video. A downward pan was tried first and
      cut the top bubble off every panel.
- [x] **Every dialogue line must name its speaker** — checked when the script is
      validated, sent back to Muse Spark to fix before anything is drawn.
- [x] **Shared bubble in the demo** ("…net brought! Ramiro: No…"): the demo
      panels predated the parser fix; re-lettered with `scripts/reletter.ts`.

## Round 3 — done on `feat/how-it-works`

- [x] **Landing artwork** — commissioned hero (open book of worlds), motes, sheen.
- [x] **A cover per comic**, cast described in text so Muse keeps the faces.
- [x] **Demo remade** from the run with the gem sheet: one bottle in all four
      panels, the letter inside it, readable on the collector's card.
- [x] **Stale images**: files were cached an hour by the browser and resized
      copies were never redrawn, so the remade demo still showed the old art.
      Now `no-cache` + ETag (cheap 304) and resized copies older than their
      original are redrawn.
- [x] **How it works** page, with a way back home.
- [x] **My Gems** opens the gem in a modal (art, number, what it says, date);
      the comic is one button further.
- [x] **Comic page opens on panel 1** — the cover lives in the feed and the
      reel; repeating it after tapping it felt wrong.
- [x] **Script rules from the demo:** every speaker is called by name by
      someone else (readers had no way to tell who was who), and a distinctive
      mark is never a missing or hand/finger detail (Ramiro's "missing pinky
      tip" became stubs on every finger and a floating fingertip). Both are
      validated and sent back to Muse Spark before anything is drawn.
- [x] **Bubbles stay** (owner's call): they are SAM 3.1 at work. No caption
      strip fallback — a bubble must be placed well, not hidden.

## Next

- [ ] Check the gem sheet and the engraving on other stories.
- [ ] More UX passes from the owner's testing.

## Scaling

- [x] **One Cloud Run Job execution per comic**, so comics are made in parallel
      and a slow one never blocks the web.
- [x] **Numbering holds with many servers.** Each copy of a gem is numbered in a
      Postgres transaction that locks the comic's row.
- [x] **Files on Cloud Storage.** Each resized copy is made once, on first
      request, and kept next to the original.
- [ ] **A CDN in front of the files.**
- [ ] **Redraw a panel.** The author can ask for one panel again (or its
      bubbles) when it came out wrong, keeping the cast and gem references.
      Today a failed comic can be tried again as a whole.
- [ ] **Animated episodes** once Meta's Model API offers video — see
      [ROADMAP](ROADMAP.md#motion).

### Monetization (later — collecting stays free for the demo)

- [ ] **Stars on the reel.** The author posts the story reel on Facebook, where
      fans can send Stars (about $0.01 each, paid by Meta to the creator). Tales
      earns nothing here, but it gives creators a reason to post — check Meta's
      current eligibility rules before promising it.
- [ ] **Creation credits.** A few free comics a month, then paid credits: the
      real cost is the Muse Image calls per comic.
- [ ] **Paid golden edition.** The 100 copies stay free; the first 10 of a
      separate golden edition are paid, split with the author.
- [ ] **Facebook payments** for apps exist only for Instant Games (up to 30%
      fee); a web app like Tales would charge with its own processor.

## Round 4 — done on `feat/my-comics` (Nov 3)

- [x] **My comics.** Under the profile picture: My comics and My collection.
      The top bar keeps only Create.
- [x] **Delete a comic.** Its author can delete it from My comics: the comic,
      its files, its idea and every collected copy of its gem. A tombstone
      stays, so a deleted comic still counts against a guest's limit.
- [ ] **Later, with paid gems:** hide a comic with buyers instead of deleting
      it; buyers keep access (see ROADMAP).

## Decided

- [x] **Architecture** — Vercel (web) + Cloud Run Job (pipeline) + Cloud
      Storage (files) + Cloud SQL Postgres (comics, progress, collections), on
      tales.pablodrum.xyz.
- [x] **Database** — Cloud SQL Postgres in production; the local `data/` folder
      remains the store for a fresh clone. `store.ts` is the only file that
      knows the difference.
- [x] **Phone testing** — done in production.
- [x] **Facebook app Live** — business verified and `public_profile` approved
      by Meta (Nov 2). Guests can still try everything but posting to Facebook.

Later rounds (guest mode, home shelves, progress bubbles, retries, sharing) are
in the git history.

## Submission

- [x] README (artistic, hero image).
- [ ] Demo video (Nov 3).
- [ ] X post for Most Viral, link in the form (before Nov 4).
- [ ] Submit early on Nov 4.
