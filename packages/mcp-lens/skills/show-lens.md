# MCP Lens — agent guide

This server provides **MCP Lens**: a way for you to give the user *one-click follow-ups* instead of making them type. You compose a small JSON **lens spec** and pass it to the `show_lens` tool. The host renders it as a widget alongside your conversational reply.

Read this once before you start using `show_lens`. It is short.

---

## Default to lens

When the user asks about something on this server's domain — a thing, a list of things, a comparison, a status — **the default response is a lens, not plain prose.** Plain prose is the fallback for chatter, explanations, and clarifications, not the default for showing data.

The reason is mechanical, not stylistic: a prose answer ends with the user back at the keyboard. A lens ends with 2–4 one-click follow-ups, so the next turn happens with a click. Every prose answer about a fetched record is a missed opportunity to advance the conversation cheaply.

If you are about to write "Here is what I found…" followed by a description of structured data you just fetched, **stop and call `show_lens` instead.** The conversational reply, if any, is the *frame* — one or two short sentences ("Here's the Vaporfly 3 — a few things you might want next.") — and the lens carries the data and the next-turn choices.

---

## What MCP Lens is really for

A lens is **a suggestion surface for the user's next turn**. After almost every meaningful response you give, the user has a small, predictable set of things they're likely to want to do or ask next. A lens shows those choices as visual, clickable affordances, so the user advances the conversation without typing.

Visualizing data — a card, a comparison, a list — is real, but it's the *anchor*: it's what makes the suggested follow-ups make sense in context. The data shows the user *what they're choosing about*. The buttons are *the choices themselves*.

Said another way:

- A card without follow-ups is a billboard. It tells the user something but leaves them stuck.
- A list without per-row follow-ups forces the user to type each drill-down.
- A comparison without a "pick one" affordance leaves the decision in the user's keyboard.

**Always ask: "what's the user likely to want next, and have I made it one click away?"**

## The core invariant: 2–4 affordances per turn

Every lens you compose should end with **2–4 next-turn affordances** — usually `button` nodes whose `prompt` is what the user would type to advance the conversation.

- **One affordance** is fine for confirmations ("Done") or unambiguous moments. Rarely the right answer otherwise — it forces the user back to typing for everything else.
- **5+ affordances** is noise. If you find yourself wanting many, you're probably trying to be a navigation menu, not a turn predictor.
- **Per-row affordances in lists.** When you show a list of items the user is browsing, each row needs its own follow-up button(s) (typically "Details" and possibly "Compare"). A list without per-row buttons is the most common mistake — it shows the data but forces the user to type every drill-down.

The follow-ups don't all have to be primary. Mix `variant: "primary"` for the most likely choice with `secondary` and `ghost` for alternatives. If a follow-up navigates *outside* the conversation (a tracking URL, a PDF, a vendor's product page), use `link` instead of `button` — same idea, different mechanism.

---

## When to call `show_lens` (and when not to)

The bar is low. **Any time the user is looking at structured data, the answer is a lens.** Specifically:

- The user just asked about one specific thing — render a one-record card with 2–3 follow-ups.
- The user is choosing between things — render a comparison + a "pick one" follow-up per item.
- The user is browsing a small set — render a list, 2–6 items, **with per-row buttons**.
- You're about to do something irreversible and need confirmation — render a card with two buttons and suppress feedback chrome.
- You need clarification before continuing, and the candidate answers are short — render the question + a few candidate-answer buttons instead of asking "please tell me which one."

Do **not** call `show_lens` for:

- Plain prose, explanations, conversational chatter — those go in your text reply.
- Hypothetical results you haven't actually produced yet.
- Data the user hasn't asked about and isn't about to need.
- Pure error messages that don't have a meaningful next step.

When in doubt: *is there structured data the user just looked at, or a small set of next things the user is likely to want?* If yes, lens. If no, just talk.

---

## Calling `show_lens`

`show_lens` takes **two required arguments**:

### 1. `spec` — the lens JSON

A small tree. Every node has a `type`. The root is the outermost container you want to render.

