# Trying MCP Lens in ChatGPT (and Claude Desktop)

End-to-end walkthrough for getting a demo server in front of a real agent. ChatGPT Apps is the first-class target; Claude Desktop works as a no-tunnel fallback for tool-flow observation.

## Prerequisites

Clone/pull, install, build:

```bash
cd <your-clone-of-this-repo>
pnpm install
pnpm build
```

## 1. Sanity check (optional)

Smoke-test the servers in-process to confirm they boot cleanly:

```bash
# Demo servers (each ships its own MCP Lens integration):
node packages/demos/shoes-mcp/dist/smoketest.js
node packages/demos/orders-mcp/dist/smoketest.js
node packages/demos/incidents-mcp/dist/smoketest.js

# Lens-unaware demo + the standalone Lens server (the two-connector demo):
node packages/demos/recipes-mcp/dist/smoketest.js
node packages/mcp-lens-server/dist/smoketest.js
```

Expected output includes the tool list, the preset list (where applicable), and any state round-trips. If any step errors, stop and fix before exposing the server to a host.

## 2. Boot the demo over HTTP

ChatGPT Apps connects to MCP servers over Streamable HTTP. You have two options.

### All four servers in one terminal (recommended)

```bash
pnpm start:all
```

Builds everything once, then runs all four HTTP servers in parallel with their output prefixed by package name. `Ctrl+C` shuts them all down cleanly. The ports are:

- `3001` — `shoes-mcp` (integrated demo)
- `3002` — `orders-mcp` (integrated demo)
- `3003` — `recipes-mcp` (Lens-unaware demo)
- `3004` — `incidents-mcp` (cross-domain integrated demo)
- `3010` — `mcp-lens-server` (standalone Lens app)

If you've already built (e.g. you're iterating and only changed the renderer), you can skip the rebuild with `pnpm serve:all`.

### One server per terminal (if you prefer)

```bash
pnpm --filter shoes-mcp start:http        # :3001
pnpm --filter orders-mcp start:http       # :3002
pnpm --filter recipes-mcp start:http      # :3003
pnpm --filter incidents-mcp start:http    # :3004
pnpm --filter @mcp-lens/server start:http  # :3010
```

Each terminal prints the MCP request/response stream for that one server, which is sometimes easier to read when debugging.

The two-connector recipes demo (see "Recipes demo" below) needs both `recipes-mcp` and `mcp-lens-server` running at the same time — `pnpm start:all` covers that case automatically.

## 3. Expose via HTTPS (tunnel)

ChatGPT refuses `http://localhost`. Pick one:

### Option A — ngrok

```bash
brew install ngrok
ngrok config add-authtoken <your-free-token>
ngrok http 3001
# Forwarding  https://<random>.ngrok-free.app → http://localhost:3001
```

Note: on the free tier, ngrok shows a warning interstitial the first time any client hits the URL. Visit the tunnel URL in a browser once and click through; ChatGPT's subsequent requests will succeed.

### Option B — Cloudflare quick tunnel (no account)

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3001
# Your quick tunnel: https://<random-words>.trycloudflare.com
```

Quick tunnels are ephemeral and unauthenticated — fine for dev, not for sharing.

Either way, your MCP endpoint is `<tunnel-url>/mcp`.

## 4. Register in ChatGPT

1. Open **chatgpt.com** on desktop (not mobile).
2. Settings → **Connectors** → enable **Developer mode** if not already on.
3. Click **Create** and choose MCP server.
4. Paste the `https://…/mcp` URL.
5. Authentication: **None**.
6. Accept the developer-mode trust warning.
7. Save.

Registered connectors show up in the composer's tools/connectors menu on each chat.

## 5. Try the demo prompts

Open a new chat, enable the connector (toggle in the composer), and ask in plain language:

### Shoes demo

