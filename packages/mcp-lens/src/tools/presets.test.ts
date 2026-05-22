import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { registerPresets, type LensPreset } from './presets.js';

const shoePreset: LensPreset = {
  name: 'shoe',
  description: 'How to show a single shoe with technical details.',
  body: [
    'Emphasize technical specs. Hide price by default.',
    '',
    '```json',
    '{ "type": "card", "children": [] }',
    '```',
  ].join('\n'),
};

const orderPreset: LensPreset = {
  name: 'order',
  description: 'How to show an order summary.',
  body: 'Show line items, total, and a cancel button.',
};

async function setup(presets: LensPreset[]) {
  const server = new McpServer(
    { name: 'test-server', version: '0.0.0' },
    { capabilities: { tools: {} } },
  );
  registerPresets(server, presets);
  const client = new Client(
    { name: 'test-client', version: '0.0.0' },
    { capabilities: {} },
  );
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  return { client };
}

describe('registerPresets', () => {
  it('exposes list_lens_presets and get_lens_preset', async () => {
    const { client } = await setup([shoePreset, orderPreset]);
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['list_lens_presets', 'get_lens_preset']),
    );
  });

  it('list returns names and descriptions (not bodies)', async () => {
    const { client } = await setup([shoePreset, orderPreset]);
    const result = await client.callTool({
      name: 'list_lens_presets',
      arguments: {},
    });
    expect(result.structuredContent).toEqual({
      presets: [
        { name: 'shoe', description: shoePreset.description },
        { name: 'order', description: orderPreset.description },
      ],
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      ?.text;
    expect(text).toMatch(/shoe:/);
    expect(text).toMatch(/order:/);
    expect(text).not.toMatch(/```/); // body not leaked into the list
  });

  it('handles an empty preset list gracefully', async () => {
    const { client } = await setup([]);
    const result = await client.callTool({
      name: 'list_lens_presets',
      arguments: {},
    });
    expect(
      (result.structuredContent as { presets?: unknown })?.presets,
    ).toEqual([]);
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      ?.text;
    expect(text).toMatch(/no lens presets/i);
  });

  it('get returns the full body', async () => {
    const { client } = await setup([shoePreset, orderPreset]);
    const result = await client.callTool({
      name: 'get_lens_preset',
      arguments: { name: 'shoe' },
    });
    expect(result.structuredContent).toEqual({
      name: 'shoe',
      description: shoePreset.description,
      body: shoePreset.body,
    });
  });

  it('get returns isError on unknown name', async () => {
    const { client } = await setup([shoePreset]);
    const result = await client.callTool({
      name: 'get_lens_preset',
      arguments: { name: 'nonexistent' },
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      ?.text;
    expect(text).toMatch(/no preset named/i);
  });

  it('rejects presets with an empty body at registration time', () => {
    const server = new McpServer(
      { name: 's', version: '0' },
      { capabilities: { tools: {} } },
    );
    expect(() =>
      registerPresets(server, [
        { name: 'empty', description: 'no body', body: '   ' },
      ]),
    ).toThrow(/empty body/i);
  });

  it('rejects presets without a name', () => {
    const server = new McpServer(
      { name: 's', version: '0' },
      { capabilities: { tools: {} } },
    );
    expect(() =>
      registerPresets(server, [
        { name: '', description: 'x', body: 'y' },
      ]),
    ).toThrow(/name/i);
  });

  it('surfaces a tool error when a custom store throws', async () => {
    const server = new McpServer(
      { name: 's', version: '0' },
      { capabilities: { tools: {} } },
    );
    registerPresets(server, [], {
      store: {
        list: () => {
          throw new Error('store broken');
        },
        get: () => null,
      },
    });
    const client = new Client(
      { name: 'c', version: '0' },
      { capabilities: {} },
    );
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(st), client.connect(ct)]);

    const result = await client.callTool({
      name: 'list_lens_presets',
      arguments: {},
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      ?.text;
    expect(text).toMatch(/store broken/);
  });

  it('respects tool name overrides', async () => {
    const server = new McpServer(
      { name: 's', version: '0' },
      { capabilities: { tools: {} } },
    );
    registerPresets(server, [shoePreset], {
      listToolName: 'presets_index',
      getToolName: 'presets_read',
    });
    const client = new Client(
      { name: 'c', version: '0' },
      { capabilities: {} },
    );
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(st), client.connect(ct)]);
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['presets_index', 'presets_read']),
    );
    expect(names).not.toContain('list_lens_presets');
  });
});