```json
{
  "specVersion": "0.1",
  "root": {
    "type": "card",
    "title": "Nike Vaporfly 3",
    "children": [
      { "type": "text", "text": "Carbon plate racing shoe.", "variant": "body" },
      {
        "type": "row", "gap": "sm", "justify": "end",
        "children": [
          { "type": "button", "label": "Compare with Alphafly", "prompt": "Compare the Vaporfly 3 with the Alphafly 3 on cushioning and weight.", "variant": "primary" },
          { "type": "button", "label": "See similar", "prompt": "Show me other carbon-plate racers like the Vaporfly 3.", "variant": "secondary" }
        ]
      }
    ]
  }
}
```

See the vocabulary section below for the full list of node types.

### 2. `description` — model-facing metadata about what you showed

This is **not** text the user sees. It is a concise account — written for you (the model) — of what the lens contains, what next-turn affordances you offered, and any notable design choices. The host attaches it to the response; you read it back when narrating to the user, and it is the signal you re-use if the user stars the view (memorialization — see "Feedback chrome" below).

Good descriptions:

- `"Single-card view of the Nike Vaporfly 3 with two follow-ups: 'Compare with Alphafly' (primary) and 'See similar' (secondary)."`
- `"Side-by-side comparison of the Vaporfly 3 and Alphafly 3 across weight, drop, and stack height. Each item has a 'Pick this one' button."`
- `"List of 5 search results, each row has 'Details' and 'Compare' buttons. Pricing omitted per the user's earlier preference."`

Bad descriptions (vague, or written as user-facing text):

- `"Here are the shoes you asked about."` → user-facing; belongs in conversation, not here.
- `"Shoes."` → no signal.
- `"Made a lens."` → useless for memorialization.

A good description names the *anchor* (what data you showed) and the *affordances* (what the user can click). Both matter.

---

## Spec vocabulary (v0.1)

All nodes below except containers are **leaves** (no children). Containers take `children: LensNode[]`. Shared enums: `Spacing` = `none | xs | sm | md | lg | xl`, `Tone` = `neutral | info | success | warning | danger`.

### Containers

- `column` — vertical stack. `{ type: "column", gap?: Spacing, align?, children }`
- `row` — horizontal stack (wraps on narrow widths). `{ type: "row", gap?, align?, justify?, equalWidth?, children }`
- `box` — unstyled container with optional padding/background. `{ type: "box", padding?, background?: "none"|"subtle"|"muted", children }`
- `card` — elevated surface with optional title/subtitle. `{ type: "card", title?, subtitle?, padding?, children }`
- `list` — a collection of items, optionally with a divider between them. `{ type: "list", items: LensNode[], divider?: "none"|"line" }`

### Content primitives

- `text` — `{ type: "text", text, variant?: "display"|"heading"|"subheading"|"body"|"caption"|"label", tone? }`
- `markdown` — `{ type: "markdown", markdown }` (use for prose; not for short labels)
- `image` — `{ type: "image", src: url, alt: required, aspectRatio?: "square"|"video"|"wide"|"portrait", fit?: "cover"|"contain" }`
- `badge` — small pill. `{ type: "badge", label, tone? }`
- `separator` — horizontal divider. `{ type: "separator" }`

### Interactive — these are the point

Two interactive nodes, with different semantics. Pick the right one for the situation.

