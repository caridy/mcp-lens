/**
 * Host-bridge reading tests.
 *
 * Wire shape: `window.openai.toolOutput` carries `{ spec: <object> }`.
 * No fallback to `toolInput` — that slot belongs to whatever tool is
 * currently being invoked, including unrelated tools fired by button
 * clicks while our widget is still mounted. Reading it mid-stream
 * catches partial payloads (observed: only `specVersion` populated
 * because ChatGPT was still serializing the rest), and the renderer
 * then validates a spec the agent never actually finished sending.
 *
 * Subtle invariants tested explicitly:
 *  - Hosts pre-populate `toolOutput` as `null` before the real value
 *    arrives. `null` must mean "not here yet" (keep polling), not
 *    "malformed" (fail fast).
 *  - `__mcpLensDevOutput` is the dev/test escape hatch when there's
 *    no real host bridge.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readToolOutput } from './host.js';

// jsdom is not loaded in the vitest node environment; emulate a minimal
// `window` for the duration of each test.
const originalWindow = (globalThis as { window?: unknown }).window;

type AnyWindow = Record<string, unknown>;

function setWindow(w: AnyWindow): void {
  (globalThis as unknown as { window: AnyWindow }).window = w;
}

beforeEach(() => {
  setWindow({});
});

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  }
});

describe('readToolOutput', () => {
  it('returns "missing" when no host bridge is populated', () => {
    expect(readToolOutput()).toEqual({ kind: 'missing' });
  });

  it('returns "ok" when toolOutput has a spec object', () => {
    setWindow({
      openai: { toolOutput: { spec: { hello: 'world' } } },
    });
    const result = readToolOutput();
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect((result.output.spec as { hello: string }).hello).toBe('world');
    }
  });

  it('preserves deeply nested fields in the spec object', () => {
    // Without an outputSchema published by the server, ChatGPT delivers
    // nested objects intact. This regression test locks the round-trip
    // expectation in the renderer's reader.
    const richSpec = {
      specVersion: '0.1',
      root: {
        type: 'table',
        items: [
          { label: 'A', values: { weight: '395g', drop: '10mm' } },
          { label: 'B', values: { weight: '340g', drop: '7mm' } },
        ],
      },
    };
    setWindow({ openai: { toolOutput: { spec: richSpec } } });
    const result = readToolOutput();
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      const spec = result.output.spec as typeof richSpec;
      expect(spec.root.items[1]?.values.weight).toBe('340g');
    }
  });

  it('does NOT fall back to window.openai.toolInput', () => {
    // toolInput holds the args of whatever tool is currently being
    // invoked — not necessarily ours. After a button click, ChatGPT
    // fires another tool and toolInput points at THAT tool's args
    // (potentially mid-streaming, partially populated). Reading it as
    // if it were our own output produces invalid lenses and bogus
    // validation errors. The renderer must ignore toolInput entirely.
    setWindow({
      openai: {
        toolOutput: null, // not populated yet
        toolInput: { spec: { specVersion: '0.1' } }, // some other call's args
      },
    });
    const result = readToolOutput();
    expect(result.kind).toBe('missing');
  });

  it('falls back to window.__mcpLensDevOutput', () => {
    setWindow({
      __mcpLensDevOutput: { spec: { ok: true } },
    });
    const result = readToolOutput();
    expect(result.kind).toBe('ok');
  });

  it('treats toolOutput === null as "missing"', () => {
    // ChatGPT Apps pre-populates `window.openai.toolOutput` as null
    // before the tool response lands. If we treated that as malformed
    // the renderer would fail on every cold start.
    setWindow({ openai: { toolOutput: null } });
    expect(readToolOutput()).toEqual({ kind: 'missing' });
  });

  it('treats undefined toolOutput as "missing"', () => {
    setWindow({ openai: {} });
    expect(readToolOutput()).toEqual({ kind: 'missing' });
  });

  it('returns "malformed" when toolOutput is a non-null primitive', () => {
    setWindow({ openai: { toolOutput: 'broken' } });
    const result = readToolOutput();
    expect(result.kind).toBe('malformed');
  });

  it('treats "no spec field" on toolOutput as missing', () => {
    // Defensive — even on toolOutput, if it doesn't carry a spec it's
    // not ours. (We don't expect this in practice, but it's safer to
    // wait than to error out on a host we don't fully understand.)
    setWindow({ openai: { toolOutput: { brand: 'Asics' } } });
    expect(readToolOutput()).toEqual({ kind: 'missing' });
  });

  it('returns "malformed" when spec is null', () => {
    setWindow({ openai: { toolOutput: { spec: null } } });
    const result = readToolOutput();
    expect(result.kind).toBe('malformed');
  });

  it('returns "malformed" when spec is a string', () => {
    setWindow({ openai: { toolOutput: { spec: 'not-an-object' } } });
    const result = readToolOutput();
    expect(result.kind).toBe('malformed');
    if (result.kind === 'malformed') {
      expect(result.reason).toMatch(/string/);
    }
  });

  it('surfaces the source name in the malformed reason', () => {
    setWindow({ openai: { toolOutput: 42 } });
    const result = readToolOutput();
    if (result.kind === 'malformed') {
      expect(result.reason).toMatch(/window\.openai\.toolOutput/);
    } else {
      throw new Error('expected malformed');
    }
  });
});
