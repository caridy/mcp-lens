---
name: user-is-browsing-incidents
description: "Use when the user is looking at a list of incidents (open incidents, recent incidents, incidents for an account). Each row needs its own Details button. The combined-with-account variant surfaces account context above the list."
---

# Moment: user is browsing incidents

The user wants a scan: "what's open?", "show me recent incidents", "top 3 incidents for Globex this year". Each row needs to be one click from drilling in.

The most common mistake is shipping a list with no per-row buttons — the user is forced to type "show me INC-12345" instead of clicking on the row. Always include a per-row "Details" affordance.

## Likely next turns

Per row:

1. **Details** for that incident (secondary).

After the list, optionally:

2. **Filter** by status or severity (ghost — only when the list might be longer).

## Anchor (prescriptive)

A `list` (`divider: line`) with one row per incident, **cap at five**. Beyond five, render five and offer a refinement.

Each row is a `row` (`align: center`, `justify: space-between`) with:

- Left `column`:
  - First line: `text` (`variant: heading`) with the incident ID and title joined: `"{id} — {title}"`.
  - Second line (a sub-row): the severity badge, the status badge, and a caption with the relative age. Severity tone: sev0=danger, sev1=warning, sev2=info, sev3=neutral. Status tone: open=warning, mitigated=info, resolved=success.
- Right: a "Details" button (secondary).

## Combined-with-account variant (when the user asked "incidents for X")

When the user's prompt scoped the list to a specific account ("top 3 incidents for Magnatech this quarter"), wrap the list in a `column` with a small **account header** card on top:

- A compact `card` (no `size` constraint, default `md`) with the account name as title, tier+region as subtitle, and a single "Show account details" button as the only affordance. This gives the user one click to context-switch to the account moment.

This is the canonical example of preset combination: `user-asked-about-an-account` (compact form) + `user-is-browsing-incidents`. The agent reads both presets and composes them in a single lens.

## Affordances (the point)

Every row gets a "Details" button → `prompt`: `"Show details for incident {id}."`

A list without per-row buttons is the failure mode this preset exists to prevent.

## Illustrative example — list-only — every string is fictitious

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
              text: INC-99001 — Search index ingestion stalled
              variant: heading
            - type: row
              gap: sm
              align: center
              children:
                - type: badge
                  label: sev1
                  tone: warning
                - type: badge
                  label: Mitigated
                  tone: info
                - type: text
                  text: opened 2d ago
                  variant: caption
        - type: button
          label: Details
          prompt: Show details for incident INC-99001.
          variant: secondary
```

## Illustrative example — combined-with-account variant — every string is fictitious

```yaml
specVersion: "0.1"
root:
  type: column
  gap: md
  children:
    - type: card
      title: Magnatech Holdings
      subtitle: enterprise · APAC-South
      children:
        - type: row
          gap: sm
          justify: end
          children:
            - type: button
              label: Show account details
              prompt: Show me details for Magnatech Holdings.
              variant: ghost
    - type: list
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
                  text: INC-99001 — Search index ingestion stalled
                  variant: heading
                - type: row
                  gap: sm
                  align: center
                  children:
                    - type: badge
                      label: sev1
                      tone: warning
                    - type: badge
                      label: Mitigated
                      tone: info
                    - type: text
                      text: opened 2d ago
                      variant: caption
            - type: button
              label: Details
              prompt: Show details for incident INC-99001.
              variant: secondary
```

## Notes

The combined variant is a *root `column`* containing the account header card and the list — not a single card with both inside. This keeps the account context visually separate from the per-incident rows. The header card has no body text (the title+subtitle is enough); just one "Show account details" affordance. Per-row buttons stay on every incident row regardless. Combination is the canonical mechanism for cross-domain views in MCP Lens — the same idea applies to "show me my orders and the shoes I bought" (orders + shoes).