- `button` — **conversational action.** Clicking emits a follow-up prompt to you as if the user had typed it. **This is the primary affordance node.**
  `{ type: "button", label, prompt, variant?: "primary"|"secondary"|"ghost", tone?, closeOnClick?: boolean }`
  - Use when the action is something the user could express in words: `"Cancel order #A-42"`, `"Show me the Alphafly's spec sheet"`, `"Compare these two"`.
  - Write the prompt in **the user's voice**. Not `"call the cancel_order tool"`.
  - **The prompt must be self-sufficient and unambiguous.** When you receive it, you'll get the prompt text plus the conversation history — but not the lens. The prompt has to make sense on its own. Concretely: a button labelled "See similar" needs a prompt like `"Show me other carbon-plate racers like the Vaporfly 3."`, not `"See similar."` Name the *thing* you're acting on inside the prompt itself.
  - **Do not generate prompts that depend on data the user hasn't supplied.** A button labelled "Add another to compare" with prompt `"Add another shoe to this comparison"` is broken — *which* shoe? You don't know, and neither do you when the prompt comes back. If the moment requires the user to choose a new item, route them back to browsing instead: `{ label: "Compare with another", prompt: "Show me racing shoes I could compare the Vaporfly 3 against." }`. The next turn renders a list; the user picks; *then* you compose a new comparison.
  - **`closeOnClick`: dismiss the widget after the prompt is emitted.** Use this on **decisive** clicks where the moment is clearly over and the widget would feel stale if it stayed on screen:
    - "Pick the Vaporfly" / "Pick the Alphafly" buttons in a comparison — the choice is final.
    - "Cancel order" / "Keep order" buttons inside a confirmation dialog — the user has decided.
    Leave it default (omitted/false) on **transitional** clicks where the next lens will replace this one anyway:
    - "Details" or "Open" buttons in a browsing list — clicking just drills in.
    - "See similar" / "Compare with another" lateral moves — the next lens supersedes this one.
    Hosts without a close capability silently no-op; the prompt still goes through.

- `link` — **external navigation.** Clicking opens a URL via the host's external-open capability.
  `{ type: "link", label, href, variant?: "inline"|"standalone", tone? }`
  - Use only when the destination is genuinely outside the conversation: tracking URLs, product pages, PDF invoices, supplier spec sheets.
  - `href` MUST start with `http://` or `https://`. Other schemes are rejected by validation.
  - `standalone` (default) renders as a button-shaped link with an external-arrow icon. `inline` renders as a text-flow hyperlink suitable inside a sentence.
  - Do **not** use `link` for anything the user might want to follow up on conversationally — use `button` and let the agent handle the intent.

### Table

- `table` — structured view of N items across M fields. The natural anchor for "user is choosing between things" — pair it with per-item buttons or a "pick one" follow-up.
  ```json
  {
    "type": "table",
    "title": "Vaporfly vs Alphafly",
    "fields": [
      { "key": "weight", "label": "Weight" },
      { "key": "drop",   "label": "Heel drop" }
    ],
    "items": [
      { "label": "Vaporfly 3", "subtitle": "Racing", "values": { "weight": "196g", "drop": "8mm" } },
      { "label": "Alphafly 3", "subtitle": "Racing", "values": { "weight": "210g", "drop": "8mm" } }
    ],
    "highlightDifferences": true
  }
  ```
  - **Orientation is unusual.** `fields` are rendered as **rows**; `items` are rendered as **columns**. This reads naturally for "how does A differ from B on these attributes?" but is the opposite of most tables you've seen. The field names make the orientation explicit.
  - Minimum two items. Typical sweet spot: 2–4.
  - `highlightDifferences` visually emphasizes cells that differ across items.
  - **A bare table is incomplete.** Pair it with a row of "Pick this one" buttons (one per item) below the table, or some other follow-up affordance — otherwise the comparison ends with the user having to type their decision.

### Chrome

The renderer always draws a single **star** (favorite) affordance below your lens. You don't put it in the spec. There's no thumbs-down — if the user dislikes a view, they will tell you in their next turn.

If you are asking the user to confirm a destructive action and the star would be out of place, set:

```json
{ "specVersion": "0.1", "chrome": { "suppressFeedback": true }, "root": { ... } }
```

Use `suppressFeedback` sparingly — default is to leave the star on.

#### What happens when the user clicks the star

The widget emits a follow-up prompt asking you to memorialize the presentation. **You** decide how to do that — the SDK does not prescribe a tool name or shape:

1. **Look at the tools registered on this server.** Find one whose description indicates it stores or remembers presentation preferences. The name varies by server: `memorialize_lens`, `save_view_preference`, `remember_layout`, `pin_view`, etc. Read descriptions, don't pattern-match on names.
2. **If you find one, call it** with whatever shape its schema requires. Pass the description you wrote when calling `show_lens` for this view (you have it in your context).
3. **If no such tool exists,** acknowledge briefly in conversation: "Got it — I'll keep this presentation in mind for the rest of our conversation." Stop. Do not fabricate a tool call.

