# MCP Lens

> A library that gives any MCP server agent-composed views.
> Drop it into your existing MCP server and the server gains rich presentation.

**Status:** Pre-1.0. The library and demos are stable enough to integrate into a server and ship to a host (ChatGPT Apps, Claude Desktop, Slack's pilot MCP client). Public API surface is small and unlikely to break, but expect minor adjustments as host implementations of SEP-1865 settle.

**Install:** packages live under the `@mcp-lens` npm scope. The library publishes as `@mcp-lens/sdk` (server-author-facing), the standalone reference server as `@mcp-lens/server`, and the preset commons as `@mcp-lens/presets`. The unscoped `mcp-lens` name on npm belongs to an unrelated project and is not us. See [`docs/getting-started.md`](./docs/getting-started.md) for the integration path.

## The pitch

The current shape of MCPUI is "one widget per tool, authored ahead of time." That works for known-good moments but doesn't fit conversational UX — the same data drives different views depending on what the user is *doing* (browsing vs. choosing vs. confirming vs. drilling in), and the agent is the only thing in the loop with full conversation context.

MCP Lens flips it. The server installs **one generic tool** (`show_lens`) that takes a JSON **lens spec**. The agent composes the spec at runtime from conversational context and the data it just fetched. The host renders the spec as an MCP UI resource using a fixed bundled widget. The server author teaches the agent how their domain renders by shipping **moment-shaped presets** — short markdown precedents organized by conversational moment, not data shape.

In short:

- **You ship:** a few `registerXxx` calls + a presets file.
- **You don't ship:** a widget, a renderer, an authoring tool, or per-data-shape components.
- **The agent handles:** picking the right moment, composing the right lens, writing the right next-turn buttons.
- **The host handles:** rendering, sandboxing, theme, navigation.

## Show me

Three integrated demos in this repo. The richest is `incidents-mcp` — cross-domain (accounts + incidents), eight moment-shaped presets, built explicitly to dodge the SPA dashboard anti-pattern (tabs, six-tile metrics, persistent state):

```bash
pnpm install
pnpm build
pnpm --filter incidents-mcp start:http   # listens on :3004
```

Then point Claude Desktop, ChatGPT (via tunnel), or Slack at `http://localhost:3004/mcp` and ask things like:

- "What accounts do we have?"
- "Tell me about Globex."
- "Show me the top 3 most recent incidents for Globex." *(a cross-domain lens — account header + incidents list, composed in one turn)*
- "What's incident INC-52790?" → click "What's the impact?" → click "Show recent updates" → click "Who's involved?" *(four focused moments, never a tabbed dashboard)*

Full walkthrough in [`docs/trying-it-out.md`](./docs/trying-it-out.md).

## Repo layout

```
mcp-lens/
├── packages/
│   ├── mcp-lens/              # THE LIBRARY
│   │   ├── src/
│   │   │   ├── spec/          # LensSpec types + zod runtime schema
│   │   │   ├── tools/         # show_lens, memorialize, presets
│   │   │   └── skill.ts
│   │   ├── renderer/          # React widget (built via Vite into one HTML)
│   │   └── skills/show-lens.md
│   ├── mcp-lens-server/       # standalone reference server (used in the recipes A/B demo)
│   └── demos/
│       ├── shoes-mcp/         # tennis-shoe catalog + presets
│       ├── orders-mcp/        # order management + cancel-confirmation flow
│       ├── incidents-mcp/     # incident management — cross-domain, 8 presets — the richest demo
│       ├── recipes-mcp/       # deliberately Lens-unaware, used to validate the library against unaware upstreams
│       └── orders-slack-app/  # Slack app manifest wrapping orders-mcp (config only)
├── docs/                      # problem, architecture, spec, getting-started, decisions, …
└── skills/                    # preset-authoring + new-demo workflow (for repo developers)
```

The integrated demos (`shoes-mcp`, `orders-mcp`, `incidents-mcp`) are the **primary reference**: this is what your server looks like once you've integrated `@mcp-lens/sdk`.

The `recipes-mcp` + `@mcp-lens/server` pair is a **secondary validation**: it shows the library can render against an *unaware* upstream — same primitives, different distribution model. Useful as proof the bet generalizes; not the headline pitch.

## Quickstart

```bash
pnpm install
pnpm build
pnpm test
```

Run all HTTP servers at once (`Ctrl+C` shuts them all down):

```bash
pnpm start:all
```

Or run individual servers — for stdio (Claude Desktop etc.) or one-off HTTP:

```bash
pnpm --filter shoes-mcp start             # integrated demo, stdio
pnpm --filter shoes-mcp start:http        # streamable HTTP on :3001
pnpm --filter orders-mcp start:http       # streamable HTTP on :3002
pnpm --filter recipes-mcp start:http      # streamable HTTP on :3003 (Lens-unaware)
pnpm --filter incidents-mcp start:http    # streamable HTTP on :3004 (cross-domain)
pnpm --filter @mcp-lens/server start:http  # streamable HTTP on :3010 (standalone reference)
```

## Read next

- **Why does this exist?** [`docs/problem.md`](./docs/problem.md)
- **How does it work?** [`docs/architecture.md`](./docs/architecture.md)
- **Add MCP Lens to your server:** [`docs/getting-started.md`](./docs/getting-started.md)
- **Try it in ChatGPT, Claude Desktop, or Slack:** [`docs/trying-it-out.md`](./docs/trying-it-out.md)
- **Lens spec reference:** [`docs/spec.md`](./docs/spec.md)
- **Develop on this repo:** [`docs/development.md`](./docs/development.md)
- **For AI agents working here:** [`AGENTS.md`](./AGENTS.md)

## Core vocabulary

- **lens** — a *suggestion surface for the user's next turn*: a JSON spec composed by the agent that anchors on data and ends with 2–4 one-click follow-ups
- **`show_lens`** — the single generic MCP tool the library installs; takes `spec` + `description`
- **renderer** — fixed React widget bundled into `@mcp-lens/sdk`; served inline as the MCP UI resource
- **preset** — markdown document ("precedent") a server author ships, organized by *conversational moment* (e.g. `user-is-browsing-shoes`), naming both the anchor and the affordances for that moment
- **`memorialize_lens`** — optional per-server, per-user preference store; default in-memory, swap for real persistence

## License

MIT — see [LICENSE](./LICENSE).
