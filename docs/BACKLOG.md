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

## Next

- [ ] **Landing artwork made for it.** No real comic behind the pitch: one
      commissioned hero image (Muse Image), high resolution, plus a section that
      explains what Tales is for whoever wants to dig in. Soften the copy — less
      explicit than "a letter, a key, a dagger".
- [ ] **A cover per comic**, different from its panels: a dedicated cover image
      (title space, the cast, the gem hinted) drawn at the end of the pipeline.
- [ ] **Bubbles vs. a caption strip — to discuss.** Option: dialogue in a strip
      under each panel instead of bubbles on the art. Pros: no placement fights,
      never covers faces or the gem, always in order. Cons: reads less like a
      comic, the art shrinks, a judge may read it as a shortcut. Middle ground:
      keep bubbles, fall back to the strip only when a panel has no good spot.
- [ ] More UX passes from the owner's testing.

## Waiting on a decision

- [ ] **Architecture** — owner leans to Google Cloud + Vercel + the domain
      already paid for Token Comic; Railway is out. Recommendation in the next
      section of the chat: Vercel (web) + Cloud Run Job (pipeline) + Cloud
      Storage (files) + Postgres (comics, collections). Check the contest rules
      on Google services first.
- [ ] **Phone testing** — after the deploy, not with temporary tunnels (owner's call).
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