---

## Buttons vs. links

Two different invariants. Picking the wrong one makes the UI wrong.

**Buttons = follow-up prompts.** A button click emits a prompt the user might have typed. The prompt lands in the conversation and *you* decide what to do. You are always in the loop.

- Never reference specific tools in the prompt text. Write what the user would say: `"Cancel order #A-42"`, not `"call cancel_order with id=A-42"`.
- When the intent behind a button is destructive (cancel, delete, remove, charge), confirm before acting — the host may flag widget-originated prompts as needing extra care.

**Links = external navigation.** A link click opens a URL outside the conversation. You are not involved; the host opens the URL.

- Use `link` only for genuine external destinations: a carrier's tracking page, a product page, a PDF invoice, a supplier spec sheet.
- `href` must be `http://` or `https://`. `javascript:`, `data:`, and similar are rejected.
- If you're unsure whether to use `button` or `link`: ask "would the user want me to do something about this?" If yes, it's a button. If no — they just want to go look at something — it's a link.

---

## Session flow

Follow this order for each conversation:

### 1. Load preferences at session start (optional)

Some servers ship a tool for retrieving previously memorialized presentation preferences (the name varies — read tool descriptions). If you find such a tool advertised, call it once with no arguments before you compose your first lens; it typically returns a list of preferences (e.g. "prefer compact cards", "hide price by default") that you should fold into every lens for the rest of the session.

If no such tool is registered, skip this step. You do **not** need to call it again during the session — subsequent stars land in your context through the follow-up prompt the widget emits.

### 2. Consult presets (optional, but usually helpful)

If a `list_lens_presets` tool is available, **call it once before composing your first lens.** It returns a short list of `{ name, description }` entries describing the server author's preferred ways of presenting specific kinds of moments.

For each lens you compose, decide:

- Does a single preset fit this moment? Fetch it with `get_lens_preset` and use it as reference — adapt the structure, inline your real data, choose appropriate follow-ups.
- Do multiple presets fit (e.g. user asked to see "the shoe *and* the order")? Fetch each and **combine them** in one lens.
- Does nothing fit? Compose from scratch — but still follow the affordance rule: 2–4 next-turn affordances at the end.

Presets are **precedent, not templates.** They show you what the server author considers good; you are free to adapt, extend, or ignore them. Modern preset libraries are typically organized around *conversational moments* ("user is browsing", "user is choosing", "user asked about one thing"), not data shapes.

### 3. Compose and call `show_lens`

Produce your spec and description, call `show_lens`, and write a brief conversational reply that builds on (not duplicates) the view.

### 4. React to feedback

- **Star click:** the widget emits a follow-up prompt asking you to memorialize the view. Discover the right tool by reading tool descriptions on this server (the name is server-specific) and call it with the description you wrote for the view; if none exists, acknowledge in conversation that you'll keep the preference in mind for the rest of the session. See "Chrome" above for the full flow.
- **Button click:** treat the emitted prompt as if the user typed it. Interpret, act, confirm destructive actions. Then compose the *next* lens with the affordances appropriate for *that* new moment — keep the conversation moving forward through clicks.

---

## Worked examples — moment-shaped

Each example below is a conversational moment, not a data shape. Same data can drive different lenses depending on what the user is doing.

### Moment: user just asked about one specific thing

Anchor on the thing. Offer 2–3 follow-ups for the most likely next moves.

```json
{
  "specVersion": "0.1",
  "root": {
    "type": "card",
    "title": "Nike Vaporfly 3",
    "subtitle": "Men's racing shoe",
    "children": [
      { "type": "image", "src": "https://…/vaporfly.jpg", "alt": "Nike Vaporfly 3", "aspectRatio": "wide" },
      { "type": "text", "text": "Carbon plate racer, 196g.", "variant": "body" },
      {
        "type": "row", "gap": "sm",
        "children": [
          { "type": "badge", "label": "Racing", "tone": "info" },
          { "type": "badge", "label": "8mm drop" }
        ]
      },
      {
        "type": "row", "gap": "sm", "justify": "end",
        "children": [
          { "type": "button", "label": "Compare with another", "prompt": "Show me racing shoes I could compare the Vaporfly 3 against.", "variant": "primary" },
          { "type": "button", "label": "See similar", "prompt": "Show me other carbon-plate racers like the Vaporfly 3.", "variant": "secondary" },
          { "type": "button", "label": "Check availability", "prompt": "Is the Vaporfly 3 in stock in size 10?", "variant": "ghost" }
        ]
      }
    ]
  }
}
```

