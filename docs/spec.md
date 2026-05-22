# Lens spec reference

**Version:** `0.1`

This document is the canonical reference for the JSON shape a lens takes. The TypeScript types in `packages/mcp-lens/src/spec/types.ts` and the zod validator in `packages/mcp-lens/src/spec/schema.ts` are the source of truth; this doc mirrors them.

## Root

Every lens has three fields at the root:

| Field | Type | Required | Notes |
|-|-|-|-|
| `specVersion` | `"0.1"` | ✅ | Only `0.1` is accepted today. Bumping is a breaking change. |
| `chrome` | `LensChrome` | ◯ | Renderer chrome options (see below). |
| `root` | `LensNode` | ✅ | The single outermost node of the lens. |

### `LensChrome`

| Field | Type | Default | Notes |
|-|-|-|-|
| `suppressFeedback` | `boolean` | `false` | Hide the thumbs-up/down feedback affordance. Use sparingly — confirmations, destructive-action prompts. |

## Nodes

Every node has a `type` field that discriminates the shape. Containers take `children: LensNode[]`; leaves are terminal.

### Containers

#### `box`

Plain container. No visual styling unless specified.

| Field | Type | Notes |
|-|-|-|
| `padding` | `Spacing` | ◯ |
| `background` | `"none" \| "subtle" \| "muted"` | ◯ |
| `children` | `LensNode[]` | ✅ |

#### `column`

Vertical stack.

| Field | Type | Notes |
|-|-|-|
| `gap` | `Spacing` | ◯ |
| `align` | `AlignCrossAxis` | ◯ — cross-axis alignment |
| `children` | `LensNode[]` | ✅ |

#### `row`

Horizontal stack. Wraps on narrow widths.

| Field | Type | Notes |
|-|-|-|
| `gap` | `Spacing` | ◯ |
| `align` | `AlignCrossAxis` | ◯ |
| `justify` | `JustifyMainAxis` | ◯ |
| `equalWidth` | `boolean` | ◯ — children share width equally |
| `children` | `LensNode[]` | ✅ |

#### `card`

Elevated surface. Built-in padding and border.

| Field | Type | Notes |
|-|-|-|
| `title` | `string` | ◯ |
| `subtitle` | `string` | ◯ |
| `padding` | `Spacing` | ◯ — defaults to `md` |
| `children` | `LensNode[]` | ✅ |

#### `list`

Collection of items.

| Field | Type | Notes |
|-|-|-|
| `items` | `LensNode[]` | ✅ |
| `divider` | `"none" \| "line"` | ◯ — defaults to `"none"` |

### Content primitives

#### `text`

| Field | Type | Notes |
|-|-|-|
| `text` | `string` | ✅ |
| `variant` | `TextVariant` | ◯ — defaults to `"body"` |
| `tone` | `Tone` | ◯ |

#### `markdown`

| Field | Type | Notes |
|-|-|-|
| `markdown` | `string` | ✅ — rendered via a minimal, escape-safe markdown subset |

Supports: paragraphs, `**bold**`, `*italic*`, `` `code` ``, `[links](url)`, bullet/numbered lists, horizontal rules. HTML is always escaped.

#### `image`

| Field | Type | Notes |
|-|-|-|
| `src` | `string` (URL) | ✅ — must be a valid `http(s)://` URL |
| `alt` | `string` | ✅ — accessibility |
| `aspectRatio` | `"square" \| "video" \| "wide" \| "portrait"` | ◯ |
| `fit` | `"cover" \| "contain"` | ◯ — defaults to `cover` |

#### `badge`

| Field | Type | Notes |
|-|-|-|
| `label` | `string` | ✅ |
| `tone` | `Tone` | ◯ — defaults to `neutral` |

#### `separator`

Visual divider. No fields.

### Interactive

#### `button`

Conversational action. Clicking emits `prompt` to the agent as a follow-up message.

