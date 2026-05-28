import { describe, it, expect } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createLensServer } from './server.js';
import { GENERIC_PRESETS } from './presets.js';

async function setup() {
  const server = createLensServer();
  const client = new Client(
    { name: 'test-client', version: '0.0.0' },
    { capabilities: {} },
  );
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  return { client };
}

describe('createLensServer', () => {
  it('exposes show_lens, get_lens_guide, get_lens_preset', async () => {
    const { client } = await setup();
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'show_lens',
        'get_lens_guide',
        'get_lens_preset',
      ]),
    );
    // Old tool names should not be present.
    expect(names).not.toContain('list_lens_presets');
  });

  it('does NOT register a memorialize tool', async () => {
    const { client } = await setup();
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).not.toContain('memorialize_lens');
    expect(names.filter((n) => /memorial|remember|favorite/i.test(n))).toEqual(
      [],
    );
  });

  it('exposes the renderer resource', async () => {
    const { client } = await setup();
    const list = await client.listResources();
    const uris = list.resources.map((r) => r.uri);
    expect(uris).toContain('ui://mcp-lens/renderer.html');
  });

  it('get_lens_guide returns the skill + preset index', async () => {
    const { client } = await setup();
    const result = await client.callTool({
      name: 'get_lens_guide',
      arguments: {},
    });
    expect(result.isError).not.toBe(true);
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? '';
    // Contains the spec reference.
    expect(text).toMatch(/Node vocabulary/i);
    expect(text).toMatch(/show_lens/);
    // Contains the preset index.
    expect(text).toMatch(/Available presets/);
    expect(text).toMatch(/user-asked-about-a-thing/);
    expect(text).toMatch(/user-is-browsing-things/);
    expect(text).toMatch(/user-is-choosing-between-things/);
    // Points at get_lens_preset.
    expect(text).toMatch(/get_lens_preset/);
  });

  it('get_lens_preset returns a preset body by name', async () => {
    const { client } = await setup();
    const result = await client.callTool({
      name: 'get_lens_preset',
      arguments: { name: 'user-is-browsing-things' },
    });
    expect(result.isError).not.toBe(true);
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? '';
    expect(text.length).toBeGreaterThan(500);
    expect(text).toMatch(/per[- ]row/i);
  });

  it('get_lens_preset errors on unknown name', async () => {
    const { client } = await setup();
    const result = await client.callTool({
      name: 'get_lens_preset',
      arguments: { name: 'does-not-exist' },
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ text: string }>)[0]?.text ?? '';
    expect(text).toMatch(/No preset named/);
    expect(text).toMatch(/get_lens_guide/);
  });

  it('every generic preset has a non-trivial body', async () => {
    for (const preset of GENERIC_PRESETS) {
      expect(preset.body.length).toBeGreaterThan(500);
      expect(preset.body.toLowerCase()).toMatch(/affordance|button|prompt/);
    }
  });

  it('the browsing preset explicitly calls out per-row buttons', async () => {
    const browsing = GENERIC_PRESETS.find(
      (p) => p.name === 'user-is-browsing-things',
    );
    expect(browsing).toBeDefined();
    expect(browsing!.body).toMatch(/per[- ]row/i);
  });
});