Notice the "Compare with another" prompt asks for a *list to choose from*, not for a comparison. You don't know which other shoe the user wants yet, so the next turn shows a browsable list of candidates; once they pick, *then* you compose the comparison.

### Moment: user is choosing between things

Anchor on the comparison. Each item gets a "Pick this one" affordance — the choice is one click away. The picks are decisive (the user has chosen) so they `closeOnClick`.

```json
{
  "specVersion": "0.1",
  "root": {
    "type": "column", "gap": "md",
    "children": [
      {
        "type": "table",
        "title": "Which to pick",
        "fields": [
          { "key": "weight", "label": "Weight" },
          { "key": "drop",   "label": "Heel drop" },
          { "key": "stack",  "label": "Stack height" }
        ],
        "items": [
          { "label": "Vaporfly 3", "imageSrc": "https://…/vf.jpg", "values": { "weight": "196g", "drop": "8mm", "stack": "40mm" } },
          { "label": "Alphafly 3", "imageSrc": "https://…/af.jpg", "values": { "weight": "210g", "drop": "8mm", "stack": "40mm" } }
        ],
        "highlightDifferences": true
      },
      {
        "type": "row", "gap": "sm", "justify": "end",
        "children": [
          { "type": "button", "label": "Pick the Vaporfly", "prompt": "I'll go with the Vaporfly 3.", "variant": "primary", "closeOnClick": true },
          { "type": "button", "label": "Pick the Alphafly", "prompt": "I'll go with the Alphafly 3.", "variant": "primary", "closeOnClick": true },
          { "type": "button", "label": "Compare with a different shoe", "prompt": "Show me other racing shoes I could compare the Vaporfly 3 and Alphafly 3 against.", "variant": "ghost" }
        ]
      }
    ]
  }
}
```

### Moment: user is browsing a list

Anchor on the list. **Every row has its own follow-ups.** This is the rule that's easiest to forget — without per-row buttons, the user has to type to drill into anything.

```json
{
  "specVersion": "0.1",
  "root": {
    "type": "list",
    "divider": "line",
    "items": [
      {
        "type": "row", "gap": "md", "align": "center",
        "children": [
          { "type": "image", "src": "https://…/vf.jpg", "alt": "Vaporfly 3", "aspectRatio": "square" },
          {
            "type": "column", "gap": "xs",
            "children": [
              { "type": "text", "text": "Vaporfly 3", "variant": "heading" },
              { "type": "text", "text": "Nike · racing · 196g", "variant": "caption" }
            ]
          },
          {
            "type": "row", "gap": "xs",
            "children": [
              { "type": "button", "label": "Details", "prompt": "Show me details for the Vaporfly 3.", "variant": "secondary" },
              { "type": "button", "label": "Compare", "prompt": "Compare the Vaporfly 3 with another racing shoe.", "variant": "ghost" }
            ]
          }
        ]
      }
    ]
  }
}
```

### Moment: user asked you to do something irreversible

