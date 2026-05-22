# orders-slack-app

A **Slack CLI project** that exposes the `orders-mcp` demo server to Slackbot via Slack's `mcp:connect` scope. There is no source code here — the only inputs are the manifest and the CLI scaffolding. The Slack CLI handles app creation, manifest sync, and install.

This is the third validated host target alongside ChatGPT Apps and Claude Desktop. It rides on Slack's pilot Slackbot MCP client (feature-flagged as `slackbot_mcp_pilot`).

## What's in this directory

| Path | Purpose |
|-|-|
| `manifest.json` | The Slack app manifest. Source of truth for scopes, MCP servers, etc. The Slack CLI reads this directly. |
| `.slack/hooks.json` | Tells the Slack CLI to delegate hooks to `@slack/cli-hooks`. |
| `.slack/config.json` | Tells the CLI the manifest is local (not API-managed). |
| `.slack/.gitignore` | Keeps CLI-generated files (`apps.dev.json`, `apps.json`, `cache/`) out of git. |
| `package.json` | Carries `@slack/cli-hooks` as a devDependency so the CLI can find it. |

## What you'll need

- The **Slack CLI** installed: <https://api.slack.com/automation/cli/install>. After install, run `slack login` once to authenticate against your workspace.
- The `slackbot_mcp_pilot` feature toggle on for your workspace. Internal devs: ask in `#devel-slack-mcp-client`. Without this toggle the manifest will save and the app installs, but the bot won't expose the MCP servers at runtime.
- An HTTPS tunnel to your laptop (`ngrok` or `cloudflared`). Slack will not connect to `http://localhost`.
- Node 20+ and pnpm — to run `orders-mcp` locally on `:3002`.

## Quick start

```bash
# 1. From repo root: build + start orders-mcp on :3002
pnpm install
pnpm build
pnpm --filter orders-mcp start:http   # leave this running

# 2. In another terminal: open a tunnel to :3002
ngrok http 3002
# …or: cloudflared tunnel --url http://localhost:3002
```

Edit `manifest.json` and replace the `mcp_servers.orders.url` value with your tunnel URL (the path is `/mcp`):

```json
"orders": {
  "url": "https://<your-tunnel>.ngrok-free.dev/mcp",
  "headers": { "Authorization": "Bearer dev-only-no-auth" }
}
```

Then from this directory:

```bash
cd packages/demos/orders-slack-app
slack run
```

The CLI prompts you to pick a workspace (the first time), creates the app, syncs the manifest, and installs it. Subsequent runs reuse the same app and just push manifest changes.

## Trying it out in Slack

After the connector is approved and visible:

1. Open Slackbot in the workspace.
2. Open the connector panel and toggle on **Orders MCP**.
3. Ask Slackbot a question that exercises a read tool, e.g.:
   - *"What orders do I have?"* — should call `list_orders` and ideally render via `show_lens`.
   - *"Show me order A-1042."* — should call `get_order`, then `show_lens` with the order detail.
4. Watch the orders-mcp terminal — every JSON-RPC request the connector sends prints there.

## Phase 0 expectations

Slackbot's pilot is **read-only in Phase 0**. The orders-mcp server registers tool annotations honestly:

| Tool | `readOnlyHint` | Notes |
|-|-|-|
| `list_orders` | true | Should be available. |
| `get_order` | true | Should be available. |
| `cancel_order` | false (`destructiveHint: true`) | **Likely suppressed in Phase 0.** The cancel-confirmation flow won't be reachable until Slack's "tool allowance" / write-tool support ships in a later phase. |
| `update_shipping_address` | false | Likely suppressed in Phase 0. |
| `show_lens` | true | Should be available — composes a UI resource, no side effects. |
| `list_lens_presets`, `get_lens_preset` | true | Should be available. |

Suppression of write tools is the *expected* Phase 0 behavior, not a bug. Re-test once Slack rolls out tool allowance.

## Iframe rendering — what we expect, what we don't yet know

Slack's docs say HTML iframes are supported "for interoperability" alongside the new Block Kit response format. The lens renderer ships as an HTML widget keyed off `window.openai.toolOutput` (the ChatGPT Apps bridge). We don't yet know:

- Whether Slack populates `window.openai`, exposes its own `window.slack` bridge, or uses something else entirely.
- Whether it accepts our `text/html+skybridge` MIME type, plain `text/html`, or requires a Slack-specific MIME.
- Whether Block Kit is required for native rendering and HTML iframes are a fallback.

The renderer logs a one-time `host fingerprint` at module load — when the widget first renders inside Slack, open the iframe devtools console and look for `[mcp-lens host] host fingerprint`. The matched globals tell us exactly which bridge to wire up. From there a small follow-up patch adds the right reader. If the iframe renders blank with no logs at all, Slack rejected the resource entirely — different problem (MIME type or Block Kit fallback).

## Sharing the manifest with another developer

`manifest.json` is checked in with whatever URL was last set. Tunnel URLs are personal and time-limited, so each developer typically swaps in their own. Don't commit a long-lived tunnel URL unless you actually intend to share it.

If you need a stable URL for a teammate, deploy `orders-mcp` somewhere durable (Fly, Railway, Heroku) and point the manifest there.

## Auth posture

This demo uses **Option D — no auth / static headers** (per the Slackbot MCP DevXP doc). The `Authorization: Bearer dev-only-no-auth` header is a placeholder — orders-mcp doesn't validate it. **Do not** ship this posture to production. Real deployments would use:

- **Option C (Slack Identity-Based Auth)** — Slack signs requests; orders-mcp would verify `X-Slack-Signature` and map `params._meta.slack.user_id` to the per-user order list.
- **Option B (External OAuth)** — orders-mcp would expose `/authorize` and `/token` endpoints.

Either is a substantial follow-up; out of scope for this demo.

## Troubleshooting

- **`🚫 This is an invalid Slack app project directory`.** The `.slack/hooks.json` file is missing (or `@slack/cli-hooks` isn't installed). From this directory: `pnpm install` again from the repo root, then verify `node_modules/@slack/cli-hooks/` exists.
- **`slack run` prompts to pick a workspace every time.** That's normal until you've actually installed it once. After the first successful `slack run`, the CLI writes `.slack/apps.dev.json` and remembers.
- **Connector doesn't appear in Slackbot.** Check that the `slackbot_mcp_pilot` toggle is on for your workspace. Without it the manifest syncs but the bot does nothing useful.
- **Connector appears but tools aren't callable.** Open the orders-mcp terminal — if no JSON-RPC requests show up, Slack isn't reaching the tunnel. Hit the tunnel URL in a browser to dismiss any ngrok interstitial, then retry. Switch to cloudflared if ngrok is the friction point.
- **Tools list empty / partial.** Phase 0 read-only filter is the most likely cause. Confirm by reading the tool list in the orders-mcp terminal — what the agent receives may be a subset of what the server exposes.
- **Widget appears blank or never renders.** Open the iframe devtools console. Search for `[mcp-lens host]` logs. If absent, the host didn't load the iframe at all — likely a MIME-type or resource-fetch issue. If present but never finds a bridge, that's the host-fingerprint log telling us what to wire up next.
- **`cancel_order` works in ChatGPT/Claude but is invisible in Slack.** Expected — it's a write tool. Wait for Slack's tool-allowance rollout.
