# Why identity resolution is a separate step

SAM 3.1 tracks an object beautifully *inside* a shot. It does not carry identity
across a panel cut — and it should not be expected to. This is the measurement
behind that claim, and the design that follows from it.

## What SAM returns

Running `sam-3.1` over a four-panel chapter, with the clip holding each panel for
15 frames and the prompt `"white paper document"`:

```
panel 1 → objId 0   box 215,536 → 527,716   conf 0.957   (15 frames, stable)
panel 2 → objId 1   box 244,432 → 699,736   conf 0.953   (15 frames, stable)
panels 0, 3 → no detection
```

Both detections are correct. Neither is a false positive. **But the two panels
come back under different object ids.**

Inside a panel the track is rock solid — fifteen consecutive frames, same box to
the pixel. Across the cut it starts over. SAM was trained on real footage, where
an object moves a little between frames; a panel cut changes the angle, the
lighting, the distance and who is holding the thing. That reads as a new scene,
so it opens a new track. Correct behaviour, wrong question for comics.

## Asking a second model, and getting it wrong

The obvious fix is to ask a multimodal model whether the two crops are the same
thing. Asked plainly — *"are these the same physical object?"* — `muse-wonder-1.0`
answered:

```json
{
  "same_object": false,
  "confidence": 0.67,
  "reason": "The pristine text-only sheet and the heavily crumpled sheet with a
             diagram inset are different printed copies of the report."
}
```

It is right. One sheet is flat and text-only; the other is creased and has a
boxed diagram. As forensics, that is two sheets of paper.

As a comic, it is one report.

## The fix is the prompt, not the model

A comic draws the same object differently in every panel — and that is true of
hand-drawn comics too, not just generated art. Different angle, different
shadows, and creased if a character has been gripping it. The damage is not a
continuity error; **it is the story**. The crumpled sheet tells you someone
clenched it.

So the question has to carry the plot. Given the chapter title, who finds the
object and who they hand it to, the reading order of the panels, and one explicit
instruction — *line-level differences are expected and are NOT evidence of a
different object* — the same model, on the same two images, answered:

```json
{
  "same_story_object": true,
  "confidence": 0.95,
  "reason": "Both panels show the same titled 'P256 Flaw Report' that Nyx found
             and later shows to Wesley.",
  "object_label": "P256 Flaw Report paper",
  "visible_changes": "The flat sheet held by gloved hands over a desk becomes
                      creased and crumpled while held and pointed at by bare
                      hands."
}
```

From 0.67 *no* to 0.95 *yes*. The model did not change. The question did.

## Why not compare the crops ourselves

Histogram or embedding similarity was the first thing considered and rejected
before it was written. The two crops here are 312×180 and 455×304, shot from
different angles under different light, and one of them is crumpled. A white
sheet of paper resembles every other white sheet of paper in colour space, and
resembles itself poorly from a new angle.

Any threshold that separates these two correctly would be a threshold fitted to
*this* chapter. That is not identity resolution; it is overfitting with extra
steps.

## Two things that fell out of it

The narrative framing produced two fields that were not the goal:

- **`object_label`** — `"P256 Flaw Report paper"`. A short noun phrase, which is
  exactly what SAM requires as a prompt; a list like `"document, phone"` returns
  nothing at all. The system can name the object it is about to track, instead of
  making the reader name it.

- **`visible_changes`** — what happened to the object between appearances. That
  is usable narrative, and it feeds the collectible's description.

## The design

```
SAM 3.1          finds and segments the object, panel by panel
Muse Wonder      decides which tracks are one story object, with the plot in hand
Muse Image       reveals that object as the collectible, from the real crop
```

Each model is asked the question it is good at. The one nobody is good at —
"is this the same thing in the story?" — is the one that needed the context.