| Prompt | What you should see |
|-|-|
| "What Asics shoes do you have?" | Agent calls `search_shoes`, replies with a list (text). |
| "Show me the Gel-Resolution 9." | Agent calls `get_shoe`, then `show_lens` with a single `card`. Inline widget renders with image + specs + a "See similar" button. |
| "Compare the Gel-Resolution 9 and the Solution Speed FF 3." | The money shot. `table` node side-by-side with differences highlighted. |
| *(click the "Compare with another" button)* | Agent receives a follow-up prompt as if you'd typed it, then composes a new lens. |
| *(click the star on a lens)* | Agent finds shoes-mcp's `save_lens_preference` tool by description and calls it with the lens description, then acknowledges in chat. On servers without a memorialize-style tool, the agent acknowledges in conversation only. |
| "I don't want to see prices anymore." | Agent saves the preference via `save_lens_preference`; subsequent lenses omit price. Disconnect and reconnect the connector — preferences persist in-memory until the demo server restarts. |

### Orders demo

| Prompt | What you should see |
|-|-|
| "What orders do I have?" | `list_orders`, then `show_lens` rendering the `user-is-browsing-orders` preset — list with a per-row "Details" button. |
| "Show me order A-1042." | `user-asked-about-an-order` lens with status badge and status-appropriate affordances (cancel + update for processing; track-shipment link for shipped). |
| "Cancel order A-1043." | Agent shows the `user-asked-to-cancel-an-order` lens with `chrome.suppressFeedback: true` and two buttons. |
| *(click "Cancel order")* | Agent receives "Yes, cancel order #A-1043" and calls `cancel_order`. |
| "Show me order A-1043." *(after marking it shipped)* | Lens includes an external `link` node ("Track shipment") that opens the carrier URL outside the chat. |

### Incidents demo

The cross-domain demo: accounts and incidents, related by which accounts each incident touches. The presets are deliberately *focused* — the SPA-style incident dashboard (tabs, six-tile metrics grid, full inline timeline) is the explicit anti-pattern. Each conversational moment ("what's the impact?", "show me the timeline", "who's involved?") gets its own preset rendering its own focused card; the summary card just points at them.

| Prompt | What you should see |
|-|-|
| "What accounts do we have?" | `list_accounts`, then `show_lens` rendering `user-is-browsing-accounts` — list with per-row "Details" + "Open incidents" buttons. |
| "Tell me about Globex." | `user-asked-about-an-account` lens with tier+region badges and "Show open incidents" / "Top recent incidents" affordances. |
| "Show me the top 3 most recent incidents for Globex." | **Combined preset.** A compact account header card on top + an incidents list below with per-row Details buttons. Demonstrates cross-domain composition. |
| "What's incident INC-52790?" | Focused summary card (severity + status + IC + one-line summary) with three drill-in buttons: "What's the impact?", "Show recent updates", "Who's involved?" — NO tabs, NO six-tile metrics dashboard. |
| *(click "What's the impact?")* | `user-asked-about-incident-impact` — focused stat row (3–4 KPIs, not 6), tone-coloured by severity, with follow-ups to the timeline / contributors. |
| *(click "Show recent updates")* | `user-asked-about-incident-timeline` — 5 newest events as type-badged rows; "Show full history" if there are more. The exception that proves the per-row-buttons rule: this list has group-level affordances at the bottom, not per-row buttons. |
| *(click "Who's involved?")* | `user-asked-about-incident-contributors` — IC first with an "IC" badge, then authors. "Page the IC" affordance only on open/mitigated incidents. |
| "Compare INC-52790 with INC-52814." | `user-is-choosing-between-incidents` — comparison table with severity / status / age / IC / impact, plus per-item "Drill into …" buttons. |
| "Tell me about INC-52755." *(resolved)* | Summary card includes an external `link` node for the postmortem URL. No "Page the IC" — terminal state. |

### Recipes demo (the "Lens-on-an-unaware-server" demo) — uses two connectors

This is the most interesting demo because it proves the standalone-Lens thesis: **a server author who has never heard of MCP Lens can have their server suddenly produce rich, clickable affordances simply because the user installed `@mcp-lens/server` alongside it.** No code changes to the upstream. No `@mcp-lens/sdk` dependency. Just two connectors, side by side.

The recipe server (`recipes-mcp`) is deliberately Lens-unaware: three plain tools (`list_cuisines`, `search_recipes`, `get_recipe`), no presets, no `show_lens`, no `@mcp-lens/sdk` dependency in `package.json`. It looks like any MCP server an unrelated author would write.

