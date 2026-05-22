#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLensServer } from './server.js';

async function main(): Promise<void> {
  const server = createLensServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[mcp-lens-server] fatal:', err);
  process.exit(1);
});
