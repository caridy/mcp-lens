---
name: user-is-browsing-orders
description: "Use when the user is looking through a short list of orders. Each row needs its own follow-up button so the user can drill into any order without typing."
---

# Moment: user is browsing orders

The user wants an overview — "show me recent orders", "what's open?", "list everything in processing". They're scanning, not focused on one order yet. Each row has to be immediately actionable so the user can drill into any order with one click.

**The most common mistake is shipping a list with no per-row buttons** — the user then has to type "show me order B-2075" instead of clicking on it. Always include a per-row "Details" affordance.

## Likely next turns

Per row, the user wants to:

1. **See details** for that specific order (secondary — the natural drill-down).

After scanning the list as a whole, optionally:

2. **Filter** to a specific status or recipient (ghost — only when the list might be longer than five).

## Anchor (prescriptive)

A `list` (`divider: line`) with one row per order. Keep it short — **no more than five items**. Beyond five, render five and add a "Show more" or "Filter to..." ghost button.

Each row is a `row` (`align: center`, `justify: space-between`) containing:

- A left-side `column`: order id (`variant: heading`) and a sub-row (date caption + status badge).
- A right-side `row`: total (`variant: body`) and a "Details" button.

## Affordances (the point)

Every row gets a "Details" button → `prompt`: `"Show me details for order #{id}."`

A list without per-row buttons is the failure mode this preset exists to prevent.

## Illustrative example — replace every string with real data

```yaml
specVersion: "0.1"
root:
  type: list
  divider: line
  items:
    - type: row
      align: center
      justify: space-between
      children:
        - type: column
          gap: xs
          children:
            - type: text
              text: Order #B-2075
              variant: heading
            - type: row
              gap: sm
              align: center
              children:
                - type: text
                  text: Placed Mar 14
                  variant: caption
                - type: badge
                  label: Processing
                  tone: info
        - type: row
          gap: md
          align: center
          children:
            - type: text
              text: $258.00
              variant: body
            - type: button
              label: Details
              prompt: Show me details for order #B-2075.
              variant: secondary
```

## Notes

The row layout is prescriptive. Repeat the same shape for each order in the list. Every "Details" button `prompt` must name the specific order id — generic prompts aren't actionable as typed messages. Status badge tone follows the same convention as the order-detail moment (info / success / danger / warning / neutral).
