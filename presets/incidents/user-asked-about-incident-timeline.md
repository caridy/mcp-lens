---
name: user-asked-about-incident-timeline
description: "Use when the user asks 'what happened?' / 'show me the timeline' / 'what's the latest update' for an incident. Render the 5 most recent events as a list with type-badged rows. NO per-row buttons — timeline events don't drill in. Group-level affordances at the bottom."
---

# Moment: user asked about an incident's timeline

The user wants the chronology — what happened, when, who did what. Unlike the rest of the moments in this server, **timeline events don't have meaningful per-row drill-ins**. Clicking on "AWS evicted Tardigrade host" doesn't lead anywhere useful. So this is the **rare exception** to the per-row-buttons rule: the *whole list* gets affordances at the bottom, not each row.

## Default cap

**Show the 5 most recent events**, newest first. The screenshot's 12-event list works in an SPA but overflows a chat surface. If the incident has more events, the trailing affordance row should include "Show full history" with a prompt that names the incident.

## Likely next turns

1. **Show full history** if there are more events than the cap. Prompt: `"Show me every event on incident {id}."`
2. **Filter to {type}** — most useful is "Show only updates" or "Show only impact events". Optional; only worth offering when the user has been browsing for a while.
3. **What's the impact?** → secondary or ghost. Useful jump if the user got dropped into the timeline first.

## Anchor (prescriptive)

A `card` with:

- `title`: `{id} — Timeline`.
- `subtitle`: `{severity} · {status} · IC {ic}` — same context anchor as the other incident moments.
- A `list` (`divider: line`) of event rows, capped at 5, newest first.

Each event row is a `row` (`align: start`, `justify: space-between`) containing:

- Left `column` (`gap: xs`):
  - Sub-row of two captions: relative time (`{at humanized}`) and author (`{author}`). Use `variant: caption` on both.
  - Body text `text` with the event content (`variant: body`, no truncation).
- Right: a single `badge` for the event type, tone-coloured:
  - `Impact` → danger
  - `Recovery` → success
  - `Action` → info
  - `RootCauseLead` → discovery (or `info` if the renderer doesn't have discovery)
  - `Update` → neutral

After the list:

- A trailing `row` (`justify: end`) of group-level affordances. Two buttons is plenty; the user can click "Show full history" or jump to the impact moment.

## Affordances (the point — exception case)

This is the one moment where per-row affordances would be noise, not signal. Every event has a meaningful *type* (badge) and that's enough. The affordances live at the bottom and operate on the *list as a whole*.

If the cap kicks in (>5 events on the incident), include "Show full history" as a primary button. Otherwise, "What's the impact?" is the better primary.

## Illustrative example — every string is fictitious

```yaml
specVersion: "0.1"
root:
  type: card
  title: INC-99001 — Timeline
  subtitle: sev1 · mitigated · IC Hana Tanaka
  children:
    - type: list
      divider: line
      items:
        - type: row
          align: start
          justify: space-between
          children:
            - type: column
              gap: xs
              children:
                - type: row
                  gap: sm
                  children:
                    - type: text
                      text: 12 minutes ago
                      variant: caption
                    - type: text
                      text: Hana Tanaka
                      variant: caption
                - type: text
                  text: Switched search ingest to fallback consumer; full re-index queued.
                  variant: body
            - type: badge
              label: Recovery
              tone: success
        - type: row
          align: start
          justify: space-between
          children:
            - type: column
              gap: xs
              children:
                - type: row
                  gap: sm
                  children:
                    - type: text
                      text: 47 minutes ago
                      variant: caption
                    - type: text
                      text: Daniel Reyes
                      variant: caption
                - type: text
                  text: Identified compaction on the kafka 'search-events' topic as likely root cause.
                  variant: body
            - type: badge
              label: RootCauseLead
              tone: info
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Show full history
          prompt: Show me every event on incident INC-99001.
          variant: primary
        - type: button
          label: What's the impact?
          prompt: Show the impact for incident INC-99001.
          variant: secondary
```

## Notes

Type-badge tone mapping is prescriptive — Impact is the most alarming (danger), Recovery is the most reassuring (success), Action and Update are operational (info / neutral), RootCauseLead is investigative (info or discovery). Cap at 5 newest. Group affordances live below the list, not on each row. If the incident has fewer than 5 events, show all of them and skip "Show full history".
