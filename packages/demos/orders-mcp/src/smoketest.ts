/**
 * Smoke test for orders-mcp. Exercises: list_orders, get_order,
 * the confirmation flow (show_lens with chrome.suppressFeedback), and
 * cancel_order end-to-end.
 */

import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { LENS_SPEC_VERSION } from '@mcp-lens/sdk';
import { createOrdersServer } from './server.js';

async function main() {
  const server = createOrdersServer();
  const client = new Client({ name: 'smoke', version: '0' }, { capabilities: {} });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);

  console.log('─── tools ───');
  const tools = await client.listTools();
  for (const t of tools.tools) console.log(`  ${t.name}`);

  console.log('\n─── list_orders ───');
  const list = await client.callTool({ name: 'list_orders', arguments: {} });
  console.log(
    ((list.structuredContent as { orders: unknown[] })?.orders ?? []).length,
    'orders',
  );

  console.log('\n─── show_lens (confirmation, suppressFeedback) ───');
  const confirm = await client.callTool({
    name: 'show_lens',
    arguments: {
      spec: {
        specVersion: LENS_SPEC_VERSION,
        chrome: { suppressFeedback: true },
        root: {
          type: 'card',
          title: 'Cancel order #A-1042?',
          children: [
            {
              type: 'text',
              text: "2 items · $175.00 · won't be shipped if cancelled.",
            },
            {
              type: 'row',
              gap: 'sm',
              justify: 'end',
              children: [
                {
                  type: 'button',
                  label: 'Keep order',
                  prompt: 'Never mind, keep order #A-1042.',
                  variant: 'ghost',
                },
                {
                  type: 'button',
                  label: 'Cancel order',
                  prompt: 'Yes, cancel order #A-1042.',
                  variant: 'primary',
                  tone: 'danger',
                },
              ],
            },
          ],
        },
      },
      description:
        'Confirmation dialog asking user to confirm cancellation of order #A-1042. Feedback chrome suppressed.',
    },
  });
  console.log('  widgetDescription:', confirm._meta?.['openai/widgetDescription']);

  console.log('\n─── cancel_order ───');
  const cancel = await client.callTool({
    name: 'cancel_order',
    arguments: { id: 'A-1042' },
  });
  console.log('  status now:', (cancel.structuredContent as { status: string }).status);

  console.log('\n─── cancel_order again (already cancelled) ───');
  const cancelAgain = await client.callTool({
    name: 'cancel_order',
    arguments: { id: 'A-1042' },
  });
  console.log('  isError:', cancelAgain.isError);
  console.log('  msg:', (cancelAgain.content as Array<{ text: string }>)[0]?.text);

  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
