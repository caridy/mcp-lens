---
name: user-asked-about-an-order
description: "Use when the user has named one specific order. Show its status and line items, then offer the affordances appropriate to the order's current state — never invent actions that don't apply."
---

# Moment: user asked about one specific order

The user named an order id (e.g. "what's the status of B-2075?", "show me my last order"). They want to know where it stands and, often, do something about it. Anchor on the order; offer state-appropriate next-turn affordances.

## Likely next turns — depend on order status

The affordances that make sense are tightly coupled to the order's current state. Never offer an action that doesn't apply.

- **pending** or **processing** (order can still be modified):
  - "Cancel order" → `button` (variant: ghost, tone: danger). Always confirm before executing.
  - "Update address" → `button` (variant: secondary).
- **shipped** (order is in transit):
  - "Track shipment" → `link` (variant: standalone) pointing at the carrier's tracking URL. Use `link` here, not `button` — tracking is external navigation, not a conversational follow-up.
  - "Contact support" → `button` (variant: ghost) for "I need help with order #X".
- **delivered** or **cancelled** (terminal states):
  - No state-changing affordances. Optionally a single ghost "Contact support" button if there's a problem the user might raise.

## Anchor (prescriptive)

A `card` with the order id as title and "{date} · {status}" as subtitle. Body:

1. A status `badge` with a tone matching the status (info for processing, success for delivered, danger for cancelled, warning for pending, neutral for shipped).
2. A `list` (divider: line) of line item rows — name + qty + price caption per row.
3. A `row` (justify: space-between) with "Total" label and total price (variant: heading on the right).
4. A trailing `row` (justify: end) of state-appropriate affordances.

## Illustrative example — replace every string with real data

This example shows the **processing** state. For shipped orders, swap the action row for a tracking link (see the variant below).

```yaml
specVersion: "0.1"
root:
  type: card
  title: Order #B-2075
  subtitle: Placed Mar 14 · Processing
  children:
    - type: badge
      label: Processing
      tone: info
    - type: list
      divider: line
      items:
        - type: row
          justify: space-between
          align: center
          children:
            - type: text
              text: Yonex EZONE 100 racquet × 1
            - type: text
              text: $240.00
              variant: caption
    - type: row
      justify: space-between
      children:
        - type: text
          text: Total
          variant: label
        - type: text
          text: $258.00
          variant: heading
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Update address
          prompt: I want to change the shipping address for order #B-2075.
          variant: secondary
        - type: button
          label: Cancel order
          prompt: Cancel order #B-2075.
          variant: ghost
          tone: danger
```

## Shipped variant (illustrative)

When the status is **shipped**, replace the action row with a tracking link. Substitute the actual tracking URL the carrier provides:

```yaml
type: row
gap: sm
justify: end
children:
  - type: link
    label: Track shipment
    href: https://www.ups.com/track?tracknum=1Z999XX98765432109
    variant: standalone
```

## Notes

Card structure (badge → line items list → total → action row) is prescriptive. Affordances are status-dependent — never invent actions that don't apply. Every button `prompt` must name the specific order id. Links must use real http(s) URLs — no placeholders. The "Cancel order" button is the request to cancel; it should trigger the cancel-confirmation moment (see the `user-asked-to-cancel-an-order` preset), not the cancellation itself.
