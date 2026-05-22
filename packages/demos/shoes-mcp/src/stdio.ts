#!/usr/bin/env node
/**
 * stdio entrypoint — wires the shoes-mcp server to stdin/stdout for
 * MCP clients that connect over stdio (Claude Desktop, local CLIs).
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createShoesServer } from './server.js';

async function main(): Promise<void> {
  const server = createShoesServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[shoes-mcp] fatal:', err);
  process.exit(1);
});
