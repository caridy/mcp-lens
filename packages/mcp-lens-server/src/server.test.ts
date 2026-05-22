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
  it('exposes show_lens, list_lens_presets, get_lens_preset', async () => {
    const { client } = await setup();
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'show_lens',
        'list_lens_presets',
        'get_lens_preset',
      ]),
    );
  });

  it('does NOT register a memorialize tool (no auth identity in this tier)', async () => {
    // The SDK no longer ships memorialize at all — server authors define
    // their own. This standalone server intentionally doesn't, because
    // it has no identity story. The agent will discover memorialize-style
    // tools by description on whatever upstream is paired with this
    // server; if none exists, the star prompt degrades to session-only
    // acknowledgement. This test guards that nothing memorialize-shaped
    // sneaks in here without the auth work.
    const { client } = await setup();
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).not.toContain('memorialize_lens');
    expect(names.filter((n) => /memorial|remember|favorite/i.test(n))).toEqual(
      [],
    );
  });

  it('exposes the renderer and skill resources', async () => {
    const { client } = await setup();
    const list = await client.listResources();
    const uris = list.resources.map((r) => r.uri);
    expect(uris).toEqual(
      expect.arrayContaining([
        'ui://mcp-lens/renderer.html',
        'skill://mcp-lens/show-lens',
      ]),
    );
  });

  it('lists exactly the three generic moment presets', async () => {
    const { client } = await setup();
    const result = await client.callTool({
      name: 'list_lens_presets',
      arguments: {},
    });
    const presets = (result.structuredContent as { presets: Array<{ name: string }> })
      .presets;
    expect(presets.map((p) => p.name)).toEqual([
      'user-asked-about-a-thing',
      'user-is-browsing-things',
      'user-is-choosing-between-things',
    ]);
  });

  it('every generic preset has a non-trivial body', async () => {
    // Sanity check on the preset pack — these are the high-leverage
    // teaching documents; if any of them ship as a stub, the demo
    // fails to teach the agent the right affordance pattern.
    for (const preset of GENERIC_PRESETS) {
      expect(preset.body.length).toBeGreaterThan(500);
      // Each preset must explicitly call out the affordance rule —
      // it's the whole reason these presets exist.
      expect(preset.body.toLowerCase()).toMatch(/affordance|button|prompt/);
    }
  });

  it('the browsing preset explicitly calls out per-row buttons', async () => {
    // The single most common failure mode pre-reframe was lists with
    // no per-row buttons. This preset must explicitly require them.
    const browsing = GENERIC_PRESETS.find(
      (p) => p.name === 'user-is-browsing-things',
    );
    expect(browsing).toBeDefined();
    expect(browsing!.body).toMatch(/per[- ]row/i);
  });

  it('the choosing preset explicitly requires Pick buttons per item', async () => {
    const choosing = GENERIC_PRESETS.find(
      (p) => p.name === 'user-is-choosing-between-things',
    );
    expect(choosing).toBeDefined();
    expect(choosing!.body.toLowerCase()).toMatch(/pick/);
    // Per-item, not just one decision button — that's the whole point.
    expect(choosing!.body).toMatch(/per item|one .*per item/i);
  });

  it('the asked-about preset offers 2-3 follow-ups, never zero', async () => {
    const asked = GENERIC_PRESETS.find(
      (p) => p.name === 'user-asked-about-a-thing',
    );
    expect(asked).toBeDefined();
    expect(asked!.body).toMatch(/2[-– ]3/);
    expect(asked!.body).toMatch(/billboard/i);
  });
});
