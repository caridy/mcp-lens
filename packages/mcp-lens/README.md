# @mcp-lens/sdk

Agent-composed views for any MCP server. Drop in one tool, gain rich presentation.

MCP Lens is a proof-of-concept alternative to the "MCP UI App" model. Instead of each tool author shipping a static widget, the **agent composes a view on the fly** from a small JSON spec (a *lens*), and a single generic tool wraps it in an MCP UI resource. Drop the tool into any MCP server — even ones that know nothing about UI — and that server gains rich, conversational-context-aware presentation for free.

## Install

```bash
npm install @mcp-lens/sdk @modelcontextprotocol/sdk
```

## Minimal use

One line. Your existing MCP server gains a `show_lens` tool and the renderer resource.

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerShowLens } from '@mcp-lens/sdk';

const server = new McpServer(
  { name: 'my-server', version: '0.1.0' },
  { capabilities: { tools: {}, resources: {} } },
);

registerShowLens(server);
```

## Full install

All three components, each opt-in except `registerShowLens`.

```ts
import {
  registerShowLens,          // required — the show_lens tool + renderer
  registerPresets,           // optional — server-authored presentation precedents
  registerLensSkillResource, // optional — expose the skill as an MCP resource
  getLensSkill,              // the skill as a markdown string
} from '@mcp-lens/sdk';

registerShowLens(server);
registerPresets(server, [myShoePreset, myOrderPreset]);
registerLensSkillResource(server);
```

## Concepts

### Lens

A small JSON tree describing a view. The agent composes it at runtime from whatever data it has. Nodes: `card`, `column`, `row`, `box`, `text`, `markdown`, `image`, `badge`, `separator`, `button`, `link`, `list`, `table`.

```json
{
  "specVersion": "0.1",
  "root": {
    "type": "card",
    "title": "Nike Vaporfly 3",
    "children": [
      { "type": "text", "text": "Carbon plate racing shoe." },
      {
        "type": "button",
        "label": "Compare",
        "prompt": "Compare Vaporfly 3 with Alphafly 3.",
        "variant": "primary"
      }
    ]
  }
}
```

### `show_lens`

The only required tool. Takes a `spec` and a `description` (model-facing metadata about what's on screen). Returns an MCP UI resource hosting a single-file React renderer that hydrates from the tool output.

### Memorialization (server-defined, optional)

The renderer ships a single **star** affordance below every lens. When the user clicks the star, the widget emits a follow-up prompt asking the agent to remember the presentation. The SDK does **not** ship a memorialize tool — server authors define their own (with whatever name and schema fits the server's identity story); the agent discovers it by reading tool descriptions and decides whether to call it. If no such tool exists, the agent acknowledges the preference in conversation for the rest of the session.

This keeps the SDK out of the identity business — server authors who already know who their users are wire memorialize the way that fits their stack; servers without identity (e.g. the standalone `npx`-launched `@mcp-lens/server`) simply skip it.

#### Authoring a memorialize tool

A memorialize tool is just a regular MCP tool with two responsibilities: read all preferences for the current user (call with no args), or append one (call with a `description`). Three things make the agent recognize and use it correctly:

1. **The description.** Discovery is by description, not name. Include words like *save*, *remember*, *preference*, *presentation*, or *memorialize* in the first sentence. Mention both modes (read with no args, write with a description). Tell the agent to call it once at session start to load preferences.
2. **The schema.** A single optional `description: string` argument is the simplest thing that works. Absence means read; presence means write.
3. **The identity hook.** Resolve the current user from the request context (auth token, OAuth claim, session cookie, OS user — whatever your server already does). Don't ship a server-wide `anonymous` bucket to production; it merges every user's preferences into one.

```ts
import { z } from 'zod';

const preferenceStore = new Map<string, string[]>(); // replace with durable storage

server.registerTool(
  'save_lens_preference',                            // pick whatever name fits your server
  {
    title: 'Save a lens presentation preference',
    description:
      'Save a presentation preference the user just confirmed by starring a lens — for example "prefer compact cards", "hide pricing in summaries". Call with the description you wrote when calling show_lens. Call with no arguments at session start to load all of the user\'s saved preferences and use them to shape every lens you compose.',
    inputSchema: {
      description: z
        .string()
        .optional()
        .describe('The lens description to save. Omit to read all preferences for this user.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  async (args, extra) => {
    const userId = resolveUserId(extra);             // ← your auth lookup goes here
    const description = args.description?.trim() ?? '';
    if (description.length > 0) {
      const existing = preferenceStore.get(userId) ?? [];
      existing.push(description);
      preferenceStore.set(userId, existing);
      return { content: [{ type: 'text', text: 'Saved.' }], structuredContent: { stored: true } };
    }
    const all = preferenceStore.get(userId) ?? [];
    return {
      content: [{ type: 'text', text: all.length ? all.join('\n') : 'No preferences yet.' }],
      structuredContent: { preferences: all },
    };
  },
);
```

A worked example you can run end-to-end lives in `packages/demos/shoes-mcp/src/server.ts` (search for `save_lens_preference`). It uses an `anonymous` user id for demo purposes — production servers replace that with a real lookup.

### Lens presets (optional)

Short markdown documents the server author ships as presentation precedent (e.g. "what to show when the user asks about one shoe"). Presets are **precedent, not templates** — the agent studies them and adapts real data, rather than filling in placeholders.

**Organize presets by conversational moment, not data shape.** Names like `user-asked-about-a-shoe` or `user-is-browsing-orders` describe what the user is *doing*. Each preset names both the right anchor (data) and the right next-turn affordances (buttons / links) for that moment. Same data → different lenses, depending on the moment.

Two tools register together:

- `list_lens_presets()` — names + one-line descriptions.
- `get_lens_preset(name)` — full body.

```ts
registerPresets(server, [
  {
    name: 'user-asked-about-a-shoe',
    description: 'Use when the user named one shoe and is likely to compare or see similar.',
    body: '# Moment: user asked about one shoe\n\nAnchor on the shoe; offer 2-3 follow-ups...\n\n```json\n{ ... }\n```',
  },
]);
```

### The skill

A markdown document that teaches the agent how to use MCP Lens. Read by the agent before composing any lens. Ships as a file in the package; expose to the agent via `registerLensSkillResource(server)` (for clients that auto-surface MCP resources) or by embedding `getLensSkill()` in your server instructions.

## Contract

The lens spec is the contract the system is built around. See `src/spec/types.ts` for the canonical TypeScript types and `src/spec/schema.ts` for the zod runtime validator. Both are exported:

```ts
import { lensSpecSchema, type LensSpec, LENS_SPEC_VERSION } from '@mcp-lens/sdk';
```

## What the agent sees

When the agent calls `show_lens`, the tool response carries:

- `content` — `[{ type: 'text', text: '[lens shown]' }]` — a short placeholder for text-only hosts.
- `structuredContent` — `{ spec }` — delivered to the widget as `window.openai.toolOutput`.
- `_meta.ui.resourceUri` — canonical SEP-1865 pointer to the rendered resource.
- `_meta['openai/outputTemplate']` — ChatGPT Apps legacy pointer to the same resource.
- `_meta['openai/widgetDescription']` — the agent-authored description, model-facing.

## Button semantics

Every button in a lens is a **follow-up prompt**, not a tool call. When clicked, the widget emits the `prompt` string back to the agent host as if the user had typed it. The agent mediates every action. The widget never calls tools or APIs directly.

## License

MIT.