| Field | Type | Notes |
|-|-|-|
| `label` | `string` | ✅ — non-empty |
| `prompt` | `string` | ✅ — non-empty, user-voice, **self-sufficient** (must name the thing acted on; the lens won't be in scope when the prompt arrives) |
| `variant` | `"primary" \| "secondary" \| "ghost"` | ◯ |
| `tone` | `Tone` | ◯ |
| `closeOnClick` | `boolean` | ◯ — when true, the renderer asks the host to dismiss the widget (`window.openai.requestClose`) after emitting the prompt. Set on **decisive** clicks ("Pick the X" in a comparison, confirmation-dialog buttons); leave default on **transitional** clicks where the next lens supersedes this one. Hosts without close support silently no-op. |

#### `link`

External navigation. Clicking opens the `href` via the host's external-open capability (e.g. `window.openai.openExternal`), with a `window.open(..., '_blank', 'noopener,noreferrer')` fallback. Use for destinations genuinely outside the conversation; use `button` for anything the user could express in words.

| Field | Type | Notes |
|-|-|-|
| `label` | `string` | ✅ — non-empty |
| `href` | `string` (URL) | ✅ — must start with `http://` or `https://`; `javascript:`, `data:`, etc. are rejected |
| `variant` | `"inline" \| "standalone"` | ◯ — `standalone` (default) renders as a button-shaped link with an external icon; `inline` renders as a text-flow hyperlink |
| `tone` | `Tone` | ◯ |

### Table

#### `table`

Structured view of multiple items across shared fields. The motivating primitive for MCP Lens.

Orientation is deliberate and unusual: `fields` render as **rows**, `items` render as **columns**. This reads naturally for side-by-side comparison ("how does A differ from B across these attributes?") when the item count is small and the field count is moderate. Field names are preserved to make the orientation explicit.

| Field | Type | Notes |
|-|-|-|
| `title` | `string` | ◯ |
| `fields` | `TableField[]` | ✅ — at least one, rendered as rows |
| `items` | `TableItem[]` | ✅ — at least two, rendered as columns |
| `highlightDifferences` | `boolean` | ◯ — visually emphasizes cells that differ |

**`TableField`**

| Field | Type | Notes |
|-|-|-|
| `key` | `string` | ✅ — key into each item's `values` |
| `label` | `string` | ✅ — rendered label |

**`TableItem`**

| Field | Type | Notes |
|-|-|-|
| `label` | `string` | ✅ — column header |
| `subtitle` | `string` | ◯ |
| `imageSrc` | `string` (URL) | ◯ |
| `values` | `Record<string, string>` | ✅ — values keyed by field `key`; missing keys render as `—` |

## Shared enums

- `Spacing`: `"none" \| "xs" \| "sm" \| "md" \| "lg" \| "xl"`
- `AlignCrossAxis`: `"start" \| "center" \| "end" \| "stretch"`
- `JustifyMainAxis`: `"start" \| "center" \| "end" \| "space-between" \| "space-around"`
- `TextVariant`: `"display" \| "heading" \| "subheading" \| "body" \| "caption" \| "label"`
- `Tone`: `"neutral" \| "info" \| "success" \| "warning" \| "danger"`
- `ButtonVariant`: `"primary" \| "secondary" \| "ghost"`
- `LinkVariant`: `"inline" \| "standalone"`

## Worked examples

### Single-item card

```json
{
  "specVersion": "0.1",
  "root": {
    "type": "card",
    "title": "Asics Gel-Resolution 9",
    "subtitle": "All-court · 395g",
    "children": [
      {
        "type": "image",
        "src": "https://example.com/gr9.jpg",
        "alt": "Gel-Resolution 9",
        "aspectRatio": "wide"
      },
      {
        "type": "text",
        "text": "Balanced all-court shoe with consistent stability.",
        "variant": "body"
      },
      {
        "type": "row",
        "gap": "sm",
        "children": [
          { "type": "badge", "label": "Medium cushion" },
          { "type": "badge", "label": "High stability", "tone": "success" }
        ]
      }
    ]
  }
}
```

### Two-item comparison

```json
{
  "specVersion": "0.1",
  "root": {
    "type": "table",
    "title": "Which to pick",
    "fields": [
      { "key": "weight", "label": "Weight" },
      { "key": "drop",   "label": "Heel drop" }
    ],
    "items": [
      { "label": "Vaporfly 3", "values": { "weight": "196g", "drop": "8mm" } },
      { "label": "Alphafly 3", "values": { "weight": "210g", "drop": "8mm" } }
    ],
    "highlightDifferences": true
  }
}
```

### External tracking link

```json
{
  "specVersion": "0.1",
  "root": {
    "type": "card",
    "title": "Order #A-42 · Shipped",
    "children": [
      { "type": "text", "text": "UPS · ETA May 6", "variant": "caption" },
      {
        "type": "link",
        "label": "Track shipment",
        "href": "https://www.ups.com/track?tracknum=1Z999AA10123456784",
        "variant": "standalone"
      }
    ]
  }
}
```

### Destructive confirmation (chrome suppressed)

```json
{
  "specVersion": "0.1",
  "chrome": { "suppressFeedback": true },
  "root": {
    "type": "card",
    "title": "Cancel order #A-42?",
    "children": [
      { "type": "text", "text": "2 items · $175.00" },
      {
        "type": "row",
        "gap": "sm",
        "justify": "end",
        "children": [
          {
            "type": "button",
            "label": "Keep order",
            "prompt": "Never mind, keep order #A-42.",
            "variant": "ghost"
          },
          {
            "type": "button",
            "label": "Cancel order",
            "prompt": "Yes, cancel order #A-42.",
            "variant": "primary",
            "tone": "danger"
          }
        ]
      }
    ]
  }
}
```

## Versioning

The spec version is tied to the renderer version. A lens declaring `specVersion: "0.1"` is guaranteed to work against any renderer that advertises `0.1` support. Future versions will use semver-style compatibility; today there is only `0.1`.
