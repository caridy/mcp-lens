/**
 * mcp-lens-server — the standalone MCP Lens application.
 *
 * Run this server alongside any other MCP server in your host's
 * connector list. The agent will see the upstream server's tools (which
 * fetch / mutate domain data) AND the lens tools shipped here, and can
 * compose lenses that anchor on the upstream's data using the
 * domain-blind moment-shaped presets included in this package.
 *
 * What this server exposes:
 *
 *   Tools:
 *     - show_lens                   (required — the generic renderer surface)
 *     - get_lens_guide              (session bootstrap: spec ref + preset index)
 *     - get_lens_preset             (returns a preset's full markdown body)
 *
 *   Resources:
 *     - ui://mcp-lens/renderer.html (the React widget bundle)
 *
 * Notably *not* exposed:
 *
 *     - any memorialize tool        (the SDK no longer ships one; server
 *                                    authors define their own. This
 *                                    standalone tier has no identity
 *                                    story, so the star prompt degrades
 *                                    to session-only acknowledgement
 *                                    when no upstream offers one.)
 *     - any domain-specific tools   (this server has no upstream — it's
 *                                    just the lens machinery)
 *
 * The pitch: any user who can configure an MCP connector can install
 * this server and unlock rich next-turn affordances on top of every
 * other MCP server they have wired up, without any change to those
 * upstream servers.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerShowLens } from '@mcp-lens/sdk';
import { GENERIC_PRESETS } from './presets.js';
import { debugLog, isDebugEnabled } from './debug.js';

export interface CreateLensServerOptions {
  /** Override server name (defaults to "mcp-lens-server"). */
  name?: string;
  /** Override server version. */
  version?: string;
}

export function createLensServer(
  options: CreateLensServerOptions = {},
): McpServer {
  const server = new McpServer(
    {
      name: options.name ?? 'mcp-lens-server',
      version: options.version ?? '0.1.0',
    },
    {
      capabilities: { tools: {}, resources: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  registerShowLens(server, {
    presets: GENERIC_PRESETS,
    onCall: isDebugEnabled() ? (event) => debugLog('show_lens_call', event) : undefined,
  });

  return server;
}

// Server instructions are deliberately short. (See the comment in any of
// the demo servers' SERVER_INSTRUCTIONS block for why — oversized
// instructions break some stdio clients silently.) The full lens skill
// is delivered via the get_lens_guide tool; the moment presets are
// listed in its output and fetchable via get_lens_preset.
const SERVER_INSTRUCTIONS = `mcp-lens-server — generic Lens app.

This server gives you show_lens plus domain-blind moment-shaped presets so you can render rich next-turn affordances on top of data from other MCP servers connected to this host.

Tools:
- get_lens_guide: call FIRST — returns the spec reference, preferences, and preset index.
- get_lens_preset(name): fetch a preset's full body for moment-specific guidance.
- show_lens(spec, description): render a lens.

Workflow: get_lens_guide → (optionally) get_lens_preset → show_lens. The presets are domain-blind — they tell you WHAT KIND of follow-ups to offer; YOU pick the verbs that fit the upstream data.`;
