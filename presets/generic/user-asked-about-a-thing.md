---
name: user-asked-about-a-thing
description: "Use when the user has named one specific record (a product, a recipe, an order, a contact, etc.) and is likely to want to act on it, see related items, or drill into specifics. Anchor on a card; offer 2-3 follow-ups."
---

# Moment: user asked about one specific thing

The user named a single record (e.g. "tell me about X", "show me the Y", "what does Z look like?"). They are not yet browsing or comparing — they are focused on this one thing. The lens anchors on the record and offers the small set of follow-ups that fit having just learned about it.

## How to find the right affordances

You don't know what kind of record the upstream server is serving. Look at the data the upstream tool returned and ask:

1. **What's the most natural follow-up given what this record IS?** A product → compare, see similar, check availability. A recipe → adjust servings, start cooking, see substitutions. An order → take a state-appropriate action. A contact → message, call, see history.
2. **What's the lateral move?** "See similar X" almost always makes sense if the catalog has multiples. Use the search tool the upstream server already exposes.
3. **What's the small-but-useful detail follow-up?** Often pricing, availability, or a related metric — but only if the user might plausibly want it next.

Pick 2-3 of these. Mix variants: one **primary** (the most likely next move), one or two **secondary** or **ghost**.

## Anchor (prescriptive)

A single `card` with:

- `title`: the record's display name.
- `subtitle` (optional): a short categorization or sub-identity (e.g. "Brand · Category", "Cuisine · Time", "Account ID · Status").
- An `image` near the top if the record has one. Use `aspectRatio: wide` for hero-style; `square` if it shares a row with text.
- A short `text` description (one line — the record's character, not a full spec sheet).
- An optional `row` of `badge`s for the most decision-influencing labels. Three max.
- A trailing `row` (`justify: end`) of follow-up buttons.

If the upstream record has multiple images, prefer the first/primary one as the hero and reserve the others for the user requesting more.

## Affordances (the point)

End with **2-3 buttons** in this order:

1. **Primary** — the single most likely next move. Specific to the data type.
2. **Secondary** — a lateral broadening (e.g. "see similar", "compare with another").
3. **Ghost** (optional) — a contextual detail follow-up (e.g. "check availability", "see history").

Never end with zero buttons. A bare card is a billboard.

Each button's `prompt` must:
- Be in the **user's voice** ("Compare this with another", not "call the compare tool").
- **Name the specific record by its display name** (e.g. "Show me details for ticket #INC-4827") so the prompt is unambiguous if it lands as a typed message.
- **Not assume a choice the user hasn't made yet.** If the affordance is "Compare with another", "Add another", or any verb that requires a *second* item the user hasn't picked, write the prompt to **route the user back to a list of candidates** ("Show me other open tickets I could compare ticket #INC-4827 against.") rather than asking the agent to fabricate one ("Add another ticket to this comparison."). The next turn renders a list; the user picks; *then* you compose the comparison.

## Illustrative example — the structure is prescriptive, every string is illustrative

This example uses a *support ticket* record, but the same shape applies to any kind of single-record moment. Substitute real data from the upstream server's response.

```yaml
specVersion: "0.1"
root:
  type: card
  title: Ticket #INC-4827
  subtitle: Account-billing · Open · 2 days old
  children:
    - type: text
      text: Customer reports a duplicate monthly charge after upgrading their plan last week.
      variant: body
    - type: row
      gap: sm
      children:
        - type: badge
          label: High priority
          tone: warning
        - type: badge
          label: Billing
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Assign to me
          prompt: Assign ticket #INC-4827 to me.
          variant: primary
        - type: button
          label: See related tickets
          prompt: Show me other open billing tickets like ticket #INC-4827.
          variant: secondary
        - type: button
          label: View customer history
          prompt: Show me the account history for the customer on ticket #INC-4827.
          variant: ghost
```

## Notes

Card structure (image → text → badge row → button row) is prescriptive — though the image is optional and was skipped here because tickets don't usually have hero photos. Title, subtitle, badge text, and every button's label and prompt are illustrative — write what fits the actual record from the upstream server. The button prompts above use ticket-specific verbs ("assign", "view history") because the example is a ticket; for a *product*, the equivalent would be ("compare", "see specs", "check stock"); for a *recipe*, ("rescale", "see similar", "substitute"). **Pick verbs that match the data type.**
