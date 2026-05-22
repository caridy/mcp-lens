/**
 * The MCP Lens skill — a markdown document the agent reads to learn how to
 * use `show_lens` (and the optional preset tools) well.
 *
 * The canonical source is `skills/show-lens.md` at the package root. It is
 * loaded at module-load time via a bundler-friendly path so servers don't
 * need to ship the markdown file alongside their compiled code.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The compiled JS lives at dist/skill.js; skills/ sits alongside dist/ at
// the package root. Resolve the markdown once at load time.
const SKILL_PATH = resolve(__dirname, '..', 'skills', 'show-lens.md');

let cached: string | null = null;

/**
 * Return the MCP Lens skill as a markdown string. Cached after first read.
 *
 * Server authors typically embed this in their tool descriptions, surface
 * it as an MCP prompt, or paste it into their host's system prompt.
 */
export function getLensSkill(): string {
  if (cached !== null) return cached;
  cached = readFileSync(SKILL_PATH, 'utf-8');
  return cached;
}

/**
 * Expose the skill as an MCP resource at `skill://mcp-lens/show-lens`.
 *
 * Optional helper. Some MCP clients surface resources to the agent
 * automatically; when they do, this is the zero-friction way to deliver
 * the skill. Servers that embed the skill text directly in their tool
 * descriptions can skip this.
 */
export const LENS_SKILL_URI = 'skill://mcp-lens/show-lens';

export function registerLensSkillResource(server: McpServer): void {
  server.registerResource(
    'mcp-lens-skill',
    LENS_SKILL_URI,
    {
      description:
        'The MCP Lens authoring guide. Read before composing lens specs.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: getLensSkill(),
        },
      ],
    }),
  );
}
