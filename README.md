# MCP Lens

> Drop one MCP connector into any host and every other connector you have wired up gains rich, agent-composed views.

**Status:** Pre-1.0. Public API is small and unlikely to break, but expect minor adjustments as host implementations of [SEP-1865 (MCP UI Apps)](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865) settle.

**Packages** (npm scope `@mcp-lens`):

| Package | What it is |
|---|---|
| [`@mcp-lens/server`](./packages/mcp-lens-server) | Standalone MCP server. `npx`-launched. Ships `show_lens` plus three domain-blind presets. Pair it with any other MCP server. |
| [`@mcp-lens/sdk`](./packages/mcp-lens) | Library for server authors who want to integrate `show_lens` directly. |
| [`@mcp-lens/presets`](./packages/mcp-presets) | Reference preset library — moment-shaped markdown precedents, organized by domain. |

The unscoped `mcp-lens` name on npm belongs to an unrelated project.

---

## The pitch

The current shape of MCPUI is "one widget per tool, authored ahead of time." That works for known-good moments but doesn't fit conversational UX — the same data drives different views depending on what the user is *doing* (browsing vs. choosing vs. confirming vs. drilling in), and the agent is the only thing in the loop with full conversation context.

MCP Lens flips it. The server installs **one generic tool** (`show_lens`) that takes a JSON **lens spec**. The agent composes the spec at runtime from conversational context and the data it just fetched. The host renders the spec as an MCP UI resource using a fixed bundled widget. Server authors teach the agent how their domain renders by shipping **moment-shaped presets** — short markdown precedents organized by conversational moment, not data shape.

In short:

- **You ship:** a few `registerXxx` calls + a presets file.
- **You don't ship:** a widget, a renderer, an authoring tool, or per-data-shape components.
- **The agent handles:** picking the right moment, composing the right lens, writing the right next-turn buttons.
- **The host handles:** rendering, sandboxing, theme, navigation.

---

## Try it (no clone, no build)

The fastest path: add `@mcp-lens/server` as an MCP connector in any spec-compliant host. Most hosts accept a config block of roughly this shape:

```json
{
  "mcpServers": {
    "lens": {
      "command": "npx",
      "args": ["-y", "@mcp-lens/server"]
    }
  }
}
```

That alone gives you `show_lens` + three generic presets. To actually *see* a lens, pair it with another MCP server in the same config — anything you already use that returns structured data (a catalog, CRM, ticketing, internal API). The agent will see both connectors, pull data from your real server, and use `show_lens` (from `lens`) to render it.

A note on what to expect:

- The agent doesn't always reach for `show_lens` on its own at first — especially on hosts where text answers are the default reflex. If the response comes back as plain prose, **ask explicitly**: *"Show that as a lens"* or *"Use show_lens when possible please!"* Once the agent has read the lens skill (auto-fetched as an MCP resource), it picks the pattern up across the rest of the conversation.
- Mileage varies by host. Hosts that implement SEP-1865 render the widget natively; hosts that don't fall back to the inlined HTML iframe path. Either path produces a working widget today.

---

## Or run the demos locally

Four worked-example servers in this repo. The richest is `incidents-mcp` (cross-domain, eight presets, deliberately built to dodge the SPA dashboard anti-pattern):

```bash
pnpm install
pnpm build
pnpm --filter incidents-mcp start:http   # listens on :3004
```

Point your host at `http://localhost:3004/mcp`, then ask:

- "What accounts do we have?"
- "Tell me about Globex."
- "Show me the top 3 most recent incidents for Globex." *(cross-domain lens — account header + incidents list, composed in one turn)*
- "What's incident INC-52790?" → click "What's the impact?" → click "Show recent updates" → click "Who's involved?"

Other demos:

```bash
pnpm --filter shoes-mcp start:http        # tennis-shoe catalog (also wires save_lens_preference) :3001
pnpm --filter orders-mcp start:http       # order management + cancel-confirmation flow :3002
pnpm --filter recipes-mcp start:http      # deliberately Lens-unaware — pair with @mcp-lens/server :3003
pnpm --filter @mcp-lens/server start:http # standalone reference :3010
```

Or all at once:

```bash
pnpm start:all
```

