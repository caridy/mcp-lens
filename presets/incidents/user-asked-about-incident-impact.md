---
name: user-asked-about-incident-impact
description: "Use when the user asks 'what's the impact?' / 'how bad is this?' for a specific incident. Render a focused stat row (3–4 KPIs max) — NOT a six-tile dashboard. Choose the most decision-relevant KPIs first."
---

# Moment: user asked about incident impact

The user wants the *quantitative* picture for a specific incident: customers affected, users impacted, tickets opened, latency numbers. The screenshot's six-tile metrics grid is the SPA anti-pattern — for a chat surface, **3–4 KPIs is the sweet spot**. Pick the most decision-relevant ones; a six-tile dashboard wastes screen and dilutes signal.

## Likely next turns

After looking at impact, the user wants:

1. **What's actually broken?** → "Show recent updates" (timeline).
2. **Who's working on it?** → "Show contributors".
3. **Which customers are affected?** → "List affected accounts".

Pick 2–3 of these.

## Anchor (prescriptive)

A `card` with:

- `title`: `{id} — Impact`.
- `subtitle`: `{severity} · {status} · opened {age}` — same as the summary card so the user knows which incident this is about.
- A `row` of `box` "stat tiles" — **3–4, not 6**. Each box is:
  - `background: subtle`, `padding: md`, `radius: md`.
  - A `column` with `gap: xs` containing:
    - The KPI label as a caption (`variant: caption`, `color: muted` if available — at minimum `variant: caption`).
    - The KPI value as a heading (`variant: heading`), tone-coloured if the data ships a tone hint.
- A trailing `row` (`justify: end`) of follow-up buttons.

Choose the 3–4 KPIs in this priority order:
1. **Customers affected** (the executive-level "how big is this").
2. **Users impacted** (the surface-level "how many people felt it").
3. **Severity-relevant operational KPI** (e.g. "outage duration" for downtime, "p95 delay" for latency, "duplicate events / hr" for data-quality issues, "tickets opened" for support load).
4. (Optional 4th) Whichever of the above didn't fit, OR a recovery KPI like "cache hit rate" if it tells a positive recovery story.

If the incident only ships 1 or 2 KPIs, render only those — don't pad. Empty boxes are worse than a tighter card.

## Affordances (the point)

End with **2–3 buttons**:

- "Show timeline" → primary. Prompt: `"Show the recent timeline for incident {id}."`
- "Who's involved?" → secondary. Prompt: `"Show contributors for incident {id}."`
- "List affected accounts" → ghost (only when the incident touches multiple accounts).

## Illustrative example — every string is fictitious

```yaml
specVersion: "0.1"
root:
  type: card
  title: INC-99001 — Impact
  subtitle: sev1 · mitigated · opened 2 days ago
  children:
    - type: row
      gap: md
      equalWidth: true
      children:
        - type: box
          background: subtle
          padding: md
          children:
            - type: column
              gap: xs
              children:
                - type: text
                  text: Customers affected
                  variant: caption
                - type: text
                  text: "12"
                  variant: heading
                  tone: warning
        - type: box
          background: subtle
          padding: md
          children:
            - type: column
              gap: xs
              children:
                - type: text
                  text: Users impacted
                  variant: caption
                - type: text
                  text: ~480K
                  variant: heading
                  tone: danger
        - type: box
          background: subtle
          padding: md
          children:
            - type: column
              gap: xs
              children:
                - type: text
                  text: Index lag (peak)
                  variant: caption
                - type: text
                  text: 47 min
                  variant: heading
                  tone: warning
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Show timeline
          prompt: Show the recent timeline for incident INC-99001.
          variant: primary
        - type: button
          label: Who's involved?
          prompt: Show contributors for incident INC-99001.
          variant: secondary
        - type: button
          label: List affected accounts
          prompt: List the accounts affected by incident INC-99001.
          variant: ghost
```

## Notes

Stat-tile structure (`box` → `column` of caption + heading) is prescriptive. Use `equalWidth: true` on the row so tiles share width evenly. Tone the value text (NOT the box background) by the KPI's hint. Three tiles is the sweet spot; four if the data clearly justifies it; never six.
