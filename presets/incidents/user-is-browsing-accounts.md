---
name: user-is-browsing-accounts
description: Use when the user is looking through a small set of accounts. Each row shows tier + region + a per-row Details button so the user can drill in without typing.
---

# Moment: user is browsing accounts

The user wants an overview ("what accounts do we have?", "list our enterprise customers"). Each row needs its own per-row affordance — a list without per-row buttons forces the user to type to drill into anything.

## Likely next turns — per row

1. **See details** for that account (secondary).
2. **See open incidents** for that account (ghost; sometimes the more useful drill-in).

After the list, optionally:

3. A single ghost "Filter to {tier|region}" button if more than 5 accounts.

## Anchor (prescriptive)

A `list` (`divider: line`) with one row per account, **cap at five**.

Each row is a `row` (`align: center`, `justify: space-between`) with:

- Left `column`: account name (`variant: heading`) and a sub-row (tier badge + region caption).
- Right `row`: "Details" button (secondary) and "Open incidents" button (ghost).

## Illustrative example — every string is fictitious

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
              text: Magnatech Holdings
              variant: heading
            - type: row
              gap: sm
              align: center
              children:
                - type: badge
                  label: Enterprise
                  tone: info
                - type: text
                  text: APAC-South
                  variant: caption
        - type: row
          gap: xs
          children:
            - type: button
              label: Details
              prompt: Show me details for Magnatech Holdings.
              variant: secondary
            - type: button
              label: Open incidents
              prompt: Show open incidents for Magnatech Holdings.
              variant: ghost
```

## Notes

- Repeat the row shape per account.
- Every button `prompt` MUST name the specific account — generic prompts aren't actionable as typed messages.
- Keep the list short; if there are more than 5, render 5 and add a single ghost "Show more" with a refinement prompt.
