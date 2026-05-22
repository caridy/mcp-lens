# @mcp-lens/server

Standalone MCP server that ships the [MCP Lens](https://www.npmjs.com/package/@mcp-lens/sdk) machinery — `show_lens`, the renderer, and three domain-blind moment-shaped presets — behind a stdio binary you can drop into any MCP host's connector list.

Pair it with any *unaware* upstream MCP server (one that doesn't itself depend on `@mcp-lens/sdk`) to give that server's data agent-composed views without writing a line of code.

## Use

In Claude Desktop, ChatGPT Apps, or any other MCP host that accepts a stdio connector config:

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

Then register your *real* MCP server (recipes, tickets, whatever) alongside it. The agent gets `show_lens` from `lens` and the domain tools from the other connector. It composes lenses against the upstream's data using the three generic presets shipped here.

For HTTP transport (ChatGPT Apps via tunnel, Slack pilot, etc.):

```bash
npx -y @mcp-lens/server-http   # listens on :3010 by default; override with PORT
```

## What it ships

- **`show_lens`** — the canonical lens-rendering tool. Same as installing `@mcp-lens/sdk` directly.
- **`list_lens_presets` / `get_lens_preset`** — discovery for the three generic moment-shaped presets.
- **`skill://mcp-lens/show-lens`** — the lens-authoring skill, exposed as an MCP resource so the agent reads it on connect.

What it does **not** ship:

- A memorialize tool. The SDK never ships one (server authors define their own); this standalone server has no identity story to wire one to. When paired with an upstream that *does* advertise a memorialize-style tool, the agent will find it by description and use it. When paired with an upstream that doesn't, the renderer's star prompt degrades gracefully — the agent acknowledges the preference in conversation for the rest of the session.
- Domain-specific presets — bring your own (or fork this and add them).

## When to use this vs. integrating directly

| Use this | Integrate `@mcp-lens/sdk` directly |
|---|---|
| You don't own the upstream MCP server | You own the upstream server |
| You want a quick "drop in and see lenses" demo | You want domain-specific presets and lifecycle-aware affordances |
| The generic presets cover your moments | You need bespoke moment shapes for your data |

The generic presets cover catalog-shaped data well. They're weaker for specialized domains (incident management, ticket workflows, anything with non-trivial lifecycles) — for those, integrate the SDK and ship your own presets.

## License

MIT.