Anchor on the consequences. Offer exactly two affordances — proceed or back out. Suppress feedback chrome (the star isn't meaningful here).

```json
{
  "specVersion": "0.1",
  "chrome": { "suppressFeedback": true },
  "root": {
    "type": "card",
    "title": "Cancel order #A-42?",
    "children": [
      { "type": "text", "text": "3 items · $124.99 · not yet shipped.", "variant": "body" },
      {
        "type": "row", "gap": "sm", "justify": "end",
        "children": [
          { "type": "button", "label": "Keep order", "prompt": "Never mind, keep order #A-42.", "variant": "ghost", "closeOnClick": true },
          { "type": "button", "label": "Cancel order", "prompt": "Yes, cancel order #A-42.", "variant": "primary", "tone": "danger", "closeOnClick": true }
        ]
      }
    ]
  }
}
```

### Moment: shows both `button` and `link` together

A shipped order. "Track shipment" is external navigation (the user is leaving the conversation to look at the carrier's site) — that's a `link`. Other affordances ("Contact support") are conversational follow-ups — those are `button`s.

```json
{
  "specVersion": "0.1",
  "root": {
    "type": "card",
    "title": "Order #A-1042",
    "subtitle": "Placed Apr 28 · Shipped",
    "children": [
      { "type": "badge", "label": "Shipped", "tone": "info" },
      { "type": "text", "text": "Carrier: UPS · ETA May 3", "variant": "caption" },
      {
        "type": "row", "gap": "sm", "justify": "end",
        "children": [
          {
            "type": "link",
            "label": "Track shipment",
            "href": "https://www.ups.com/track?tracknum=1Z999AA10123456784",
            "variant": "standalone"
          },
          { "type": "button", "label": "Contact support", "prompt": "I need help with order #A-1042.", "variant": "secondary" }
        ]
      }
    ]
  }
}
```

---

## If `show_lens` returns an error

It's a normal tool result (`isError: true`), not a thrown exception. The message is structured to help you recover:

- **Problems (N)** lists the exact paths and reasons your spec failed validation.
- **Likely fixes** (when present) names specific remediations — retired type names, missing wrappers, unknown types, etc.
- **Minimal valid lens** shows a tiny known-good shape you can anchor on.
- **Pointers** remind you to consult the skill and presets.

Read the message, correct the spec, and call `show_lens` again. Do not try to "render around" a validation failure — no widget is shown when the spec is invalid, and that's the right behavior. A clear retry is always better than a malformed UI.

## Common mistakes to avoid

- **Don't ship a lens with no follow-ups.** A bare card or list without buttons is the most common mistake. Ask: "is there a small set of next things the user is likely to want?" If yes, those are your buttons.
- **Don't forget per-row buttons in lists.** A list of 5 shoes with no per-row button forces the user to type "show me the second one." Each row should carry its own follow-ups (typically "Details" and "Compare", or whatever fits).
- **Don't make every button primary.** One primary, one or two secondary, the rest ghost. Visual hierarchy mirrors what the user is most likely to want.
- **Don't paraphrase data.** Copy values exactly from what you've fetched.
- **Don't invent data.** If you don't have the weight, don't guess — omit the field or fetch it first.
- **Don't pack the lens.** Short and focused beats dense. A dozen badges is noise.
- **Don't write the description as user-facing prose.** It is model-facing metadata — a summary for *you*, future-you, and the user-memory system. Name the anchor and the affordances.
- **Don't use `show_lens` for every response.** Conversation is still primary. A lens earns its place when the user has next-turn choices to make.
- **Don't wire buttons to tool names.** Write user-voice prompts.
- **Don't write prompts that lose context when separated from the lens.** The prompt arrives at your next turn alongside the conversation history but **not** the rendered widget. `"See similar"` is not a prompt — `"Show me other carbon-plate racers like the Vaporfly 3."` is. Always name the thing.
- **Don't write prompts that depend on a choice the user hasn't made.** "Add another to compare" with prompt `"Add another shoe to this comparison"` fails — *which* shoe? You don't know, the user hasn't picked. Route them to a browsable list first (`"Show me racing shoes I could add to this comparison."`); pick happens in the next lens.
- **Don't forget `closeOnClick` on decisive picks.** When a button represents the user finalizing a choice ("Pick the X", "Yes, cancel"), set `closeOnClick: true` so the widget dismisses. Leaving a comparison on screen after the user has made their pick feels stale.
- **Don't use `link` for conversational actions.** "Cancel order" is a button. "Open invoice PDF" is a link. If you're not sure, it's probably a button.

---

## One-line summary

> When the user looks at structured data on this server, default to a lens. Anchor on the data, then offer 2–4 one-click follow-ups whose prompts make sense without the lens in front of them. Decisive picks `closeOnClick`. Lists need per-row buttons. Buttons emit prompts; links open URLs. The description is model-facing.
