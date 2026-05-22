---
name: user-is-choosing-between-shoes
description: "Use when the user has named two or more shoes side by side. Anchor on a comparison table and end with one 'pick this one' button per item so the choice is one click away."
---

# Moment: user is choosing between shoes

The user has named two or more shoes (e.g. "compare the Vaporfly and the Alphafly", "should I get X or Y?"). They're in deciding mode. The lens should make the differences obvious *and* make the decision one click away.

## Likely next turns

After looking at the comparison, the user wants to:

1. **Pick one** of the items (the whole point — primary, one button per item, decisive — `closeOnClick: true`).
2. **Compare against a different shoe** (ghost — route them back to a browsable list of candidates rather than asking for an unspecified addition).

The single most common failure mode here is rendering the comparison and then *forcing the user to type their decision*. Always include "pick this one" buttons. The second-most-common failure is shipping an "Add another to compare" button whose prompt doesn't actually name an item — you don't know which shoe they'd add, so don't pretend; route to a list and let them pick.

## Anchor (prescriptive)

A `column` containing the table followed by the affordance row. The table:

- Single `table` node — do not assemble a comparison out of rows/columns of cards.
- `title`: "X vs Y" for two items, or "Choosing between X, Y, and Z" for three or more.
- `fields`: at least `weight`, `drop`, `cushioning`, `stability`, `durability`. Weight first — most decision-influencing stat. Price is optional and user-preference-gated.
- `items`: one per shoe, in the order the user named them, with `imageSrc` filled.
- `highlightDifferences: true` — the whole point is to make differences obvious.
- The same shape works for 2, 3, or 4 items; do **not** wait for a separate preset to handle three-way comparisons.

## Affordances (the point)

A `row` of buttons after the table:

- **One "Pick the {item}" button per item** (primary, `closeOnClick: true`). The user's keyboard never has to move; once they decide, the comparison comes off screen.
- One ghost "Compare with a different shoe" button whose prompt routes them to a browsable list (e.g. "Show me other all-court shoes I could compare the {A} and {B} against.").

If the user has memorialized "hide price," omit the price row entirely; never render `—` for price.

## Illustrative example — replace every string with real data

```yaml
specVersion: "0.1"
root:
  type: column
  gap: md
  children:
    - type: table
      title: Wave Exceed Tour 6 vs Sprint Pro 4
      fields:
        - key: weight
          label: Weight
        - key: drop
          label: Heel drop
        - key: cushioning
          label: Cushioning
        - key: stability
          label: Stability
        - key: durability
          label: Durability
      items:
        - label: Wave Exceed Tour 6
          subtitle: Mizuno
          imageSrc: <shoeA.imageSrc>
          values:
            weight: 390g
            drop: 9mm
            cushioning: Medium
            stability: High
            durability: High
        - label: Sprint Pro 4
          subtitle: Head
          imageSrc: <shoeB.imageSrc>
          values:
            weight: 350g
            drop: 8mm
            cushioning: Soft
            stability: Medium
            durability: Medium
      highlightDifferences: true
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Pick the Wave Exceed
          prompt: I'll go with the Wave Exceed Tour 6.
          variant: primary
          closeOnClick: true
        - type: button
          label: Pick the Sprint Pro
          prompt: I'll go with the Sprint Pro 4.
          variant: primary
          closeOnClick: true
        - type: button
          label: Compare with a different shoe
          prompt: Show me other all-court shoes I could compare the Wave Exceed Tour 6 and Sprint Pro 4 against.
          variant: ghost
```

## Notes

Table structure is prescriptive (those five core fields in that order, image thumbnails, highlightDifferences on). The "Pick the {name}" button row is also prescriptive — it's what makes the comparison a decision tool instead of a billboard. Pick buttons set `closeOnClick: true` because the choice is final; leaving the comparison on screen would feel stale. Capitalize qualitative values ("Medium", "High"); units on weights and drops. Each button `prompt` must name the specific shoe. The trailing "Compare with a different shoe" button asks for a *list* of candidates rather than for a comparison directly — the user hasn't picked the third shoe yet, so don't fabricate one.