Full host-by-host walkthrough lives in [`docs/trying-it-out.md`](./docs/trying-it-out.md).

---

## Add it to your own server

Two integration paths.

**Path A — drop in as a sibling connector.** No code change to your existing MCP server. The user wires `@mcp-lens/server` and your server side by side; the agent composes lenses against your server's data using the generic presets. Best when you don't own the upstream or want a zero-touch demo.

**Path B — integrate `@mcp-lens/sdk` directly.** One call registers three tools (`show_lens`, `get_lens_guide`, `get_lens_preset`). Add your own moment-shaped presets to teach the agent how *your* domain renders. Best when you want domain-specific affordances and lifecycle-aware behavior.

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerShowLens } from '@mcp-lens/sdk';

const server = new McpServer({ name: 'my-server', version: '0.1.0' });
registerShowLens(server, { presets: MY_PRESETS });
```

Full integration walkthrough: [`docs/getting-started.md`](./docs/getting-started.md).

---

## Repo layout

```
mcp-lens/
├── packages/
│   ├── mcp-lens/              # @mcp-lens/sdk — the library
│   │   ├── src/
│   │   │   ├── spec/          #   LensSpec types + zod runtime schema
│   │   │   ├── tools/         #   show_lens, presets
│   │   │   └── skill.ts       #   loads skills/show-lens.md at runtime
│   │   ├── renderer/          #   React widget (built via Vite into one HTML)
│   │   └── skills/show-lens.md
│   ├── mcp-lens-server/       # @mcp-lens/server — standalone reference server (stdio + HTTP)
│   ├── mcp-presets/           # @mcp-lens/presets — preset commons compiled from presets/<domain>/*.md
│   └── demos/
│       ├── shoes-mcp/         #   tennis-shoe catalog + presets + save_lens_preference example
│       ├── orders-mcp/        #   order management + cancel-confirmation flow
│       ├── incidents-mcp/     #   cross-domain (accounts + incidents), 8 presets — richest demo
│       ├── recipes-mcp/       #   deliberately Lens-unaware; validates the unaware-upstream thesis
│       └── orders-slack-app/  #   Slack app manifest wrapping orders-mcp (config only)
├── presets/                   # markdown sources for @mcp-lens/presets, by domain
├── docs/                      # problem, architecture, spec, getting-started, decisions, …
└── skills/                    # preset-authoring + new-demo workflow (for repo developers)
```

The integrated demos (`shoes-mcp`, `orders-mcp`, `incidents-mcp`) are the **primary reference**: this is what your server looks like once you've integrated `@mcp-lens/sdk`.

The `recipes-mcp` + `@mcp-lens/server` pair is a **secondary validation**: same primitives, different distribution model.

---

## Read next

- **Why does this exist?** [`docs/problem.md`](./docs/problem.md)
- **How does it work?** [`docs/architecture.md`](./docs/architecture.md)
- **Add MCP Lens to your server:** [`docs/getting-started.md`](./docs/getting-started.md)
- **Try it host-by-host:** [`docs/trying-it-out.md`](./docs/trying-it-out.md)
- **Lens spec reference:** [`docs/spec.md`](./docs/spec.md)
- **Develop on this repo:** [`docs/development.md`](./docs/development.md)
- **For AI agents working here:** [`AGENTS.md`](./AGENTS.md)

---

## Core vocabulary

- **lens** — a *suggestion surface for the user's next turn*: a JSON spec composed by the agent that anchors on data and ends with 2–4 one-click follow-ups
- **`show_lens`** — the single generic MCP tool the library installs; takes `spec` + `description`
- **renderer** — fixed React widget bundled into `@mcp-lens/sdk`; served inline as the MCP UI resource
- **preset** — markdown document ("precedent") a server author ships, organized by *conversational moment* (e.g. `user-is-browsing-shoes`), naming both the anchor and the affordances for that moment
- **star (memorialize)** — single feedback affordance the renderer draws below every lens. Click emits a follow-up prompt asking the agent to remember the presentation; the agent discovers a memorialize-style tool by description on the server (server authors define their own — see the cookbook in [`packages/mcp-lens/README.md`](./packages/mcp-lens/README.md))

---

## License

MIT — see [LICENSE](./LICENSE).
