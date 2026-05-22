# Changelog

All notable changes to this project will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### v0.1.0 — initial public release

First public version of MCP Lens.

**Library — `@mcp-lens/sdk`** (formerly `mcp-lens` — the unscoped name was taken on npm)

- `LensSpec` v0.1: a small constrained vocabulary for agent-composed views — containers (`box`, `column`, `row`, `card`, `list`), content (`text`, `markdown`, `image`, `badge`, `separator`), interactive (`button`, `link`), and the `table` primitive for side-by-side structured comparisons.
- `registerShowLens(server)` — installs the single generic tool that takes a lens spec and returns an MCP UI resource.
- `registerPresets(server, presets)` — exposes a server author's moment-shaped presets via `list_lens_presets` / `get_lens_preset`.
- `registerLensSkillResource(server)` — exposes the lens-authoring skill at `skill://mcp-lens/show-lens`.
- React renderer bundled as a single self-contained HTML, served as the MCP UI resource.
- Dual-emit metadata: canonical SEP-1865 (`_meta.ui.resourceUri`) for spec-compliant hosts plus legacy `openai/*` keys for ChatGPT Apps.
- Cross-host bridge: tries the `@modelcontextprotocol/ext-apps` spec path first (Claude Desktop, Slack pilot, Postman, MCPJam), falls back to `window.openai.toolOutput` (ChatGPT Apps), then to a dev-mode `__mcpLensDevOutput` shim.

**Library — `@mcp-lens/presets`**

- New companion package: a build-time loader that compiles `presets/<domain>/*.md` from the repo root into typed TypeScript exports per domain.
- Presets are authored as markdown with YAML frontmatter and YAML pseudocode for illustrative examples.
- Subpath exports per domain: `@mcp-lens/presets/generic`, `@mcp-lens/presets/incidents`, `@mcp-lens/presets/orders`, `@mcp-lens/presets/shoes`. Each subpath ships named per-preset constants and a `<DOMAIN>_PRESETS` aggregate.
- Validation enforced at compile time: frontmatter present, name matches filename, name unique within domain, every fenced YAML block parseable.

**Reference demos**

- `shoes-mcp` — catalog browsing + N-way comparison.
- `orders-mcp` — transactional flows including a confirmation-with-`closeOnClick` pattern.
- `incidents-mcp` — cross-domain (accounts + incidents), eight moment-shaped presets including focused drill-ins (impact, timeline, contributors) that explicitly avoid the SPA dashboard anti-pattern.
- `recipes-mcp` — deliberately Lens-unaware. Pairs with `@mcp-lens/server` to validate "lens against an unaware upstream."
- `@mcp-lens/server` — standalone reference server shipping three domain-blind presets.
- `orders-slack-app` — Slack app manifest exposing `orders-mcp` to Slackbot's pilot MCP client (`slackbot_mcp_pilot`).

**Documentation**

- `docs/problem.md`, `docs/architecture.md`, `docs/spec.md`, `docs/getting-started.md`, `docs/trying-it-out.md`, `docs/development.md`, `docs/decisions.md`, `docs/open-questions.md`.
- `skills/preset-authoring.md` and `skills/new-demo-workflow.md` — repo-level developer aids for coding agents working on the library or contributing presets.
- `presets/README.md` — the commons. PR contributors land new presets here.

**Validated hosts**

- ChatGPT Apps (legacy bridge).
- Claude Desktop (SEP-1865 spec bridge).
- Slack's pilot Slackbot MCP client (SEP-1865, with known issues on `ui/message` we're working through with Slack).
