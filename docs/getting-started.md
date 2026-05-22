# Getting started — adding MCP Lens to an existing MCP server

You have a working MCP server. You want rich, agent-composed presentation alongside your existing tool responses. This guide takes you from install to a working `show_lens` in ~10 lines of code.

## Prerequisites

- Node 20+ (or whatever your MCP server already uses).
- `@modelcontextprotocol/sdk ^1.0.0`.
- An MCP server you've already built and tested.
- A host that implements the MCP UI Apps spec ([SEP-1865](https://github.com/modelcontextprotocol/ext-apps)). Validated targets: Claude Desktop, ChatGPT Apps (via legacy compatibility), Slack's pilot Slackbot MCP client. The library dual-emits both the canonical `_meta.ui.resourceUri` and the ChatGPT-legacy `openai/*` keys, so the same code path works across hosts.

## 1. Install

When the package is published to npm:

```bash
pnpm add @mcp-lens/sdk @modelcontextprotocol/sdk
```

Until then, install from source:

```bash
# Clone this repo somewhere accessible
git clone <this-repo> ../mcp-lens-source

# In your server's package.json, depend on the workspace path or pack it
pnpm add file:../mcp-lens-source/packages/mcp-lens

# OR: pnpm pack the library and install the tarball
cd ../mcp-lens-source/packages/mcp-lens && pnpm pack
# then in your server:
pnpm add ../mcp-lens-source/packages/mcp-lens/mcp-lens-sdk-0.1.0.tgz
```

## 2. Register `show_lens`

One call. Place it alongside your existing tool registrations.

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerShowLens } from '@mcp-lens/sdk';

const server = new McpServer(
  { name: 'my-server', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {} } },
);

// your existing tools
// ...

registerShowLens(server);
```

That's it — the agent can now compose lenses and call `show_lens` with them. The renderer is served inline as an MCP UI resource.

## 3. Add the skill

The agent needs to learn how to use MCP Lens. Two options:

### Option A — expose it as a resource (easiest)

Some MCP clients (including many configurations of ChatGPT Apps) surface resources to the agent automatically.

```ts
import { registerLensSkillResource } from '@mcp-lens/sdk';

registerLensSkillResource(server);
```

### Option B — embed it in your server instructions

If you want to guarantee the agent reads it, put it in the server's `instructions`:

```ts
import { getLensSkill } from '@mcp-lens/sdk';

const server = new McpServer(
  { name: 'my-server', version: '0.1.0' },
  {
    capabilities: { tools: {}, resources: {} },
    instructions: `You are connected to my-server. Tools: ...\n\n${getLensSkill()}`,
  },
);
```

## 4. (Optional) Add memorialized preferences

Durable per-server, per-user preferences. Ships with a non-durable in-memory default — fine for POCs and demos; for real use, supply your own store.

```ts
import { registerInMemoryMemorialize } from '@mcp-lens/sdk';

// in-memory default (demo only)
registerInMemoryMemorialize(server);

// or with a real backing store + real user id
registerInMemoryMemorialize(server, {
  store: {
    async add(userId, description) {
      await db.preferences.insert({ userId, description, at: new Date() });
    },
    async list(userId) {
      const rows = await db.preferences.findByUser(userId);
      return rows.map((r) => r.description);
    },
  },
  getUserId: (extra) => (extra as any).authInfo?.userId ?? 'anonymous',
});
```

## 5. (Optional) Ship lens presets

A preset is a short markdown document that teaches the agent how *your* server thinks a particular kind of data should be presented. It's precedent, not a template — the agent adapts real data rather than filling in placeholders.

```ts
import { registerPresets } from '@mcp-lens/sdk';

registerPresets(server, [
  {
    name: 'order-summary',
    description: 'How to show a single order with status and actions.',
    body: `
# Order summary preset

Use this when the user is focused on one order.

## Design intent

- Lead with the order id as title.
- Status as a badge matching the status's tone (info for processing, ...).
- Action buttons depend on the order's state — don't offer "cancel" on a delivered order.

## Illustrative example — replace every string with real data

\`\`\`json
{
  "specVersion": "0.1",
  "root": {
    "type": "card",
    "title": "Order #<id>",
    "children": [...]
  }
}
\`\`\`
`.trim(),
  },
]);
```

## 6. Full example

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerShowLens,
  registerInMemoryMemorialize,
  registerPresets,
  registerLensSkillResource,
} from '@mcp-lens/sdk';

const server = new McpServer(
  { name: 'my-server', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {} } },
);

// Your existing tools
// server.registerTool('get_order', { ... }, async () => { ... });

// MCP Lens — four lines to get rich UI
registerShowLens(server);
registerInMemoryMemorialize(server);
registerPresets(server, [/* your presets */]);
registerLensSkillResource(server);
```

## Verifying

Connect an MCP client. You should see the following new tools in `tools/list`:

- `show_lens` — always.
- `memorialize_lens` — if you called `registerInMemoryMemorialize`.
- `list_lens_presets` + `get_lens_preset` — if you called `registerPresets`.

And in `resources/list`:

- `ui://mcp-lens/renderer.html` — the rendered widget.
- `skill://mcp-lens/show-lens` — if you called `registerLensSkillResource`.

## What the agent will do

Roughly:

1. On connection, read the skill (`skill://mcp-lens/show-lens`) and the server instructions.
2. On the first user turn, call `memorialize_lens` with no args to load preferences (if available).
3. When a user question would benefit from a visual answer, consult `list_lens_presets`, fetch relevant presets, compose a lens, and call `show_lens(spec, description)`.
4. The host renders the lens inside an iframe, with thumbs-up / thumbs-down chrome.
5. Button clicks emit follow-up prompts; thumbs-up emits a memorialize request — all mediated by the agent.

See [`spec.md`](./spec.md) for what a lens looks like.
