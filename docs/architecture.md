# Architecture

How MCP Lens is put together. For the lens JSON shape itself, see [`spec.md`](./spec.md). For the rationale, see [`problem.md`](./problem.md).

MCP Lens is a **library**: a server author imports it from `@mcp-lens/sdk`, wires three `registerXxx` calls into their existing MCP server, and ships their own moment-shaped presets (and, optionally, their own memorialize tool). The library is the published unit; the demos in this repo are reference integrations.

## Repo layout

```
mcp-lens/
├── package.json, pnpm-workspace.yaml, tsconfig.base.json
├── AGENTS.md, CLAUDE.md, README.md, docs/, skills/
└── packages/
    ├── mcp-lens/                   # the published library
    │   ├── src/
    │   │   ├── spec/               # types + zod schema — the contract
    │   │   ├── tools/              # show_lens, presets
    │   │   ├── skill.ts
    │   │   └── renderer-bundle.ts  # GENERATED: inline renderer HTML as a string
    │   ├── renderer/               # React widget (separate build)
    │   │   └── src/                # App + components + host bridge + styles
    │   └── skills/show-lens.md     # the agent-facing skill
    ├── mcp-lens-server/            # standalone reference server (recipes A/B demo only)
    ├── mcp-presets/                # @mcp-lens/presets — preset commons compiled from presets/<domain>/*.md
    └── demos/
        ├── shoes-mcp/              # shopping / comparison reference demo (also ships save_lens_preference)
        ├── orders-mcp/             # transactional / confirmation reference demo
        ├── incidents-mcp/          # cross-domain reference demo (accounts + incidents)
        ├── recipes-mcp/            # deliberately Lens-unaware (paired with mcp-lens-server)
        └── orders-slack-app/       # Slack app manifest wrapping orders-mcp (config only)
```

## The pieces

### 1. The renderer (single React bundle)

A single React app in `packages/mcp-lens/renderer/`, built by Vite with `vite-plugin-singlefile` into one self-contained HTML with all JS and CSS inlined. The result is `~130KB gzipped` (the bundle includes the `@modelcontextprotocol/ext-apps` SDK so the spec handshake works end-to-end), and is embedded into `mcp-lens` at build time as the string `RENDERER_HTML` in `src/renderer-bundle.ts`.

At runtime:

