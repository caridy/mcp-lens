import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  InMemoryTransport,
} from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { registerShowLens, LENS_RENDERER_URI } from './show-lens.js';
import { LENS_SPEC_VERSION, type LensSpec } from '../spec/types.js';

/** Extract the text body from a tool-call result. */
function errorText(result: { content?: unknown }): string {
  const arr = result.content as Array<{ type: string; text?: string }> | undefined;
  return arr?.[0]?.text ?? '';
}

async function setupServer() {
  const server = new McpServer(
    { name: 'test-server', version: '0.0.0' },
    { capabilities: { tools: {}, resources: {} } },
  );
  registerShowLens(server);

  const client = new Client(
    { name: 'test-client', version: '0.0.0' },
    { capabilities: {} },
  );

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return { server, client };
}

describe('registerShowLens', () => {
  it('exposes show_lens in the tool list', async () => {
    const { client } = await setupServer();
    const tools = await client.listTools();
    const names = tools.tools.map((t) => t.name);
    expect(names).toContain('show_lens');
    const tool = tools.tools.find((t) => t.name === 'show_lens')!;
    // Canonical MCP UI Apps (SEP-1865) shape — what spec-compliant hosts
    // (Claude, Slack, Postman, etc.) read.
    const ui = tool._meta?.ui as { resourceUri?: string } | undefined;
    expect(ui?.resourceUri).toBe(LENS_RENDERER_URI);
    // Legacy ChatGPT Apps shape — kept until ChatGPT migrates to canonical.
    expect(tool._meta?.['openai/outputTemplate']).toBe(LENS_RENDERER_URI);
  });

  it('does NOT publish an outputSchema (regression: spec stripping by host-side schema enforcement)', async () => {
    // Regression test. We previously published an outputSchema with
    // shapes `z.unknown()` then `z.record(z.string(), z.any())` then
    // `specJson: z.string()`. Each was a different wrong answer —
    // ChatGPT Apps enforces the published JSON Schema on the data it
    // hands the widget via `window.openai.toolOutput`, and that
    // enforcement strips nested fields whenever the schema isn't
    // perfectly expressive (which it can never quite be, for arbitrary
    // recursive trees).
    //
    // Others don't publish an outputSchema. Their
    // structuredContent ships nested objects intact. We match that.
    //
    // If anyone tries to add an outputSchema, this test fails to remind
    // them why we don't.
    const { client } = await setupServer();
    const tools = await client.listTools();
    const tool = tools.tools.find((t) => t.name === 'show_lens')!;
    expect(tool.outputSchema).toBeUndefined();
  });

  it('exposes the renderer resource', async () => {
    const { client } = await setupServer();
    const list = await client.listResources();
    const uris = list.resources.map((r) => r.uri);
    expect(uris).toContain(LENS_RENDERER_URI);

    const read = await client.readResource({ uri: LENS_RENDERER_URI });
    expect(read.contents[0]).toBeDefined();
    expect(read.contents[0]?.mimeType).toBe('text/html;profile=mcp-app');
    expect((read.contents[0]?.text as string).length).toBeGreaterThan(1000);
  });

  it('ships the spec as a nested object and attaches widgetDescription', async () => {
    const { client } = await setupServer();
    const spec: LensSpec = {
      specVersion: LENS_SPEC_VERSION,
      root: { type: 'text', text: 'Hello' },
    };
    const result = await client.callTool({
      name: 'show_lens',
      arguments: { spec, description: 'A single greeting text node.' },
    });
    expect(result.isError).not.toBe(true);
    // structuredContent ships the spec as a plain nested object. We
    // publish no outputSchema, so the host doesn't enforce one, so
    // nested fields survive intact (matching others).
    const sc = result.structuredContent as { spec?: unknown };
    expect(sc?.spec).toEqual(spec);
    // The description never appears in structuredContent — it's
    // model-facing metadata, not widget-facing.
    expect(sc).not.toHaveProperty('description');
    expect(result._meta?.['openai/widgetDescription']).toBe(
      'A single greeting text node.',
    );
    expect(result._meta?.['openai/outputTemplate']).toBe(LENS_RENDERER_URI);
    // Canonical MCP UI Apps key — what Slack/Claude/Postman read.
    const ui = result._meta?.ui as { resourceUri?: string } | undefined;
    expect(ui?.resourceUri).toBe(LENS_RENDERER_URI);
  });

  it('preserves deeply nested arrays and records in structuredContent', async () => {
    // The previous version of this test forced a JSON-string round-trip
    // because we shipped specJson. Now we ship the spec object directly;
    // the test asserts the nested object is delivered intact through
    // the MCP transport.
    const { client } = await setupServer();
    const spec: LensSpec = {
      specVersion: LENS_SPEC_VERSION,
      root: {
        type: 'table',
        title: 'A vs B',
        fields: [
          { key: 'weight', label: 'Weight' },
          { key: 'drop', label: 'Drop' },
        ],
        items: [
          { label: 'A', values: { weight: '395g', drop: '10mm' } },
          { label: 'B', values: { weight: '340g', drop: '7mm' } },
        ],
      },
    };
    const result = await client.callTool({
      name: 'show_lens',
      arguments: { spec, description: 'A vs B comparison.' },
    });
    expect(result.isError).not.toBe(true);
    const sc = result.structuredContent as { spec: typeof spec };
    expect(sc.spec).toEqual(spec);
    expect(sc.spec.root).toMatchObject({ type: 'table' });
  });

  it('returns isError with an agent-recoverable diagnostic when the spec is invalid', async () => {
    const { client } = await setupServer();
    const result = await client.callTool({
      name: 'show_lens',
      arguments: {
        spec: { specVersion: '0.1', root: { type: 'nope' } },
        description: 'Should fail.',
      },
    });
    expect(result.isError).toBe(true);
    const text = errorText(result);

    // Headline tells the agent the lens was not shown and that the call
    // is safe to retry.
    expect(text).toMatch(/Could not render lens/);
    expect(text).toMatch(/No widget was shown/i);
    expect(text).toMatch(/call `show_lens` again/i);

    // Problems section with concrete pathed issues.
    expect(text).toMatch(/Problems \(/);
    expect(text).toMatch(/root\.type/);

    // Minimal-valid-lens skeleton for anchoring.
    expect(text).toMatch(/Minimal valid lens/);
    expect(text).toMatch(/"specVersion": "0\.1"/);

    // Pointer to get_lens_guide for deeper reference.
    expect(text).toMatch(/get_lens_guide/);

    // No widget payload leaks through on error — neither canonical nor
    // legacy keys, no structuredContent.
    expect(result.structuredContent).toBeUndefined();
    expect(result._meta?.['openai/outputTemplate']).toBeUndefined();
    expect(result._meta?.ui).toBeUndefined();
  });

  it('requires a non-empty description and tells the agent what to send', async () => {
    const { client } = await setupServer();
    const result = await client.callTool({
      name: 'show_lens',
      arguments: {
        spec: {
          specVersion: LENS_SPEC_VERSION,
          root: { type: 'text', text: 'hi' },
        },
        description: '',
      },
    });
    expect(result.isError).toBe(true);
    const text = errorText(result);
    expect(text).toMatch(/Could not render lens/);
    expect(text).toMatch(/`description` argument was empty/);
    expect(text).toMatch(/BOTH of/);
    expect(text).toMatch(/`spec`/);
    expect(text).toMatch(/`description`/);
  });

  it('rejects a whitespace-only description with the same guidance', async () => {
    const { client } = await setupServer();
    const result = await client.callTool({
      name: 'show_lens',
      arguments: {
        spec: {
          specVersion: LENS_SPEC_VERSION,
          root: { type: 'text', text: 'hi' },
        },
        description: '   \t\n',
      },
    });
    expect(result.isError).toBe(true);
    const text = errorText(result);
    expect(text).toMatch(/`description` argument was empty or whitespace/);
  });

  it('trims surrounding whitespace from the description', async () => {
    const { client } = await setupServer();
    const result = await client.callTool({
      name: 'show_lens',
      arguments: {
        spec: {
          specVersion: LENS_SPEC_VERSION,
          root: { type: 'text', text: 'hi' },
        },
        description: '  A greeting.\n',
      },
    });
    expect(result.isError).not.toBe(true);
    expect(result._meta?.['openai/widgetDescription']).toBe('A greeting.');
  });

  it('caps runaway zod error output with a "and N more" marker', async () => {
    const { client } = await setupServer();
    // Build a deeply invalid spec — many nodes with bad types. The
    // diagnostic is useful but should not be an unbounded wall of text.
    const bad: { type: string; children: unknown[] } = {
      type: 'column',
      children: Array.from({ length: 30 }, () => ({ type: 'bogus-node' })),
    };
    const result = await client.callTool({
      name: 'show_lens',
      arguments: {
        spec: { specVersion: LENS_SPEC_VERSION, root: bad },
        description: 'should fail',
      },
    });
    expect(result.isError).toBe(true);
    const text = errorText(result);
    expect(text).toMatch(/Could not render lens/);
    // Truncation marker kicks in when issues exceed the cap.
    expect(text).toMatch(/and \d+ more similar issue/);
  });

  it('recognizes the retired `comparison` type and suggests `table`', async () => {
    const { client } = await setupServer();
    const result = await client.callTool({
      name: 'show_lens',
      arguments: {
        spec: {
          specVersion: LENS_SPEC_VERSION,
          root: {
            type: 'comparison',
            fields: [{ key: 'x', label: 'X' }],
            items: [
              { label: 'A', values: { x: '1' } },
              { label: 'B', values: { x: '2' } },
            ],
          },
        },
        description: 'try it',
      },
    });
    expect(result.isError).toBe(true);
    const text = errorText(result);
    expect(text).toMatch(/Likely fixes/);
    expect(text).toMatch(/`comparison` is no longer a valid node type/);
    expect(text).toMatch(/Rename to `table`/);
  });

  it('coerces a bare node at the root into a valid lens (auto-wraps)', async () => {
    const { client } = await setupServer();
    // Agent passed a node where a lens-with-specVersion-and-root was expected.
    // Coercion wraps it in { specVersion, root: <node> } and it succeeds.
    const result = await client.callTool({
      name: 'show_lens',
      arguments: {
        spec: { type: 'text', text: 'Hello' },
        description: 'bare node at root',
      },
    });
    expect(result.isError).not.toBe(true);
    const sc = result.structuredContent as { spec?: { specVersion?: string; root?: unknown } };
    expect(sc?.spec?.specVersion).toBe('0.1');
    expect(sc?.spec?.root).toEqual({ type: 'text', text: 'Hello' });
  });

  it('catches unknown node types deep in the tree with valid-type list', async () => {
    const { client } = await setupServer();
    const result = await client.callTool({
      name: 'show_lens',
      arguments: {
        spec: {
          specVersion: LENS_SPEC_VERSION,
          root: {
            type: 'card',
            children: [
              {
                type: 'column',
                children: [
                  { type: 'heading', text: 'Title' }, // "heading" not a type
                ],
              },
            ],
          },
        },
        description: 'unknown type deep',
      },
    });
    expect(result.isError).toBe(true);
    const text = errorText(result);
    expect(text).toMatch(/`"type": "heading"`/);
    // The hint names a path and lists valid types.
    expect(text).toMatch(/Valid types/);
    expect(text).toMatch(/table/);
    expect(text).toMatch(/card/);
  });

  it('mentions `get_lens_guide` and `get_lens_preset` as recovery aids', async () => {
    const { client } = await setupServer();
    const result = await client.callTool({
      name: 'show_lens',
      arguments: {
        spec: { specVersion: LENS_SPEC_VERSION, root: { type: 'nope' } },
        description: 'x',
      },
    });
    expect(result.isError).toBe(true);
    const text = errorText(result);
    expect(text).toMatch(/get_lens_guide/);
    expect(text).toMatch(/get_lens_preset/);
  });

  it('does not throw on non-object spec input (null, string, array)', async () => {
    const { client } = await setupServer();
    for (const bogus of [null, 'not an object', [1, 2, 3], 42]) {
      const result = await client.callTool({
        name: 'show_lens',
        arguments: { spec: bogus, description: 'still a recoverable error' },
      });
      expect(result.isError).toBe(true);
      const text = errorText(result);
      expect(text).toMatch(/Could not render lens/);
    }
  });

  it('respects a toolName override', async () => {
    const server = new McpServer(
      { name: 's', version: '0' },
      { capabilities: { tools: {}, resources: {} } },
    );
    registerShowLens(server, { toolName: 'render_view' });
    const client = new Client({ name: 'c', version: '0' }, { capabilities: {} });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(st), client.connect(ct)]);
    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name)).toContain('render_view');
    expect(tools.tools.map((t) => t.name)).not.toContain('show_lens');
  });

  // ── Coercion tests ──────────────────────────────────────────────────────

  it('coerces a JSON string spec into an object', async () => {
    const { client } = await setupServer();
    const spec = { specVersion: LENS_SPEC_VERSION, root: { type: 'text', text: 'hi' } };
    const result = await client.callTool({
      name: 'show_lens',
      arguments: { spec: JSON.stringify(spec), description: 'stringified' },
    });
    expect(result.isError).not.toBe(true);
    const sc = result.structuredContent as { spec: typeof spec };
    expect(sc.spec).toEqual(spec);
  });

  it('unwraps a double-wrapped { spec: { specVersion, root } } envelope', async () => {
    const { client } = await setupServer();
    const inner = { specVersion: LENS_SPEC_VERSION, root: { type: 'text', text: 'hi' } };
    const result = await client.callTool({
      name: 'show_lens',
      arguments: { spec: { spec: inner }, description: 'wrapped' },
    });
    expect(result.isError).not.toBe(true);
    const sc = result.structuredContent as { spec: typeof inner };
    expect(sc.spec).toEqual(inner);
  });

  it('injects missing specVersion when root is present', async () => {
    const { client } = await setupServer();
    const result = await client.callTool({
      name: 'show_lens',
      arguments: { spec: { root: { type: 'text', text: 'hi' } }, description: 'no version' },
    });
    expect(result.isError).not.toBe(true);
    const sc = result.structuredContent as { spec: { specVersion: string } };
    expect(sc.spec.specVersion).toBe('0.1');
  });

  it('coerces a JSON string containing a bare node', async () => {
    const { client } = await setupServer();
    const result = await client.callTool({
      name: 'show_lens',
      arguments: {
        spec: '{"type":"text","text":"hello"}',
        description: 'string bare node',
      },
    });
    expect(result.isError).not.toBe(true);
    const sc = result.structuredContent as { spec: { root: { type: string } } };
    expect(sc.spec.root).toEqual({ type: 'text', text: 'hello' });
  });
});
