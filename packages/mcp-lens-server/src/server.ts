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
 *     - list_lens_presets           (advertises the generic moment pack)
 *     - get_lens_preset             (returns a preset's full markdown body)
 *
 *   Resources:
 *     - ui://mcp-lens/renderer.html (the React widget bundle)
 *     - skill://mcp-lens/show-lens  (the lens-authoring skill)
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
import {
  registerShowLens,
  registerPresets,
  registerLensSkillResource,
} from '@mcp-lens/sdk';
import { GENERIC_PRESETS } from './presets.js';

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

  // The order below is significant only for code readability — each
  // helper registers a disjoint set of tools/resources.
  registerShowLens(server);
  registerPresets(server, GENERIC_PRESETS);
  registerLensSkillResource(server);

  return server;
}

// Server instructions are deliberately short. (See the comment in any of
// the demo servers' SERVER_INSTRUCTIONS block for why — oversized
// instructions break some stdio clients silently.) The full lens skill
// is exposed as the resource skill://mcp-lens/show-lens; the moment
// presets are listed by list_lens_presets.
const SERVER_INSTRUCTIONS = `mcp-lens-server — generic Lens app.

This server gives you the show_lens tool plus a domain-blind set of moment-shaped presets so you can render rich next-turn affordances on top of data from other MCP servers connected to this host. There is no upstream domain server here — pair this with whatever catalog/CRM/data server you already have wired up.

Tools:
- show_lens: render a lens. Takes spec + description.
- list_lens_presets: discover the generic moment-shaped presets shipped here.
- get_lens_preset: fetch a preset's full markdown body.

Workflow:
1. Read skill://mcp-lens/show-lens for the full lens-authoring guide.
2. Call list_lens_presets to see the moment-shaped presets (user-asked-about-a-thing, user-is-browsing-things, user-is-choosing-between-things).
3. For each conversational moment, fetch the matching preset, anchor on data the upstream server returned, and pick affordances that fit the data type.

The presets are deliberately domain-blind. They tell you WHAT KIND of follow-ups to offer; YOU pick the verbs that fit the data the upstream server is serving. A list of products gets "Compare" and "Details" buttons. A list of recipes gets "Make this" and "Details". The moment shape stays the same; the verbs shift to the domain.`;
