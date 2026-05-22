# Problem statement

## Status quo: MCPUI as currently specified

Modern MCP servers can attach UI to tool responses via MCPUI. A tool declares a resource URI; the client (agent host — ChatGPT, Claude, Gemini, Slack, etc.) loads that resource into a sandboxed iframe, hydrates it with the tool's response data, and renders a richer-than-text view for the user.

Concretely: the tool author ships a widget (HTML/CSS/JS bundle) alongside the tool. When the tool is called, the agent host renders the widget with the tool's response.

## Why this is fragile

The widget is **statically defined** by the tool author. That means:

- The author has to anticipate every visualization a user might want for that tool's data.
- Conversational intent is **runtime-emergent** — users drill down, compare, filter, aggregate in ways no tool author can predict.
- When a conversation outgrows the pre-imagined widget, the agent either falls back to text or renders multiple awkward widgets side by side.

### Concrete example

User is shopping for tennis shoes and wants to compare two pairs on technical details. The shoe-inventory tool ships a "single shoe card" widget because that's the reasonable default. The comparison case requires the tool author to have pre-built a "compare two shoes" widget — which they didn't, because there are infinite possible comparisons.

Options today:
1. Fall back to text — wastes the UI affordance.
2. Render two widgets — clunky scrolling, no side-by-side affordance, each carries its own conversational framing.
3. Build a comparison widget — now the tool author has to anticipate N-way comparisons, filters, highlighting of differences, etc. Effectively re-inventing app design inside a tool spec.

## The thesis

Flip the ownership:

- The **server** owns data and affordances (tools that fetch, mutate, etc.).
- The **agent** owns composition for *this specific conversational moment*.
- **MCP UI** is the rendering substrate — a sandboxed iframe with a postMessage channel — but not the authoring surface.

Shape of the solution:

- One **generic widget bundle** (fixed, vetted) that knows how to render a constrained JSON lens spec.
- One **generic MCP tool** (`show_lens`) that takes a spec and returns an MCP UI resource URI pointing at that widget.
- One **skill** that teaches the agent when to reach for the tool and how to fill the spec.
- An optional **presets** mechanism for server authors to ship moment-shaped precedents — "when the user is doing X with my domain, here's the anchor and the affordances that fit."

Plug the library into any MCP server and that server gains rich UI for free.

## What a lens really is (sharpened framing)

The thesis above is right but understated. After early ChatGPT testing it became clear:

**A lens is not a "rich visualization." A lens is a *suggestion surface for the user's next turn*.** The agent's actual job, after almost every meaningful response, is to predict the small set of things the user is likely to want next and render them as one-click affordances.

Visualizing the data — a card, a comparison, a list — is the *anchor*: it gives the affordances context, telling the user *what they're choosing about*. The buttons are *the choices themselves*. A lens without affordances is a billboard: pretty, but stuck. A lens with affordances keeps the conversation moving without typing.

This reframing tightens the value proposition:

- The product isn't "MCPUI-but-easier-to-author." It's *"the agent gives you one-click follow-ups instead of making you type them."*
- The presets aren't "how to render a shoe." They're *"what does the user likely want next, in this moment, with this data?"*
- The skill teaches the agent *to predict and render next moves*, not *to render data nicely*.

See [`decisions.md`](./decisions.md) entry dated 2026-05-10 for the reasoning and the changes that flow from this reframing.

## Tradeoff

Flexibility up. Determinism, brand control, and polish down. That is an accepted tradeoff: an agent-composed lens for the right moment beats a hand-tuned widget for the wrong moment. The bounding mechanisms (a strict spec, a versioned skill, server-authored presets, runtime zod validation) keep the variance scoped without surrendering composition to the agent.

Safety posture is unchanged compared to a vetted static widget: the iframe bundle is ours; only the composition is agent-authored. No LLM-generated HTML or JavaScript ever runs in the iframe.