The standalone Lens server (`mcp-lens-server`) ships only `show_lens`, three domain-blind moment-shaped presets, and the lens-authoring skill. It has no recipe knowledge whatsoever.

Configure both connectors in your host. The agent will see:

- **From recipes-mcp:** `list_cuisines`, `search_recipes`, `get_recipe`.
- **From mcp-lens-server:** `show_lens`, `get_lens_guide`, `get_lens_preset`.

The **A/B test that makes this compelling** is to disable the lens connector first, ask a recipe question, then re-enable it and ask again:

| Prompt | Lens off | Lens on |
|-|-|-|
| "What recipes do you have?" | Plain text list of titles. The user has to type to drill in. | `user-is-browsing-things` lens with thumbnails and per-row "Details" + "Make this" buttons. |
| "Tell me about the Smoked Salmon Penne." | Title + description + ingredient block as text. | `user-asked-about-a-thing` lens: hero image, badges for cuisine/time, follow-up buttons ("Make for 4", "See similar", "What can I substitute?"). |
| "Compare the Penne and the Curry." | Two text blocks side by side, no visual differentiation. | `user-is-choosing-between-things` lens: comparison table with highlighted differences and a "Pick the {recipe}" button per item. |
| *(click "Make for 4")* | n/a (no buttons in text mode) | Agent calls `get_recipe(id, servings=4)` and re-renders the lens with rescaled quantities. |
| "I want a quick vegetarian option." | Plain text list of matches. | Browsing lens filtered to the matches, each row clickable. |

The lens-on side proves three claims:

1. **The agent invents domain-specific verbs from generic presets.** The presets say "user-asked-about-a-thing → 2-3 follow-ups in the user's voice." The agent picks "Make for 4", "Substitute ingredients", etc. — recipe-specific verbs the presets never mention.
2. **The agent uses upstream tools the standalone server has never heard of.** Click "Make for 4" → the agent realizes it should call `recipes-mcp`'s `get_recipe(id, servings=4)`. The lens server didn't know that tool existed.
3. **The presets generalize across domains.** The same `user-is-browsing-things` preset that drives the shoes-mcp's per-row "Details" buttons drives the recipes-mcp's per-row "Make this" buttons. The moment is the same; the verbs shift to match the data.

If the agent sometimes ships a list with no per-row buttons (failure mode the presets explicitly warn against), the most likely cause is a stale build. Rebuild the Lens server (`pnpm --filter @mcp-lens/server build`) and reconnect.

## 6. Claude Desktop — the no-tunnel alternative

Claude Desktop speaks MCP over stdio natively. Faster setup, but widget embedding is less mature — you'll see the tool flow and descriptions, but the lens may render as a resource link rather than an inline widget.

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

