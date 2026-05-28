# Agent orientation — MCP Lens

If you are an AI assistant (Claude Code, Cursor, Copilot, Gemini CLI, etc.) picking up work in this repo, read the following, in this order, before doing anything else:

1. [`docs/problem.md`](./docs/problem.md) — the why
2. [`docs/architecture.md`](./docs/architecture.md) — the how (current working plan)
3. [`docs/decisions.md`](./docs/decisions.md) — what has been decided and why
4. [`docs/open-questions.md`](./docs/open-questions.md) — what is not yet decided
5. [`docs/spec.md`](./docs/spec.md) — lens spec reference
6. [`docs/trying-it-out.md`](./docs/trying-it-out.md) — end-to-end walkthrough for ChatGPT + Claude Desktop

## What this project is

MCP Lens — a **library that gives any MCP server agent-composed views**. Drop it into your existing MCP server and the server gains rich presentation: the agent calls a single generic `show_lens` tool with a JSON spec it composes from conversational context, and the host renders it as an MCP UI resource.

The thesis: MCPUI's current shape (each tool ships its own widget) is too rigid for conversational UX. The `show_lens` tool, the spec, the renderer, and the lens-authoring skill ship as one library. Server authors ship their own moment-shaped presets to teach the agent how their domain renders. The repo includes reference demos that exercise the library against real domains.

## Core vocabulary

- **lens** — a *suggestion surface for the user's next turn*: a JSON spec composed by the agent that anchors on data and ends with 2–4 one-click follow-ups (per the 2026-05-10 reframe in `decisions.md`)
- **`show_lens`** — the generic MCP tool that wraps a lens in an MCP UI resource
- **renderer** — the fixed widget bundle that renders a lens inside the client iframe
- **preset** — markdown document organized by *conversational moment* (e.g. `user-is-browsing-things`), naming both the anchor and the affordances for that moment

## Repo layout (current)

- `packages/mcp-lens` — **the library** (npm: `@mcp-lens/sdk`). The spec, the renderer, and the single `registerShowLens(server, options)` call that wires three tools (`show_lens`, `get_lens_guide`, `get_lens_preset`). This is what server authors install. The SDK does **not** ship a memorialize tool — server authors define their own; see the "Authoring a memorialize tool" cookbook in `packages/mcp-lens/README.md` and the worked example in `packages/demos/shoes-mcp/src/server.ts`.
- `packages/mcp-presets` — companion package (npm: `@mcp-lens/presets`): a build-time loader that compiles `presets/<domain>/*.md` from the repo root into typed exports per domain. Demos import from `@mcp-lens/presets/<domain>`.
- `packages/demos/shoes-mcp`, `orders-mcp`, `incidents-mcp` — **reference demos** showing how to integrate the library into a real MCP server. Each curates its own domain-specific moment-shaped presets.
- `packages/demos/recipes-mcp` — a deliberately *Lens-unaware* MCP server. Plain MCP, no `@mcp-lens/sdk` dependency. Pair with `packages/mcp-lens-server` to validate "agent uses Lens against an unaware upstream."
- `packages/mcp-lens-server` — a standalone reference Lens server (npm: `@mcp-lens/server`) with three domain-blind presets. Used in the recipes A/B demo to prove the library can render against unaware upstreams. Secondary validation; not the primary pitch.
- `packages/demos/orders-slack-app` — config-only Slack app manifest exposing `orders-mcp` to Slackbot's pilot MCP client. Demonstrates the library running on a third host alongside ChatGPT and Claude Desktop.

## Skills for repo developers

Two craft handbooks live at `skills/` (NOT shipped as MCP resources — these are repo-level developer aids for coding agents working inside this repo):

- [`skills/preset-authoring.md`](./skills/preset-authoring.md) — the conventions for writing lens presets, distilled from real failures across four demos. Read this before authoring or modifying any preset.
- [`skills/new-demo-workflow.md`](./skills/new-demo-workflow.md) — the 8-step workflow for adding a new demo MCP server to this repo. Read this when the user asks for a new demo.

The runtime agent never sees these. They are for *coding agents helping developers* set up new domains, not for the agent that runs at runtime inside ChatGPT / Claude Desktop / Slack.

## What this project is *not*

- Not a framework or a runtime — a *library* you import and a few markdown skills that travel with it. No ambient state, no expression language, no data-provider system.
- Not an LLM-generates-HTML system. The widget bundle is fixed; the agent only composes structured JSON against a small spec.
- Not a hosted service. Server authors run their own MCP servers; `@mcp-lens/sdk` runs in-process inside those servers.

## Ground rules for agents

- **Keep it simple.** The owner explicitly wants fewer moving parts. Resist importing heavyweight abstractions; the spec, the renderer, and the skill are the entire surface area.
- **Memorialize decisions.** When the owner decides something non-obvious in conversation, update `docs/decisions.md`. When a question comes up that can't be answered now, update `docs/open-questions.md`. These files are the handoff — another developer should be able to reboot a coding agent here and catch up in ~5 minutes.
- **Don't create documentation files unless they earn their keep.** The docs above are the scaffold. Add more only when a topic truly doesn't fit in them.
- **No implementation without a plan.** Before writing code for a new piece, sketch it in `docs/architecture.md` or call it out in conversation.

## Related context (external)

- MCPUI spec — the iframe + resource-URI mechanism this library rides on.
- SEP-1865 (MCP UI Apps) — the canonical extension this project implements.

## Working conventions

- Absolute paths in docs.
- When an open question becomes a decision, move it from `open-questions.md` to `decisions.md` with a date and the reasoning.
- Dates in ISO format (YYYY-MM-DD).
