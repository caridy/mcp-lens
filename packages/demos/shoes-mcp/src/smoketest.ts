/**
 * Smoke test — boots the shoes server in-process, asks it for tools and
 * resources, and exercises show_lens end-to-end. Not a formal test suite;
 * this is a sanity check you can run during development.
 *
 * Run with: node dist/smoketest.js
 */

import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { LENS_SPEC_VERSION } from '@mcp-lens/sdk';
import { createShoesServer } from './server.js';

async function main() {
  const server = createShoesServer();
  const client = new Client(
    { name: 'smoketest', version: '0.0.0' },
    { capabilities: {} },
  );
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);

  console.log('─── tools ───');
  const tools = await client.listTools();
  for (const t of tools.tools) console.log(`  ${t.name}: ${t.title ?? ''}`);

  console.log('\n─── resources ───');
  const resources = await client.listResources();
  for (const r of resources.resources)
    console.log(`  ${r.uri}: ${r.description ?? ''}`);

  console.log('\n─── search_shoes ───');
  const search = await client.callTool({
    name: 'search_shoes',
    arguments: { brand: 'Asics' },
  });
  console.log(
    ((search.structuredContent as { shoes: unknown[] })?.shoes ?? []).length,
    'shoes',
  );

  console.log('\n─── get_lens_guide ───');
  const presetList = await client.callTool({
    name: 'get_lens_guide',
    arguments: {},
  });
  console.log(
    (presetList.content as Array<{ text: string }>)[0]?.text,
  );

  console.log('\n─── show_lens (card) ───');
  const lensResult = await client.callTool({
    name: 'show_lens',
    arguments: {
      spec: {
        specVersion: LENS_SPEC_VERSION,
        root: {
          type: 'card',
          title: 'Gel-Resolution 9',
          subtitle: 'Asics · all-court',
          children: [
            {
              type: 'text',
              text: 'Balanced all-court shoe.',
              variant: 'body',
            },
          ],
        },
      },
      description:
        'Single-card summary of the Asics Gel-Resolution 9 without pricing.',
    },
  });
  console.log(
    'structuredContent keys:',
    Object.keys(lensResult.structuredContent ?? {}),
  );
  console.log(
    'widgetDescription:',
    lensResult._meta?.['openai/widgetDescription'],
  );
  console.log(
    'outputTemplate:',
    lensResult._meta?.['openai/outputTemplate'],
  );

  console.log('\n─── save_lens_preference (write + read) ───');
  await client.callTool({
    name: 'save_lens_preference',
    arguments: { description: 'Prefer compact cards without price' },
  });
  const prefs = await client.callTool({
    name: 'save_lens_preference',
    arguments: {},
  });
  console.log(
    (prefs.structuredContent as { preferences: unknown[] })?.preferences,
  );

  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