Replace `<repo>` with the absolute path to your clone of this repo (Claude Desktop won't expand `~` or relative paths).

```json
{
  "mcpServers": {
    "shoes": {
      "command": "node",
      "args": ["<repo>/packages/demos/shoes-mcp/dist/stdio.js"]
    },
    "orders": {
      "command": "node",
      "args": ["<repo>/packages/demos/orders-mcp/dist/stdio.js"]
    },
    "incidents": {
      "command": "node",
      "args": ["<repo>/packages/demos/incidents-mcp/dist/stdio.js"]
    },
    "recipes": {
      "command": "node",
      "args": ["<repo>/packages/demos/recipes-mcp/dist/stdio.js"]
    },
    "lens": {
      "command": "node",
      "args": ["<repo>/packages/mcp-lens-server/dist/stdio.js"]
    }
  }
}
```

Then fully quit and reopen Claude Desktop (it only reads the config on cold start). The servers appear in the connector menu. To run the recipes A/B demo, enable both `recipes` and `lens` to see the lens-on experience, then disable `lens` (keeping `recipes` enabled) for the lens-off experience — same prompts, very different responses.

## 7. Slack (pilot — `slackbot_mcp_pilot`)

Slack's Slackbot MCP client lets a Slack app declare external MCP servers via the `mcp:connect` bot scope. The orders demo ships an example manifest at `packages/demos/orders-slack-app/manifest.json`. End-to-end this works much like the ChatGPT setup — the difference is the manifest goes through `api.slack.com/apps` instead of a connector form, and admin approval is part of the loop.

**Status: pilot.** Some moving parts are still unverified — see the "what we don't yet know" notes in the package README. This is the third host target after ChatGPT and Claude Desktop and the one most likely to surface fresh bridge-shape questions.

### Prerequisites

- The `slackbot_mcp_pilot` feature toggle on for your Slack workspace. Internal devs: ask in `#devel-slack-mcp-client`. Without it the manifest saves but the bot does nothing useful.
- A workspace where you (or an admin) can approve a custom app — org-deploy is preferred.
- An HTTPS tunnel (`ngrok` or `cloudflared`) — Slack will not connect to `http://localhost`.

### Steps

```bash
pnpm install
pnpm build
pnpm --filter orders-mcp start:http   # listens on :3002
ngrok http 3002                       # or: cloudflared tunnel --url http://localhost:3002
```

Edit `packages/demos/orders-slack-app/manifest.json` and replace `REPLACE_ME_WITH_TUNNEL_URL` with your tunnel host. Then at <https://api.slack.com/apps> → **Create New App** → **From an app manifest** → paste the manifest. Install at the org level if your workspace requires it.

In Slackbot, toggle on the "Orders MCP" connector and ask:

- *"What orders do I have?"* → calls `list_orders`, ideally renders via `show_lens`.
- *"Show me order A-1042."* → calls `get_order`, then `show_lens`.

### Phase 0 expectations (read-only)

The Slackbot pilot is **read-only in Phase 0**. The orders-mcp tools advertise `readOnlyHint`/`destructiveHint` annotations honestly, so Slack's filter has the data it needs:

- `list_orders`, `get_order`, `show_lens`, `get_lens_guide`, `get_lens_preset` should be available.
- `cancel_order`, `update_shipping_address` are non-read; Slack will likely suppress them in Phase 0. The cancel-confirmation flow won't be reachable until "tool allowance" / write-tool support lands. Suppression here is *expected*, not a bug.

### Iframe rendering — open unknowns

Slack's docs mention HTML iframes "for interoperability" alongside the Block Kit response format, but the bridge contract (which globals Slack exposes inside the iframe, which MIME types it accepts, whether `window.openai`-style hydration applies) isn't spelled out yet. The renderer's `host.ts` includes a one-time `host fingerprint` log at module load — open the iframe devtools console the first time a lens renders in Slack and you'll see exactly which globals are exposed. From that observation we wire up a Slack-specific reader, or fall back to a Block Kit translator. See `packages/demos/orders-slack-app/README.md` for the full troubleshooting pass.

## Common snags

- **"Connector failed to load."** Most often an ngrok warning interstitial. Visit the tunnel URL in a browser once to dismiss it, then retry in ChatGPT. Switching to `cloudflared` avoids this entirely.
- **ChatGPT says "I don't have that capability" / refuses to use the connector.** Make sure the connector toggle is **on** in the composer for the chat, not just enabled globally. Ask explicitly: *"Use the shoes connector to find…"*.
- **No lens appears, just text.** Either the skill isn't reaching the agent (verify the agent calls `get_lens_guide` on session start) or the agent chose text. Ask explicitly: *"Show this as a visual lens."* If that doesn't work, the agent may not be calling tools proactively on connect — embedding the skill in the server's `instructions` (already done in both demos) is the backup.
- **Widget appears then disappears / renders as plain text.** ChatGPT Apps widget behavior varies by account tier and feature flags. Check the server terminal for the tool response — the `_meta['openai/outputTemplate']` and `_meta['openai/widgetDescription']` should both be present. If they are, it's a client-side rendering issue, not a server problem.
- **"window.openai.toolOutput is null, expected an object with a `spec` field."** Stale renderer bundle. `mcp-lens` treats null as "not here yet." Rebuild: `pnpm build` at the repo root, then reconnect the connector.
- **"window.openai.toolInput has no `spec` field."** Same root cause — a stale bundle from before the host-bridge classifier correctly handled cross-tool bridge sharing. ChatGPT reuses `toolInput`/`toolOutput` across tool calls, and a non-lens tool's args appearing there is normal. Rebuild and reconnect.
- **"Invalid lens spec: root.children: Required" / "root.items.N.values: Required" / similar "Required" on a field that was manifestly present in your input.** Stale bundle. Versions 0.1.x experimented with several wire shapes (`spec` as `z.unknown()`, then `z.record(string, any)`, then `specJson` as a JSON-encoded string) trying to defeat ChatGPT's host-side JSON Schema enforcement. Current builds **publish no `outputSchema` at all** and ship a plain nested `spec` object — and ChatGPT delivers it intact. Rebuild (`pnpm build`) and reconnect the connector. If it persists, the iframe may be cached — disconnect the connector, re-register it, and try again.
- **Widget shows a stale-bundle-style error specifically *after a button click* on a widget that had been working a moment earlier.** Older builds fell back to `window.openai.toolInput` when `toolOutput` was null — which catches the agent's *next tool call's args* mid-streaming (e.g. only `{specVersion: "0.1"}` populated so far) and validates it as a broken lens. Current builds read only `toolOutput` and subscribe to `openai:set_globals`, so they don't conflate other tools' input with our output. Rebuild and reconnect.
- **stdio MCP client (Codex Desktop, Claude Desktop) connects without error but never uses the tools.** Older demo builds shipped the entire 15KB lens skill in the server's `instructions` field. Some stdio clients truncate or otherwise mishandle oversized `instructions`, and there's no error surface for it. Current builds keep `instructions` to a ~500-byte orientation paragraph and deliver the full skill via the `get_lens_guide` tool (which the agent calls on session start). If you're on an old build, you'll see no errors — just an unresponsive agent. Rebuild and reconfigure the connector.

## Reading the iframe console

The renderer logs every step of its load path with a `[mcp-lens host]` and `[mcp-lens app]` prefix. When something goes wrong inside the widget, this is your single best diagnostic.

To open the iframe console in ChatGPT:
1. Open browser devtools.
2. In Chrome, choose the iframe context from the top-of-console dropdown (shows up as a `<iframe>` next to the page title).
3. Reload the chat or trigger a `show_lens` call.

You'll see, in order:
- `host: scanning window.openai bridge` — what the bridge looks like at first read.
- `host: source: window.openai.toolOutput { type: …, keys: […] }` — what arrived from ChatGPT.
- `host: classify: window.openai.toolOutput ok — spec keys […]` — the validated payload's structure.
- `app: zod validation passed — rendering root { rootType: "card" }` — the renderer is about to draw.

If validation fails, the log includes the *full received spec* (before zod) and the zod issues — so you can compare what the agent sent vs. what the widget actually received and see exactly where data was lost.
- **Memorialized preferences disappear.** The shoes-mcp demo's `save_lens_preference` tool is in-memory and resets when the demo server restarts. This is expected; real deployments wire their own memorialize tool to a durable store (see the cookbook in [`packages/mcp-lens/README.md`](../packages/mcp-lens/README.md#authoring-a-memorialize-tool)).
- **Comparison table looks transposed from what you expect.** It is — MCP Lens's `table` puts `fields` as rows and `items` as columns. This is deliberate; see [`spec.md`](./spec.md) and [`decisions.md`](./decisions.md) for the reasoning.

## Observing the flow

The most useful tool for debugging is the demo's own terminal. Every request prints as JSON-RPC. A successful lens render looks like:

1. `tools/list` — ChatGPT discovers what's available.
2. `tools/call` for `get_lens_guide` — agent pulls the spec reference, preferences, and preset index into context.
3. `tools/call` for a domain tool (e.g. `get_shoe`) — returns JSON data.
4. `tools/call` for `show_lens` — response includes `structuredContent: { specJson }` (the full spec as a JSON-encoded string) plus `_meta['openai/outputTemplate']` (renderer URI) and `_meta['openai/widgetDescription']` (the agent's description, model-facing).
5. `resources/read` for the renderer URI — ChatGPT fetches the HTML bundle.
6. Widget renders in the chat; `window.openai.toolOutput` carries `{ specJson: "<JSON string>" }`. The renderer parses the JSON internally. The description stays in `_meta` for the agent, not the widget.

If any of these steps stops happening, work back from the missing step.
