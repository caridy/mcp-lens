---
name: user-asked-about-a-shoe
description: Use when the user has named one specific shoe and is likely to want to compare it, see similar models, or check availability.
---

# Moment: user asked about one specific shoe

The user named a single shoe (e.g. "tell me about the Speed Blushield 6"). They're not browsing yet — they're focused on this one. Anchor on the shoe; offer the affordances that fit having just learned about it.

## Likely next turns

The two or three things the user is most likely to want next:

1. **Compare with another shoe** (primary — the most common follow-up).
2. **See similar models** (secondary — broaden the consideration set).
3. **Check availability / price** (ghost — only relevant some of the time).

If the user has memorialized a preference to hide pricing, drop the availability/price affordance entirely; don't substitute a placeholder.

## Anchor (prescriptive)

A single `card` with:

- `title`: shoe name.
- `subtitle`: `{brand} · {category}` (e.g. "Diadora · all-court").
- An `image` at top (`aspectRatio: wide`). Tennis shoes are visually driven; lead with the photo.
- A short `text` description (one sentence — the shoe's character, not its full spec sheet).
- A `row` of `badge`s for the levers players actually choose on: weight, cushioning, stability. Three badges max.
- A trailing `row` (`justify: end`) of follow-up buttons.

## Affordances (the point)

End with **2–3 buttons** in this order:

- "Compare with another" → primary
- "See similar" → secondary
- (optional) one more contextual ghost button

Never end with zero buttons. A bare card is a billboard.

## Illustrative example — replace every string with real data

```yaml
specVersion: "0.1"
root:
  type: card
  title: Speed Blushield 6
  subtitle: Diadora · all-court
  children:
    - type: image
      src: <shoe.imageSrc>
      alt: Diadora Speed Blushield 6
      aspectRatio: wide
    - type: text
      text: Balanced all-court shoe with consistent stability.
      variant: body
    - type: row
      gap: sm
      children:
        - type: badge
          label: 380g
        - type: badge
          label: Soft cushion
        - type: badge
          label: Medium stability
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Compare with another
          prompt: Show me all-court shoes I could compare the Speed Blushield 6 against.
          variant: primary
        - type: button
          label: See similar
          prompt: Show me other all-court shoes with similar stability and cushioning to the Speed Blushield 6.
          variant: secondary
```

## Notes

Card structure is prescriptive (image → text → badge row → button row). Every string is illustrative — substitute the actual shoe's data. Each button `prompt` must name the specific shoe; `"Compare"` alone is too vague to be actionable as a typed message. Note that "Compare with another" routes the user to a *list* of comparison candidates rather than asking for a comparison directly — you don't know yet which shoe they want to compare against, so the next turn shows browseable options.
