/**
 * Placeholder for the Slack CLI's `start` hook.
 *
 * `orders-slack-app` is a manifest-only Slack project. The actual MCP
 * runtime is `orders-mcp` — running separately on :3002 and exposed to
 * Slack via the tunnel URL in `manifest.json`. There is no local Bolt
 * server to start.
 *
 * The Slack CLI's default start hook (from `@slack/cli-hooks`) expects
 * to spawn `node app.js`. Without this file, `slack run` errors out
 * with `Cannot find module '...app.js'`. So this file exists purely to
 * satisfy that contract: print a status line, keep the process alive
 * so the CLI is happy, exit cleanly on Ctrl+C.
 *
 * If you ever add real Slack-side logic (event handlers, slash
 * commands, interactivity), replace this with a real Bolt app.
 */

const banner = `
[orders-slack-app] manifest synced. nothing to run locally.

  This Slack app is MCP-only — Slack reaches your MCP server directly
  at the URL in manifest.json. Make sure orders-mcp and your tunnel
  are running:

    pnpm --filter orders-mcp start:http   # :3002
    ngrok http 3002                       # or cloudflared tunnel ...

  Press Ctrl+C to stop.
`;
console.log(banner);

const heartbeat = setInterval(() => {}, 1 << 30);

function shutdown() {
  clearInterval(heartbeat);
  console.log('[orders-slack-app] stopped.');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
