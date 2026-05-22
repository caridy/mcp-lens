#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRecipesServer } from './server.js';

async function main(): Promise<void> {
  const server = createRecipesServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[recipes-mcp] fatal:', err);
  process.exit(1);
});
