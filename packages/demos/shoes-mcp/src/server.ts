/**
 * shoes-mcp — a fake MCP server demo for MCP Lens.
 *
 * Exposes plain-JSON tools for browsing a tennis shoe catalog, then plugs
 * in MCP Lens (show_lens + presets + skill) so any agent connected to the
 * server can present rich, composed views without the shoe tools knowing
 * anything about UI.
 *
 * Also includes a worked example of an **author-defined memorialize tool**
 * (`save_lens_preference`). The SDK no longer ships memorialize — server
 * authors define their own. This file is the canonical reference for what
 * such a tool looks like end-to-end: name, description that survives the
 * agent's discovery-by-description flow, schema, and a per-user store.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  registerShowLens,
  registerPresets,
  registerLensSkillResource,
} from '@mcp-lens/sdk';
import { findShoe, searchShoes, SHOES } from './data.js';
import { SHOE_PRESETS } from './presets.js';

export function createShoesServer(): McpServer {
  const server = new McpServer(
    { name: 'shoes-mcp', version: '0.1.0' },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  // ── Domain tools ────────────────────────────────────────────────────────
  server.registerTool(
    'search_shoes',
    {
      title: 'Search tennis shoes',
      description:
        'Search the tennis shoe catalog. Returns a list of shoes matching the filters. Each result includes id, name, brand, category, weight, cushioning, stability, durability, price, image URL, and a short description. Use the id with get_shoe to fetch a single shoe.',
      inputSchema: {
        brand: z.string().optional().describe('e.g. "Nike", "Asics"'),
        category: z
          .enum(['all-court', 'clay', 'grass'])
          .optional()
          .describe('Court surface category'),
        maxPrice: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Maximum price in USD'),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ brand, category, maxPrice }) => {
      const results = searchShoes({ brand, category, maxPrice });
      return {
        content: [
          {
            type: 'text' as const,
            text: `${results.length} shoe(s):\n${results
              .map((s) => `- ${s.id}: ${s.brand} ${s.name} (${s.category}, ${s.weightGrams}g, $${s.priceUsd})`)
              .join('\n')}`,
          },
        ],
        structuredContent: { shoes: results },
      };
    },
  );

  server.registerTool(
    'get_shoe',
    {
      title: 'Get shoe details',
      description:
        'Fetch full details for a single shoe by id. Use this before composing a lens about a shoe so you have the imageSrc and full spec values.',
      inputSchema: {
        id: z.string().describe('The shoe id from search_shoes.'),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      const shoe = findShoe(id);
      if (!shoe) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `No shoe with id "${id}". Available ids: ${SHOES.map((s) => s.id).join(', ')}.`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(shoe, null, 2),
          },
        ],
        structuredContent: { ...shoe },
      };
    },
  );

  // ── MCP Lens wiring ─────────────────────────────────────────────────────
  //
  // Register show_lens (required), then the optional helpers. Ordering is
  // not significant — each registers a distinct set of tools/resources.

  registerShowLens(server);
  registerPresets(server, SHOE_PRESETS);
  registerLensSkillResource(server);

  // ── Memorialize tool — author-defined, not shipped by the SDK ──────────
  //
  // The renderer's star affordance emits a follow-up prompt asking the
  // agent to memorialize the current view. The agent finds a tool to
  // call by reading tool descriptions; if it finds one, it calls it; if
  // not, it acknowledges in conversation. This is that tool, named the
  // way the demo wants and persisted however the demo wants — in this
  // case, in process memory keyed by an `anonymous` user (because
  // shoes-mcp has no auth model).
  //
  // Real servers should:
  //   1. Replace `getUserId` with a real lookup (auth token, OAuth claim,
  //      OS user, etc.). The `extra` argument exposes the request context.
  //   2. Replace the in-memory Map with a durable store. The shape is
  //      yours — a single string per user is the simplest thing that
  //      works; a structured per-domain object is more useful long-term.
  //   3. Adjust the description to name your domain. The discovery flow
  //      keys on words like "save", "remember", "preference", "presentation",
  //      "view", "memorialize" — keep at least one of those in the first
  //      sentence so the agent recognizes the tool from `tools/list`.

  const preferenceStore = new Map<string, string[]>();
  function getUserId(_extra: unknown): string {
    return 'anonymous'; // demo-only — real servers wire their auth here.
  }

  server.registerTool(
    'save_lens_preference',
    {
      title: 'Save a lens presentation preference',
      description:
        'Save a presentation preference the user just confirmed by starring a lens — for example "prefer compact cards", "hide pricing in shoe summaries", or any other lens-shaping cue. Call this when the user stars a view (the renderer emits a follow-up prompt asking you to memorialize); pass the description you wrote when calling show_lens. Call with no arguments at session start to load the user\'s previously saved preferences and use them to shape every lens you compose for the rest of the session.',
      inputSchema: {
        description: z
          .string()
          .optional()
          .describe(
            'The lens description to save as a preference. Omit to read all stored preferences for this user.',
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args, extra) => {
      const userId = getUserId(extra);
      const description = args.description?.trim() ?? '';
      if (description.length > 0) {
        const existing = preferenceStore.get(userId) ?? [];
        existing.push(description);
        preferenceStore.set(userId, existing);
        return {
          content: [
            { type: 'text' as const, text: `Saved preference for ${userId}.` },
          ],
          structuredContent: { stored: true, userId },
        };
      }
      const all = preferenceStore.get(userId) ?? [];
      const text =
        all.length === 0
          ? 'No saved lens preferences for this user yet.'
          : `Saved lens preferences (apply these to every lens):\n${all
              .map((p, i) => `${i + 1}. ${p}`)
              .join('\n')}`;
      return {
        content: [{ type: 'text' as const, text }],
        structuredContent: { userId, preferences: all },
      };
    },
  );

  return server;
}

// Server instructions are deliberately short. Some MCP clients (notably
// Codex Desktop and Claude Desktop) limit or silently drop oversized
// `instructions` fields in the initialize response — and we previously
// shipped the entire 15KB lens skill here, which broke those clients
// without surfacing any error.
//
// The full skill is exposed via the `skill://mcp-lens/show-lens`
// resource (registered by registerLensSkillResource). Agents that read
// MCP resources will pick it up automatically; agents that don't can
// be told to fetch it via this short pointer.
const SERVER_INSTRUCTIONS = `shoes-mcp — tennis shoe catalog with MCP Lens for rich presentation.

Tools:
- search_shoes, get_shoe: catalog data.
- show_lens: render a rich view. Takes spec + description.
- list_lens_presets, get_lens_preset: presentation precedents.
- save_lens_preference: read or write per-user lens-presentation preferences. Call once with no arguments at session start to load preferences; call with a description on star to save one.

Before composing any lens, read the resource skill://mcp-lens/show-lens for the full lens-authoring guide, then call list_lens_presets to see this server's presentation precedents.`;
