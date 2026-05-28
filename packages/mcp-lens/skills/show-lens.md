# MCP Lens — spec reference

When the user asks about structured data, **default to a lens** (call `show_lens`) instead of plain prose. A lens shows the data *and* 2–4 one-click follow-ups so the user's next turn is a click, not typing.

---

## `show_lens(spec, description)`

- **`spec`** — the lens JSON (see node vocabulary below).
- **`description`** — model-facing metadata: what you showed, what affordances you offered, and any notable design choices. Not shown to the user. Used for memorialization on star-click.

---

## Node vocabulary (spec v0.1)

Root shape: `{ "specVersion": "0.1", "root": <node> }`. Optional: `"chrome": { "suppressFeedback": true }` to hide the star on confirmations.

### Containers (take `children: Node[]`)

| Type | Key fields | Notes |
|------|-----------|-------|
| `column` | `gap?, align?` | Vertical stack |
| `row` | `gap?, align?, justify?, equalWidth?` | Horizontal stack, wraps on narrow |
| `box` | `padding?, background?` | background: `none\|subtle\|muted` |
| `card` | `title?, subtitle?, padding?` | Elevated surface |
| `list` | `items: Node[], divider?` | divider: `none\|line` |

### Content (leaves)

| Type | Key fields | Notes |
|------|-----------|-------|
| `text` | `text, variant?, tone?` | variant: `display\|heading\|subheading\|body\|caption\|label` |
| `markdown` | `markdown` | For prose blocks, not short labels |
| `image` | `src, alt, aspectRatio?, fit?` | aspectRatio: `square\|video\|wide\|portrait` |
| `badge` | `label, tone?` | Small pill |
| `separator` | — | Horizontal line |

### Interactive

| Type | Key fields | Notes |
|------|-----------|-------|
| `button` | `label, prompt, variant?, tone?, closeOnClick?` | Emits `prompt` as a follow-up message. variant: `primary\|secondary\|ghost`. Set `closeOnClick: true` on decisive picks. |
| `link` | `label, href, variant?, tone?` | Opens external URL. href must be `https://`. variant: `inline\|standalone` |

### Table

| Type | Key fields | Notes |
|------|-----------|-------|
| `table` | `title?, fields[], items[], highlightDifferences?` | Fields are rows, items are columns (unusual orientation). Min 2 items. |

Field: `{ key, label }`. Item: `{ label, subtitle?, imageSrc?, values: { [key]: string } }`.

Shared enums — `Spacing`: `none|xs|sm|md|lg|xl`. `Tone`: `neutral|info|success|warning|danger`.

---

## Core rules

1. **2–4 affordances per lens.** Every lens ends with follow-up buttons. One is too few (forces typing); 5+ is noise.
2. **Per-row buttons in lists.** Each row in a browsing list needs its own follow-ups (e.g. "Details", "Compare").
3. **Buttons are user-voice prompts.** Write what the user would type: `"Show me details for the Vaporfly 3"`, not `"call get_shoe"`. Prompt must be self-sufficient without the lens visible.
4. **Links are external navigation only.** Tracking pages, PDFs, vendor sites. If the user would want a conversational follow-up, use `button`.
5. **`closeOnClick` on decisive picks.** "Pick the X", "Yes, cancel" — dismiss the widget. Leave it off on transitional clicks (drill-in, lateral moves).
6. **Don't invent data.** Inline real values from what you fetched. Omit fields you don't have.

---

## Chrome (the star)

The renderer draws a star below every lens (unless suppressed). On click, you receive a follow-up prompt. Look for a tool on this server whose description mentions saving presentation preferences (name varies). If found, call it. If not, acknowledge in conversation.

---

## On error

`show_lens` returns structured diagnostics: paths, issues, likely fixes, a minimal valid skeleton. Read the message, fix the spec, retry. No widget is shown on error.
