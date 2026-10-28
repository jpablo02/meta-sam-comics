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

## Next

- [ ] **Gem consistency across panels.** The bottle changes size between
      panels; in one, the paper sits on top of the cork instead of inside.
      Proposal: draw the gem once as an **object sheet** before the panels and
      pass it as a reference to every panel that plants it — the same thing the
      character portraits do for faces (Token Comic does it with set sheets).
- [ ] **The reel to publish.** Today's reel is the *SAM spotlight* reel: it
      dims the panel and outlines the object — great to show the judges how the
      gem is found, not what a reader posts. Proposal: two reels —
      **story reel** (clean panels, gentle motion, bubbles, end card with the
      blurred gem and "Collect it on Tales") for sharing, and the spotlight reel
      kept for the demo video.
- [ ] **A line with no speaker became a narration box** ("Look at these crates.
      Illegal rifles." in The Golden Find, panel 2). Check the script's
      dialogue format for that panel.
- [ ] **Phone testing.** `localhost` only exists on the computer. Needs an HTTPS
      tunnel (or the deploy) and that URL added to the Facebook app.
- [ ] More UX passes from the owner's testing.

## Waiting on a decision

- [ ] **Architecture**: Cloud Run job + Vercel, or one container. Check the
      contest rules on Google services first.
- [ ] **Database** for comics and collections (the local `data/` folder is the
      demo store; `store.ts` is the only file that changes).
- [ ] **Facebook app Live mode**: privacy URL, data-deletion URL, 1024×1024
      icon, category — all need the public domain. Business verification is
      required to publish; check whether it can be done as an individual.
      Fallback: judges try it in development mode as testers, or a guest path.

## Submission

- [ ] README (artistic, hero image).
- [ ] Demo video (Nov 3).
- [ ] X post for Most Viral, link in the form (before Nov 4).
- [ ] Submit early on Nov 4.
