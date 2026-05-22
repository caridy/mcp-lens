---
name: user-asked-about-an-account
description: Use when the user has named one specific account. Show its tier and identity, then offer drill-ins for active incidents and recent history.
---

# Moment: user asked about one specific account

The user named an account ("tell me about Globex", "what's the status with Initech?"). Anchor on the account; offer affordances that surface what's *currently happening* with that account.

## Likely next turns

The user almost always wants one of:

1. **What's currently broken for them?** — open incidents on this account.
2. **What broke recently?** — top recent incidents, regardless of status.
3. **Who do I talk to?** — the primary contact, surfaced as a label/badge or a "Show contact" follow-up.

Pick 2–3 of these as buttons. Tier and region inform tone but rarely the affordance set on their own.

## Anchor (prescriptive)

A single `card` with:

- `title`: account name.
- `subtitle`: `{tier} · {region}`.
- A short `text` summary line — the account's one-sentence character.
- A `row` of `badge`s for tier (info or success), region (neutral), and primary contact (caption-style; consider rendering primary contact as text rather than a badge if it's long).
- A trailing `row` (`justify: end`) of follow-up buttons.

## Affordances (the point)

End with **2–3 buttons**. Suggested defaults:

- "Show open incidents" → primary. Prompt: `"Show open incidents for {account}."`
- "Top recent incidents" → secondary. Prompt: `"Show the top 3 most recent incidents for {account}."`
- "Show contact" → ghost (skip if the contact is already visible inline).

## Illustrative example — every string is fictitious

```yaml
specVersion: "0.1"
root:
  type: card
  title: Magnatech Holdings
  subtitle: enterprise · APAC-South
  children:
    - type: text
      text: Manufacturing telemetry pipeline. Heavy users of Files API and Workflow Engine; sensitive to ingest-time latency.
      variant: body
    - type: row
      gap: sm
      children:
        - type: badge
          label: Enterprise
          tone: info
        - type: badge
          label: APAC-South
        - type: badge
          label: "Contact: Hana Tanaka"
          tone: neutral
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Show open incidents
          prompt: Show open incidents for Magnatech Holdings.
          variant: primary
        - type: button
          label: Top recent incidents
          prompt: Show the top 3 most recent incidents for Magnatech Holdings.
          variant: secondary
```

## Notes

Card structure is prescriptive (text → badges → button row). Badges should be tone-appropriate (`info` for tier, neutral for region/contact). The "Show open incidents" button uses the primary slot because it surfaces *currently broken* — almost always what the user wants to know.