- The MCP server advertises the renderer as an MCP resource at `ui://mcp-lens/renderer.html` with MIME `text/html;profile=mcp-app` (the canonical SEP-1865 MIME).
- The `show_lens` tool response carries `_meta.ui.resourceUri` (canonical) **and** `_meta['openai/outputTemplate']` (legacy ChatGPT) pointing at that URI. Spec-compliant hosts (Claude Desktop, Slack's pilot MCP client, Postman, MCPJam) read the canonical key; ChatGPT Apps reads the legacy one. Dual-emit keeps both worlds working until ChatGPT migrates.
- On the spec path, the renderer's `host.ts` instantiates an `App` from `@modelcontextprotocol/ext-apps`, runs the `ui/initialize` handshake, and listens for `ui/notifications/tool-result` to receive the lens spec. On the legacy path (ChatGPT), it reads `window.openai.toolOutput` and subscribes to `openai:set_globals` for live updates. A `__mcpLensDevOutput` window override exists for local Vite dev.
- Nodes are dispatched by `RenderNode.tsx` based on `type`. Components are small and stateless.
- Chrome (a single star/favorite affordance) sits outside the composed spec, always rendered unless `spec.chrome.suppressFeedback` is true.
- A *one-time host fingerprint* is logged at module load (matched globals on `window` keyed off `/openai|slack|mcp|host|bridge|widget|claude/`) so bringing up a new host yields a single iframe-console line that names what bridge to wire up.

**The renderer is intentionally not a layout engine.** The vocabulary is narrow: containers (`box`, `column`, `row`, `card`, `list`), content (`text`, `markdown`, `image`, `badge`, `separator`), two interactive nodes (`button` for conversational actions, `link` for external navigation), and one specialty node (`table`). This is closer to Slack Block Kit than to a web framework — on purpose.

**Safety:** no LLM-generated HTML ever runs. The renderer bundle is vetted. The agent composes JSON; the JSON flows through a zod validator before render; the markdown node uses an escape-safe subset of markdown that never emits raw HTML.

### 2. The `show_lens` tool (required)

A single MCP tool registered by `registerShowLens(server)`. Input schema:

```
show_lens:
  spec: unknown   (validated by lensSpecSchema at call time)
  description: string (min 1 char)
```

Response:

```
{
  structuredContent: { spec },
  content: [{ type: 'text', text: '[lens shown]' }],
  _meta: {
    // Canonical SEP-1865 — the only thing spec-compliant hosts read.
    ui: { resourceUri: 'ui://mcp-lens/renderer.html' },
    // Legacy ChatGPT Apps — kept until ChatGPT migrates to canonical.
    'openai/outputTemplate': 'ui://mcp-lens/renderer.html',
    'openai/widgetAccessible': true,
    // Per-call model-facing description. ChatGPT-only today; non-ChatGPT
    // hosts ignore unknown _meta keys.
    'openai/widgetDescription': <description>,
  }
}
```

The input/output is deliberately asymmetric: input takes `{ spec, description }`; the output's `structuredContent` carries `{ spec }` only. The widget hydrates from the spec; the description is metadata for the *agent*, not the widget.

`description` is **model-facing metadata** — an account of what the lens shows and what presentation choices were made. The host surfaces it back to the agent, which decides what to actually say to the user. It is also the payload the agent re-uses when the user stars the view (memorialization).

No `outputSchema` is published. Publishing one causes ChatGPT Apps to enforce the resulting JSON Schema on the structuredContent it delivers to the widget, and the enforcement strips nested fields when the schema can't perfectly express recursive types (it never quite can, for arbitrary lens trees). See [`decisions.md`](./decisions.md) for the diagnostic story.

### 3. Renderer chrome (the star)

The renderer draws a single **star** (favorite) affordance below every lens, unless `spec.chrome.suppressFeedback` is true. There's no thumbs-down — feedback for "I don't like this view" is just the user typing in the next turn.

Click → emits a follow-up prompt asking the agent to memorialize the presentation. The widget never calls tools directly; every action is mediated by the agent. See the next section for what happens when the agent receives that prompt.

### 4. Memorialization (server-defined, optional)

The SDK does not ship a memorialize tool. Server authors who want per-user durable preferences define their own MCP tool with whatever name and schema fits their identity model. The agent discovers it on `tools/list` by reading tool descriptions (the renderer's star prompt instructs the agent to look for tools whose descriptions mention saving/remembering presentation preferences).

If the agent finds such a tool, it calls it with the description it wrote when calling `show_lens`. If it doesn't, it acknowledges the preference in conversation for the rest of the session and stops — no fabricated tool calls.

This keeps the SDK out of the identity business. Server authors who already know who their users are (auth tokens, OAuth claims, OS user) wire memorialization the way that fits their stack; servers without identity (e.g. the standalone `npx`-launched `@mcp-lens/server`) simply skip it.

The cookbook for authoring such a tool — description text, schema shape, identity hook, runnable code sketch — lives in `packages/mcp-lens/README.md`. The worked example lives in `packages/demos/shoes-mcp/src/server.ts` (search for `save_lens_preference`).

**Scope (when authored):** per-server, per-user. Preferences on the shoes server don't leak to the orders server. This is deliberate — it's not a global memory competing with ChatGPT/Claude memory; it's a server-owned preference lane.

### 5. Lens presets (optional)

Short markdown documents the server author ships as presentation precedent. `registerPresets(server, presets)` installs two tools:

- `list_lens_presets()` — `{ name, description }[]`.
- `get_lens_preset(name)` — the full markdown body.

A preset body is prose + embedded JSON code blocks. The prose explains intent, labels which parts of any embedded JSON are **prescriptive** (structure) vs. **illustrative** (sample values). No placeholder syntax (`{{name}}`); the prose does the work. The agent reads the markdown, adapts real data, and may combine multiple presets in one lens.

Presets are precedent, not templates. The skill explicitly tells the agent that adaptation is expected.

**Presets are organized by *conversational moment*, not by data shape.** Names like `user-asked-about-a-shoe` or `user-is-browsing-orders` describe what the user is *doing*, and the preset names both the right anchor (data) and the right next-turn affordances (buttons / links) for that moment. The same data can drive different lenses depending on the moment — a list of shoes during browsing has per-row "Details" buttons; the same shoes during a comparison have "Pick this one" buttons. This naming convention generalizes across domains and keeps the agent focused on what matters: predicting the user's next move and rendering it as one click. See [`decisions.md`](./decisions.md) (2026-05-10) for the reasoning.

### 6. The skill

`packages/mcp-lens/skills/show-lens.md` — a markdown document the *runtime agent* reads before composing any lens. Covers:

- When to reach for `show_lens` vs. plain text (default to lens for any structured-data response).
- The lens spec vocabulary + worked examples.
- The buttons-as-follow-up-prompts invariant.
- The 2–4 affordances rule and per-row buttons in lists.
- The `closeOnClick` pattern for decisive picks (e.g. "Pick the X" in a comparison; confirmation-dialog buttons).
- The route-to-browse pattern for ambiguous picks (e.g. "Compare with another" routes to a list of candidates rather than fabricating one).
- The inline-data principle.
- The model-facing nature of the description.
- The session-start "look for a memorialize-style tool by description" pattern and the star-click flow.
- The preset-consultation flow.

`getLensSkill()` returns the markdown as a string (cached after first read). `registerLensSkillResource(server)` exposes it as an MCP resource at `skill://mcp-lens/show-lens`.

Two additional skills live at the repo root in `skills/` — these are **not** shipped as MCP resources; they're authoring aids for coding agents working *on* the library or on a server that uses the library:

- `skills/preset-authoring.md` — conventions for authoring moment-shaped presets, distilled from real failures across the reference demos.
- `skills/new-demo-workflow.md` — step-by-step workflow for adding a new demo MCP server to this repo.

## Installation API

```ts
import {
  registerShowLens,          // required
  registerPresets,           // optional
  registerLensSkillResource, // optional
  getLensSkill,
} from '@mcp-lens/sdk';

registerShowLens(server);                            // adds show_lens + renderer resource
registerPresets(server, [shoePreset, orderPreset]);  // adds list/get preset tools
registerLensSkillResource(server);                   // adds the skill as an MCP resource

// Optional fourth piece: your own memorialize tool. Pick a name and schema,
// wire it to your auth + persistence. See packages/mcp-lens/README.md
// ("Authoring a memorialize tool") and packages/demos/shoes-mcp for a
// runnable example.
```

Everything past `registerShowLens` is opt-in.

## Flow: one lens, end to end

1. **Session start.** Agent reads server instructions + the skill resource. If a memorialize-style tool is advertised on the server (recognized by description, not name), agent calls it with no args and ingests prior preferences.
2. **User turn.** User asks a question that would benefit from a visual answer.
3. **(Optional) preset consultation.** Agent calls `list_lens_presets`, fetches relevant ones, uses as reference.
4. **Compose.** Agent composes a lens spec from data it already has, writes a `description` for itself.
5. **Call.** Agent calls `show_lens(spec, description)`. Server validates and returns a response with the renderer URI and structuredContent carrying the spec.
6. **Render.** Host loads the renderer iframe; renderer reads the bridge (spec or legacy), validates, and draws the lens + star.
7. **Narrate.** Agent replies in conversation, using (but not duplicating) the view.
8. **Feedback.**
   - *Star click* → renderer sends follow-up prompt → agent finds a memorialize-style tool by description and calls it with the description (or acknowledges in conversation if none exists).
   - *Button click* → renderer sends the button's `prompt` → agent interprets it as the user's next turn.

## Target hosts

The library targets **MCP UI Apps (SEP-1865)** as the canonical extension. Spec-compliant hosts pick up lenses with no host-specific code on our side.

Validated hosts as of writing:

- **ChatGPT Apps** — the first host this project targeted, predates SEP-1865. Reads the legacy `openai/*` keys and the `window.openai` bridge. Dual-emit support keeps it working alongside the canonical path.
- **Claude Desktop** — spec-compliant; validated end-to-end with the recipes A/B demo.
- **Slack's pilot MCP client** (`slackbot_mcp_pilot`) — spec-compliant; the iframe handshake works and lenses render. The `ui/message` follow-up path has known issues we're working through with Slack.

Adapting to additional hosts (Postman, MCPJam, future entrants) should be near-zero work as long as those hosts implement SEP-1865. The renderer's `src/host.ts` already routes between the spec path (via `App` from `@modelcontextprotocol/ext-apps`) and the legacy ChatGPT path.

## Versioning

- **Lens spec version** is carried in every lens (`specVersion: "0.1"`). The renderer and the validator check it. Breaking changes bump the version; the renderer must either migrate older specs or refuse them.
- **`@mcp-lens/sdk` package version** follows semver. Breaking spec changes require a major bump.

## Not in scope for v1

- Multiple renderers (Lit, Slack Block Kit, native iOS/Android). The spec is designed so this is possible later; v1 ships one.
- Third-party preset-library npm packages (`@acme/mcp-lens-presets`, etc.) following the `@mcp-lens/presets` shape. Mechanism is in place; we don't ship any yet beyond the reference one.
- A built-in memorialize tool. The SDK no longer ships one; server authors define their own (with whatever name, schema, and persistence fits their identity model). See `packages/mcp-lens/README.md` for the cookbook.
- Durable session state. The renderer is stateless per tool call.
- Mobile rendering parity. HTML iframes are the platform; native rendering on iOS/Android is a separate translation layer (Block Kit on Slack, equivalents elsewhere).

See [`open-questions.md`](./open-questions.md) for the running list.
