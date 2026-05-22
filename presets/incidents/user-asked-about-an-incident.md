---
name: user-asked-about-an-incident
description: "Use when the user has named one specific incident. Show its current state and the *most relevant* drill-ins. Affordances are status-aware — a resolved incident gets 'open postmortem'; an open incident gets 'who's the IC' and 'what's the latest update'. Do NOT cram every drill-in into one card; the screenshot's tab pattern is the anti-pattern."
---

# Moment: user asked about one specific incident

The user named an incident ID or said "what's going on with that EKM thing?". They want to know **what state it's in and what to do next** — they do NOT want a six-tile metrics dashboard, three tabs, and a 12-event timeline crammed into one card. That kind of layout is fine in an SPA; it is wrong in a chat surface.

The right shape is a **focused summary card** that surfaces the headline (severity + status + age + IC + a one-sentence summary), and pushes the *full* metrics, timeline, and contributors into separate follow-up moments — each is its own preset (`user-asked-about-incident-impact`, `user-asked-about-incident-timeline`, `user-asked-about-incident-contributors`). The summary's job is to point at those.

## Likely next turns — depend on incident status

The affordances that make sense are tightly coupled to where the incident is in its lifecycle.

- **open** (still affecting customers):
  - "What's the impact?" → primary. Pulls up the impact stat row.
  - "Who's involved?" → secondary. Pulls up contributors.
  - "Show recent updates" → ghost. Pulls up the timeline (most recent 5).
- **mitigated** (workaround in place, fix pending):
  - "What's the impact?" → primary.
  - "Show recent updates" → secondary.
  - "Page the IC" → ghost (only if the user might escalate).
- **resolved** (terminal state):
  - "Open postmortem" → primary, rendered as a `link` (external URL). NOT a button.
  - "Show timeline" → secondary.
  - "Show impact summary" → ghost.

Never offer "page the IC" on a resolved incident. Never offer "open postmortem" on an open one.

## Anchor (prescriptive)

A `card` with:

- `title`: `{id} — {title}` (e.g. "INC-52790 — EKM 500 errors / EKM latency").
- `subtitle`: `{severity} · {status} · IC {ic} · opened {humanized age}`.
- A status `badge` row near the top: severity (sev0=danger, sev1=warning, sev2=info, sev3=neutral) and status (open=warning, mitigated=info, resolved=success).
- A short `text` summary line — one sentence. Do NOT inline the long summary the data ships; keep the card tight.
- A trailing `row` (`justify: end`) of state-appropriate affordances.

If the incident touches multiple accounts, optionally include a "Affects: X, Y, +N" caption line above the buttons. Useful context, doesn't take much room.

## Affordances (the point)

End with **2–3 buttons** drawn from the lifecycle table above. NEVER cram tabs or six metric tiles into the summary card. If the user wants metrics, they'll click "What's the impact?" — and they'll get a card sized for the answer, not a SPA dashboard.

## Illustrative example — every string is fictitious

```yaml
specVersion: "0.1"
root:
  type: card
  title: INC-99001 — Search index ingestion stalled
  subtitle: sev1 · mitigated · IC Hana Tanaka · opened 2 days ago
  children:
    - type: row
      gap: sm
      children:
        - type: badge
          label: sev1
          tone: warning
        - type: badge
          label: Mitigated
          tone: info
    - type: text
      text: Search index ingestion stalled after a kafka topic compaction; switched to fallback consumer, full re-index queued.
      variant: body
    - type: text
      text: "Affects: Magnatech Holdings, Quintar Logistics"
      variant: caption
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: What's the impact?
          prompt: Show the impact for incident INC-99001.
          variant: primary
        - type: button
          label: Show recent updates
          prompt: Show the recent timeline for incident INC-99001.
          variant: secondary
        - type: button
          label: Who's involved?
          prompt: Show contributors for incident INC-99001.
          variant: ghost
```

## Resolved variant (illustrative)

When the incident is **resolved** AND has a `postmortemUrl`, the action row should include an external `link` (not a button) for the postmortem. Substitute the actual URL.

```yaml
type: row
gap: sm
justify: end
children:
  - type: link
    label: Open postmortem
    href: https://internal.example.com/postmortems/INC-99001
    variant: standalone
  - type: button
    label: Show timeline
    prompt: Show the timeline for incident INC-99001.
    variant: secondary
  - type: button
    label: Show impact summary
    prompt: Show the impact for incident INC-99001.
    variant: ghost
```

## Notes

`link` is the right node for the postmortem because it is genuinely external navigation; the user is leaving the conversation. Do NOT use a button with a "Open the postmortem" prompt — the agent can't open URLs, only the user. Severity tone mapping is prescriptive (sev0=danger, sev1=warning, sev2=info, sev3=neutral); don't invent your own. The summary card should NEVER include the full impact KPI grid or the full timeline — those are separate moments.
