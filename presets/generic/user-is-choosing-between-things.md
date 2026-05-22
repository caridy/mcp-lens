---
name: user-is-choosing-between-things
description: 'Use when the user has named two or more specific records side by side (or asked something like "X vs Y"). Anchor on a comparison table; end with one "Pick this one" button per item so the choice is one click away.'
---

# Moment: user is choosing between things

The user has named two or more specific records (e.g. "compare X and Y", "should I get A or B?", "X vs Y"). They are in deciding mode. The lens has two jobs: **make the differences obvious**, and **make the decision one click away**.

## How to find the right fields and affordances

You don't know what kind of records these are. To pick the comparison fields:

1. Look at the structured data the upstream tool returned for each record.
2. Identify the **3-6 fields most likely to influence the user's decision**. For products, that's typically technical specs (weight, size, price, performance metrics). For recipes, time / servings / dietary tags / cuisine. For tasks, due date / priority / assignee. Skip fields the user clearly doesn't care about.
3. Order them by importance — the field most likely to swing the decision goes first.

The comparison itself is a single `table` node with the fields you picked. The affordances that follow are **one "Pick this one" button per item** (decisive — `closeOnClick: true`) plus an optional "Compare with a different one" ghost button that **routes the user to a list of candidates** rather than asking for an unspecified addition.

## Anchor (prescriptive)

A `column` containing the table followed by the affordance row. The table:

- Single `table` node — never assemble a comparison out of rows of cards.
- `title`: "X vs Y" for two items, or "Choosing between X, Y, and Z" for three or more.
- `fields`: the 3-6 you identified, in order of importance.
- `items`: one per record, in the order the user named them, with `imageSrc` set if the records have images.
- `highlightDifferences: true` — the whole point is to make differences visually obvious.
- The same shape works for 2, 3, or 4 items. Do **not** wait for a separate preset to handle three-way comparisons.

## Affordances (the point)

After the table, a `row` of buttons:

- **One "Pick the {name}" button per item** (variant: primary, `closeOnClick: true`). Each row's `prompt` should be in the user's voice: "I'll go with {name}." This makes the decision one click and dismisses the comparison once it's made — the whole reason this preset exists.
- **One ghost "Compare with a different one" button** that routes the user to a *list of candidates* instead of asking for an unspecified addition → prompt: "Show me other {category} I could compare {names already in the table} against." The user picks the next candidate from a browse list; *then* you compose a new comparison. Do not write prompts like "Add another shoe to this comparison" — you don't know which one and neither will future-you when the prompt arrives.

If the comparison has too many items (say 4+), the row of "Pick" buttons may get crowded. In that case, drop the "Compare with a different one" ghost rather than the per-item picks — the picks are the point.

## Illustrative example — the structure is prescriptive, every string is illustrative

The example below compares two fictional support plans, but the same shape applies to any "choosing between things" moment.

```yaml
specVersion: "0.1"
root:
  type: column
  gap: md
  children:
    - type: table
      title: Standard Care vs Priority Care
      fields:
        - key: responseTime
          label: Response time
        - key: channels
          label: Channels
        - key: coverage
          label: Coverage
        - key: seats
          label: Included seats
        - key: price
          label: Monthly price
      items:
        - label: Standard Care
          subtitle: Tier 1
          values:
            responseTime: Within 1 business day
            channels: Email
            coverage: Business hours
            seats: "5"
            price: $80
        - label: Priority Care
          subtitle: Tier 2
          values:
            responseTime: Within 2 hours
            channels: Email + Chat
            coverage: 24/5
            seats: "20"
            price: $220
      highlightDifferences: true
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Pick Standard Care
          prompt: I'll go with the Standard Care plan.
          variant: primary
          closeOnClick: true
        - type: button
          label: Pick Priority Care
          prompt: I'll go with the Priority Care plan.
          variant: primary
          closeOnClick: true
        - type: button
          label: Compare with a different plan
          prompt: Show me other support plans I could compare the Standard Care and Priority Care plans against.
          variant: ghost
```

## Notes

Table structure is prescriptive (3-6 fields in importance order, image thumbnails in the item headers when records have photos, highlightDifferences on). The example above omits `imageSrc` because support plans don't have hero photos; include it for any record type that does. The "Pick the {name}" button row is also prescriptive — without it, the comparison is a billboard. The picks set `closeOnClick: true` because the choice is final; leaving the comparison on screen after the user has decided would feel stale. Each "Pick" button's `prompt` must name the specific item. The trailing "Compare with a different…" prompt routes the user to a *list of candidates* — name the category and the items already in play so the upstream server's search tool can produce a sensible browse list. Do not write prompts that ask the agent to add an unspecified item to the comparison directly.
