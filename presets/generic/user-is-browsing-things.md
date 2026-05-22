---
name: user-is-browsing-things
description: 'Use when the user is looking through a short set of records (search results, "what do you have?"). Render a list with one row per record. Each row MUST carry its own follow-up button(s) — that''s the whole reason this preset exists.'
---

# Moment: user is browsing

The user wants an overview — search results, "what do you have?", "show me the {category}". They're scanning, not yet focused on any one record, not yet comparing. The lens needs to make every row in the list immediately actionable so the user can drill into any record with one click.

**The single most common mistake on this moment is shipping a list with no per-row buttons.** The list shows the data but forces the user to type "show me the second one" or to copy a name into chat. Every row must carry its own follow-up affordance(s).

## How to find the right affordances

Per row, the affordances should let the user **act on this specific record without typing**. Two patterns work for almost any catalog-shaped data:

1. **"Details" / "View" / "Open"** — the natural drill-down. Renders as a follow-up that triggers the *user-asked-about-a-thing* moment for that record. This affordance should be on every row.
2. **"Compare" / "Add to cart" / "Pick this"** — a secondary action that fits the data type. For browsable products, "Compare" sets up the comparison moment. For task lists, "Mark done" might be the equivalent. Skip if nothing fits.

After the list itself, you may also offer:

3. **A single trailing affordance** for the *list as a whole* — "Refine search", "Show more results", "Filter by X". Keep it singular; this is not the place for a navigation menu.

## Anchor (prescriptive)

A `list` (`divider: line`) with one row per record. **Cap at five items**. Beyond five, render five and offer a refinement affordance.

Each row is a `row` (`align: center`) containing, in order:

1. A small `image` (`aspectRatio: square`) if the record has one. Skip if not.
2. A `column` of two text lines: record name (`variant: heading`) and a one-line summary in a caption (`variant: caption`). The caption is the place to surface the most decision-influencing facts ("Brand · Category · Weight", "Cuisine · Time · Servings", "Status · Total · Date").
3. A `row` of follow-up buttons. **Always** include "Details" (or equivalent). Optionally one more action button.

After the list, optionally a single ghost button for the list as a whole.

## Affordances (the point)

This is the moment where the affordance rule matters most. **Every row gets at least one button.**

- "Details" → `prompt`: "Show me details for {record name}."
- (Optional) A second action button whose verb matches the data type:
  - For shoppable records: "Compare" → `prompt`: "Compare {name} with another similar item."
  - For task-shaped records: "Mark done" → `prompt`: "Mark {name} as done."
  - For event-shaped records: "Open" → `prompt`: "Open {name}."

A list without per-row buttons is the failure mode this preset exists to prevent. If you find yourself rendering a row without a button, stop and add one.

## Illustrative example — the structure is prescriptive, every string is illustrative

The example below uses support-ticket records. Substitute the upstream server's real data; pick verbs that match the data type.

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
        - type: column
          gap: xs
          children:
            - type: text
              text: Ticket #INC-4827
              variant: heading
            - type: text
              text: Billing · Open · 2 days old
              variant: caption
        - type: row
          gap: xs
          children:
            - type: button
              label: Details
              prompt: Show me details for ticket #INC-4827.
              variant: secondary
            - type: button
              label: Assign to me
              prompt: Assign ticket #INC-4827 to me.
              variant: ghost
    - type: row
      gap: md
      align: center
      children:
        - type: column
          gap: xs
          children:
            - type: text
              text: Ticket #INC-4831
              variant: heading
            - type: text
              text: Login · Open · 6 hours old
              variant: caption
        - type: row
          gap: xs
          children:
            - type: button
              label: Details
              prompt: Show me details for ticket #INC-4831.
              variant: secondary
            - type: button
              label: Assign to me
              prompt: Assign ticket #INC-4831 to me.
              variant: ghost
    - type: row
      gap: md
      align: center
      children:
        - type: column
          gap: xs
          children:
            - type: text
              text: Ticket #INC-4836
              variant: heading
            - type: text
              text: API · Pending · 1 day old
              variant: caption
        - type: row
          gap: xs
          children:
            - type: button
              label: Details
              prompt: Show me details for ticket #INC-4836.
              variant: secondary
            - type: button
              label: Assign to me
              prompt: Assign ticket #INC-4836 to me.
              variant: ghost
```

## Notes

Repeat the row structure for each record. Every "Details" button `prompt` must name the specific record — generic prompts aren't actionable. The second-button verb (above: "Assign to me") should match the data type; substitute "Compare", "Open", "Mark done", or whatever fits. Image thumbnails were skipped here because tickets don't usually have photos; include an `image` (`aspectRatio: square`) at the start of each row when the records do. Keep the list short; if the upstream returned more than five matches, render five and add a final ghost button like "Show more" with a refinement prompt.
