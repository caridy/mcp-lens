---
name: user-asked-about-incident-contributors
description: "Use when the user asks 'who's working on this?' / 'who's involved?' for a specific incident. List the IC and the people authoring updates, with role badges."
---

# Moment: user asked about an incident's contributors

"Who's on this?" / "Who's the IC?" / "Who's been responding?" The IC and the people authoring timeline updates — that's the answer. Render as a list with role badges.

## Likely next turns

1. **Page the IC** (only on open or mitigated incidents). Prompt: `"Page the IC for incident {id}."`
2. **Show recent updates** — the natural pivot from "who's on it" to "what have they been doing".
3. **What's the impact?** — secondary; useful jump if the user landed on contributors first.

## Anchor (prescriptive)

A `card` with:

- `title`: `{id} — Contributors`.
- `subtitle`: `{severity} · {status} · IC {ic}`.
- A `list` (`divider: line`) of contributor rows.

Each contributor row is a `row` (`align: center`, `justify: space-between`) with:

- Left `column` (`gap: xs`):
  - Name as `text` (`variant: heading`).
  - A caption with event count (`"{n} updates posted"`). Skip if count is 0.
- Right `row` of `badge`s for roles. The IC always gets a primary-toned badge ("IC", tone: info or success); authors get a softer ("Author", tone: neutral). Order: IC first, then authors in first-appearance order.

After the list:

- A trailing `row` (`justify: end`) of group-level affordances.

## Affordances (the point)

Two or three buttons; never per-row (a "page this person" button per row is over-paging).

- Open or mitigated: "Page the IC" → primary, tone: warning. Prompt: `"Page the IC for incident {id}."`
- "Show recent updates" → secondary.
- "What's the impact?" → ghost.

If resolved, drop "Page the IC" entirely.

## Illustrative example — every string is fictitious

```yaml
specVersion: "0.1"
root:
  type: card
  title: INC-99001 — Contributors
  subtitle: sev1 · mitigated · IC Hana Tanaka
  children:
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
                  text: Hana Tanaka
                  variant: heading
                - type: text
                  text: 4 updates posted
                  variant: caption
            - type: row
              gap: xs
              children:
                - type: badge
                  label: IC
                  tone: info
                - type: badge
                  label: Author
                  tone: neutral
        - type: row
          align: center
          justify: space-between
          children:
            - type: column
              gap: xs
              children:
                - type: text
                  text: Daniel Reyes
                  variant: heading
                - type: text
                  text: 2 updates posted
                  variant: caption
            - type: row
              gap: xs
              children:
                - type: badge
                  label: Author
                  tone: neutral
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Page the IC
          prompt: Page the IC for incident INC-99001.
          variant: primary
          tone: warning
        - type: button
          label: Show recent updates
          prompt: Show the recent timeline for incident INC-99001.
          variant: secondary
```

## Notes

IC always appears first and always gets the "IC" badge. If the IC also authored events, they get both "IC" and "Author" badges — the IC role is intrinsic, the Author role is observed. Skip the event-count caption when count is 0 (don't render "0 updates posted"). On resolved incidents, drop the "Page the IC" affordance entirely; an "Open postmortem" link belongs on the *summary* card, not here.
