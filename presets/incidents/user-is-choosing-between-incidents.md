---
name: user-is-choosing-between-incidents
description: "Use when the user is comparing two or more incidents — typically 'are these duplicates?' or 'which is worse?'. Anchor on a comparison table and offer 'Pick this as the primary' affordances per item, plus a route-to-browse for adding a different one."
---

# Moment: user is choosing between incidents

The user has named two or more incidents and wants to compare them ("are INC-12345 and INC-12346 duplicates?", "which is the bigger fire?"). Same shape as the shoes-comparison and orders-comparison demos: a `table`, with picks per item.

## Why someone compares incidents

Two reasons drive 95% of these:

1. **Duplicate detection.** Two open incidents that might be the same root cause. The user wants to see them side by side and merge one into the other.
2. **Severity triage.** Two open incidents during a busy period; the user wants to know which to prioritize.

Both reasons fit the same shape. The "pick this one" affordance varies:

- For dupes: "Mark this as primary" (and the other becomes a duplicate of it).
- For triage: "Focus on this one" (in practice, the user just wants to drill in).

You don't always know which case the user is in. **Default to "Drill into this one"** as the primary action — it's the lowest-stakes, useful regardless. If the user says "are these dupes?", you can switch to "Mark as primary".

## Anchor (prescriptive)

A `column` containing the table followed by the affordance row. Table:

- Single `table` node.
- `title`: `"{first id} vs {second id}"` (or `"Comparing X, Y, and Z"` for 3+).
- `fields`: at least `severity`, `status`, `age`, `ic`, `customers affected`, `one impactful KPI`. Severity first.
- `items`: one per incident, in the order the user named them.
- `highlightDifferences: true`.
- 2–4 incidents max. Beyond that, the table gets unreadable; offer a list-with-filters instead.

After the table:

- A `row` of "Drill into {id}" buttons (`closeOnClick: true` — the comparison moment is over once the user has picked one).
- One ghost "Compare against a different incident" button whose prompt routes the user to a *list of candidates*, NOT a fabricated next addition.

## Affordances (the point)

Per item: "Drill into {id}" → primary, `closeOnClick: true`. Prompt: `"Show details for incident {id}."`

Plus one ghost: "Compare against a different incident" — route-to-browse. Prompt: `"Show me other open incidents I could compare {first id} and {second id} against."` Do NOT write `"Add another incident to this comparison."` — you don't know which incident the user wants, so don't fabricate.

## Illustrative example — every string is fictitious

```yaml
specVersion: "0.1"
root:
  type: column
  gap: md
  children:
    - type: table
      title: INC-99001 vs INC-99005
      fields:
        - key: severity
          label: Severity
        - key: status
          label: Status
        - key: age
          label: Opened
        - key: ic
          label: IC
        - key: customers
          label: Customers affected
        - key: impact
          label: Headline impact
      items:
        - label: INC-99001
          subtitle: Search index ingestion stalled
          values:
            severity: sev1
            status: Mitigated
            age: 2 days ago
            ic: Hana Tanaka
            customers: "12"
            impact: Index lag 47 min
        - label: INC-99005
          subtitle: Search query timeouts
          values:
            severity: sev2
            status: Open
            age: 1 day ago
            ic: Daniel Reyes
            customers: "5"
            impact: p95 query 9.4s
      highlightDifferences: true
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Drill into INC-99001
          prompt: Show details for incident INC-99001.
          variant: primary
          closeOnClick: true
        - type: button
          label: Drill into INC-99005
          prompt: Show details for incident INC-99005.
          variant: primary
          closeOnClick: true
        - type: button
          label: Compare against a different incident
          prompt: Show me other open incidents I could compare INC-99001 and INC-99005 against.
          variant: ghost
```

## Notes

Severity column comes first because it's the field that drives the most decisions. `closeOnClick: true` on the drill-in buttons because the comparison moment is over once the user picks. The "Compare against a different incident" prompt routes to a list — never fabricates a new incident ID. Subtitle on each table item carries the human-readable title; the column header carries the ID. Capitalize qualitative status values (`"Mitigated"`, `"Open"`).
