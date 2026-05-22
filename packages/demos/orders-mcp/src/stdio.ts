#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createOrdersServer } from './server.js';

async function main(): Promise<void> {
  const server = createOrdersServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[orders-mcp] fatal:', err);
  process.exit(1);
});
