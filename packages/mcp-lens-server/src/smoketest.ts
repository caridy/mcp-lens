/**
 * Smoke test — boots mcp-lens-server in-process and walks through the
 * full lens flow against a synthetic spec. Run with: node dist/smoketest.js
 */

import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { LENS_SPEC_VERSION } from '@mcp-lens/sdk';
import { createLensServer } from './server.js';

async function main() {
  const server = createLensServer();
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

  console.log('\n─── list_lens_presets ───');
  const presetList = await client.callTool({
    name: 'list_lens_presets',
    arguments: {},
  });
  console.log((presetList.content as Array<{ text: string }>)[0]?.text);

  console.log('\n─── get_lens_preset (user-asked-about-a-thing) ───');
  const preset = await client.callTool({
    name: 'get_lens_preset',
    arguments: { name: 'user-asked-about-a-thing' },
  });
  const body = (preset.structuredContent as { body: string }).body;
  console.log(`  body length: ${body.length} chars`);
  console.log(`  first line: ${body.split('\n')[0]}`);

  console.log('\n─── show_lens (a recipe-ish card with affordances) ───');
  const lens = await client.callTool({
    name: 'show_lens',
    arguments: {
      spec: {
        specVersion: LENS_SPEC_VERSION,
        root: {
          type: 'card',
          title: 'Smoked Salmon Penne',
          subtitle: 'Italian · 20 min · serves 2',
          children: [
            {
              type: 'text',
              text: 'A quick, creamy pasta that feels indulgent without being heavy.',
              variant: 'body',
            },
            {
              type: 'row',
              gap: 'sm',
              justify: 'end',
              children: [
                {
                  type: 'button',
                  label: 'Make for 4',
                  prompt: 'Show me the Smoked Salmon Penne rescaled for 4 servings.',
                  variant: 'primary',
                },
                {
                  type: 'button',
                  label: 'See similar',
                  prompt: 'Show me other quick pasta dishes like the Smoked Salmon Penne.',
                  variant: 'secondary',
                },
              ],
            },
          ],
        },
      },
      description:
        'Single-card view of the Smoked Salmon Penne recipe with two follow-ups: Make for 4 (primary) and See similar (secondary).',
    },
  });
  console.log(
    '  structuredContent keys:',
    Object.keys(lens.structuredContent ?? {}),
  );
  console.log(
    '  widgetDescription:',
    (lens._meta as Record<string, unknown>)?.['openai/widgetDescription'],
  );

  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
