---
name: user-is-browsing-shoes
description: 'Use when the user is looking through a short set of shoes (search results, "what do you have?"). Each row needs its own follow-up buttons so the user can drill into or compare any item without typing.'
---

# Moment: user is browsing shoes

The user wants an overview — search results, "what shoes do you have?", "show me Asics in stock". They're not yet focused on one shoe, and they're not yet comparing. They're scanning. The lens needs to make every row in the list immediately actionable, so the user can drill into or compare any item with one click.

**The most common mistake on this moment is shipping a list with no per-row buttons** — it shows the data but forces the user to type "show me the second one" or "compare A and B" by name. Always include per-row affordances.

## Likely next turns

Per row, the user wants to:

1. **See details** for that specific shoe (secondary — the natural drill-down).
2. **Compare** that shoe with another (ghost — sets up the comparison moment).

After scanning the list as a whole, the user might also want to:

3. **Refine the search** (a single ghost button at the end of the lens).

## Anchor (prescriptive)

A `list` with `divider: line`, containing one row per shoe. Keep it short — **no more than five items**. Beyond five, suggest a refinement instead of dumping everything.

Each row is a `row` (`align: center`) containing, in order:

- A small `image` (`aspectRatio: square`).
- A `column` of two text lines: shoe name (`variant: heading`) and a one-line summary (`variant: caption`, e.g. "Nike · all-court · 415g").
- A `row` of two follow-up buttons: "Details" (secondary) and "Compare" (ghost).

After the list, optionally a single ghost button to refine the search.

## Affordances (the point)

This is the moment where the affordance rule matters most. Every row gets:

- "Details" button → `prompt`: "Show me details for the {brand} {name}."
- "Compare" button → `prompt`: "Compare the {brand} {name} with another all-court shoe." (or whichever category fits)

A list without per-row buttons is the failure mode this preset exists to prevent.

## Illustrative example — replace every string with real data

```yaml
specVersion: "0.1"
root:
  type: list
  divider: line
  items:
    - type: row
      gap: md
      align: center
      children:
        - type: image
          src: <shoe.imageSrc>
          alt: Nike Court Lite 4
          aspectRatio: square
        - type: column
          gap: xs
          children:
            - type: text
              text: Court Lite 4
              variant: heading
            - type: text
              text: Nike · all-court · 415g
              variant: caption
        - type: row
          gap: xs
          children:
            - type: button
              label: Details
              prompt: Show me details for the Nike Court Lite 4.
              variant: secondary
            - type: button
              label: Compare
              prompt: Compare the Nike Court Lite 4 with another all-court shoe.
              variant: ghost
```

## Notes

The row layout is prescriptive (image → text column → two-button row). Repeat the same shape for each item in the list. Every button `prompt` must name the specific shoe — generic prompts like "Compare" with no shoe name aren't actionable as a typed message. Keep the list short; if you have more than five matches, render five and add a final ghost button like "Show more results" with a refinement prompt.
