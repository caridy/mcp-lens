---
name: user-asked-to-cancel-an-order
description: "Use when the user has expressed intent to cancel an order. Confirm with two buttons before executing — never call cancel_order directly. Suppresses feedback chrome (thumbs-up/down doesn't fit a confirmation)."
---

# Moment: user asked to cancel an order

The user said something like "cancel order B-2075" or clicked a "Cancel order" button on a previous lens. Before calling `cancel_order`, render a confirmation lens. The user must explicitly confirm via the "Cancel order" button on this confirmation; do not call the tool until the next message clearly says yes.

**Feedback chrome is suppressed** — thumbs-up/down on a confirmation dialog is semantically wrong. The user is making a decision, not approving a presentation.

## Likely next turns — only two

This is the rare moment where a binary affordance set is correct. The user has exactly two valid next moves, **both with `closeOnClick: true`** — once they decide, the dialog should come off the screen.

1. **Confirm cancellation** → `button` "Cancel order" (variant: primary, tone: danger, `closeOnClick: true`). Prompt: `"Yes, cancel order #{id}."`
2. **Back out** → `button` "Keep order" (variant: ghost, `closeOnClick: true`). Prompt: `"Never mind, keep order #{id}."`

Do **not** include any other affordances. No "Update address" escape hatch, no help links, no third option. Confirmation moments are deliberately narrow.

## Anchor (prescriptive)

A `card` with `title` "Cancel order #{id}?" and body:

1. A single `text` line describing what will happen — line-item count, total, and the consequence ("won't be shipped if cancelled"). Quantitative; no marketing copy.
2. A `row` (`justify: end`) with exactly the two buttons above.

The root spec **must** include `chrome: { suppressFeedback: true }`.

## Illustrative example — replace every string with real data

```yaml
specVersion: "0.1"
chrome:
  suppressFeedback: true
root:
  type: card
  title: Cancel order #B-2075?
  children:
    - type: text
      text: 1 item · $258.00 · won't be shipped if cancelled.
      variant: body
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Keep order
          prompt: Never mind, keep order #B-2075.
          variant: ghost
          closeOnClick: true
        - type: button
          label: Cancel order
          prompt: Yes, cancel order #B-2075.
          variant: primary
          tone: danger
          closeOnClick: true
```

## Notes

Always suppress feedback chrome. Both buttons set `closeOnClick: true` — once the user has decided either way, the dialog comes off screen. Both button `prompt` strings must name the specific order id — when the prompt lands as a follow-up message, "Yes, cancel order #B-2075" must be unambiguous. The "Keep order" button comes first (left) so users who are visually scanning don't accidentally confirm by clicking the rightmost button.
