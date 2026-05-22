/**
 * Host bridge — abstraction over the MCP UI Apps spec + legacy ChatGPT bridge.
 *
 * The renderer runs inside the host's iframe. There are now two real
 * bridge contracts we have to support:
 *
 *   1. **MCP UI Apps (SEP-1865)** — the canonical spec, implemented by
 *      Claude, Slack, Postman, MCPJam, and others. Communication is JSON-RPC
 *      over `postMessage`; the host pushes tool results via the
 *      `ui/notifications/tool-result` notification, and the iframe sends
 *      `ui/message`, `ui/open-link`, `ui/request-display-mode` requests
 *      back. We use `@modelcontextprotocol/ext-apps`'s `App` class as the
 *      client-side reference implementation.
 *
 *   2. **ChatGPT Apps legacy** — `window.openai` populated synchronously
 *      with `toolOutput`, plus the `openai:set_globals` event for live
 *      updates, plus `sendFollowUpMessage` / `openExternal` /
 *      `requestClose` methods. Predates the spec. Still in production.
 *
 * We try the spec path first (the SDK's `connect()` does its own
 * handshake — if the parent doesn't speak the spec, the handshake fails
 * cleanly and we fall through). When `window.openai` is present we use
 * it directly. When neither is available we fall back to dev mode
 * (`window.__mcpLensDevOutput`) for standalone testing.
 *
 * **Heavy console logging on purpose.** When the widget misbehaves inside
 * a host iframe we have no other observability — no devtools network
 * panel for the bridge, no server logs for what the host did. Every
 * meaningful step emits a `[mcp-lens host]` console message so the iframe
 * console tells the whole story.
 */

import { App, PostMessageTransport } from '@modelcontextprotocol/ext-apps';

const LOG_PREFIX = '[mcp-lens host]';

function log(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(LOG_PREFIX, ...args);
}

function logWarn(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.warn(LOG_PREFIX, ...args);
}

function logError(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.error(LOG_PREFIX, ...args);
}

/**
 * One-time host fingerprint, logged at module load.
 *
 * Useful when bringing up a new host: open the iframe devtools console,
 * find this log, and see which globals the host exposes. We cover the
 * known shapes (spec App SDK + ChatGPT `window.openai`); everything else
 * we'd want to know about is in the fingerprint.
 *
 * Runs at most once per module load. Cheap, harmless, no PII.
 */
let hasFingerprinted = false;
function fingerprintHost(): void {
  if (hasFingerprinted || typeof window === 'undefined') return;
  hasFingerprinted = true;
  const HOST_NAME_PATTERN = /openai|slack|mcp|host|bridge|widget|claude/i;
  try {
    const allKeys = Object.getOwnPropertyNames(window);
    const matched = allKeys.filter((k) => HOST_NAME_PATTERN.test(k));
    const detail: Record<string, unknown> = {};
    for (const key of matched) {
      const value = (window as unknown as Record<string, unknown>)[key];
      if (value === null) {
        detail[key] = 'null';
      } else if (typeof value === 'object') {
        detail[key] = Object.keys(value as object);
      } else {
        detail[key] = typeof value;
      }
    }
    log('host fingerprint (one-time)', {
      matchedKeys: matched,
      detail,
      isFramed: window.parent !== window,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '?',
    });
  } catch (err) {
    logWarn('fingerprintHost failed:', err);
  }
}
fingerprintHost();

export interface LensToolOutput {
  /** The lens spec the agent produced. Validated downstream by zod. */
  spec: unknown;
}

interface OpenAIWindowAPI {
  toolOutput?: unknown;
  toolInput?: unknown;
  sendFollowUpMessage?: (opts: { prompt: string }) => Promise<unknown>;
  openExternal?: (opts: { href: string }) => void;
  requestClose?: () => void | Promise<void>;
}

declare global {
  interface Window {
    openai?: OpenAIWindowAPI;
    /**
     * Dev override: set window.__mcpLensDevOutput to a LensToolOutput to
     * test the renderer standalone (e.g., in Vite dev server).
     */
    __mcpLensDevOutput?: LensToolOutput;
  }
}

/**
 * Result of looking for a lens payload.
 *
 * Distinguishing "nothing here yet" (host hasn't populated) from
 * "something is here but it's the wrong shape" matters: the first calls
 * for a poll-and-retry, the second is a deterministic failure that
 * should surface to the user immediately.
 */
export type ReadResult =
  | { kind: 'ok'; output: LensToolOutput }
  | { kind: 'missing' }
  | { kind: 'malformed'; reason: string };

/** State accumulated by the spec-path bridge. */
let specSpec: unknown = undefined;
/** Listeners notified when `specSpec` updates. */
const specListeners = new Set<() => void>();
/**
 * The connected `App` instance, if the spec handshake succeeded. Used to
 * route `sendPrompt` / `openExternal` through the spec methods rather
 * than the legacy `window.openai` calls.
 */
let connectedApp: App | undefined;
/** True once we've attempted to set up the spec bridge (success or failure). */
let specBootstrapAttempted = false;

/**
 * Attempt to set up the MCP UI Apps spec bridge.
 *
 * Idempotent — only runs once per module load. The handshake is
 * `ui/initialize` -> response -> `ui/notifications/initialized`. If the
 * parent window doesn't reply (e.g. ChatGPT, dev mode), `connect()`
 * rejects; we log and fall through to the legacy bridge.
 *
 * The size-change auto-reporter is enabled (default), so the host can
 * size the iframe correctly without us calling postMessage by hand.
 */
function bootstrapSpecBridge(): void {
  if (specBootstrapAttempted) return;
  specBootstrapAttempted = true;
  if (typeof window === 'undefined' || window.parent === window) {
    log('spec bridge: not framed — skipping handshake');
    return;
  }
  try {
    const app = new App(
      { name: 'mcp-lens-renderer', version: '0.1.0' },
      {},
    );
    app.ontoolresult = (params) => {
      // The spec ships the spec object inside `structuredContent.spec` —
      // same shape we put in the show_lens response.
      const sc = (params as { structuredContent?: unknown }).structuredContent;
      const spec =
        sc && typeof sc === 'object' && 'spec' in (sc as Record<string, unknown>)
          ? (sc as { spec: unknown }).spec
          : undefined;
      if (spec === undefined) {
        log(
          'spec bridge: tool-result notification carried no structuredContent.spec — keys:',
          sc && typeof sc === 'object' ? Object.keys(sc as object) : typeof sc,
        );
        return;
      }
      log('spec bridge: tool-result received', {
        specType:
          spec && typeof spec === 'object'
            ? Object.keys(spec as object)
            : typeof spec,
      });
      specSpec = spec;
      for (const listener of specListeners) {
        try {
          listener();
        } catch (err) {
          logError('spec listener threw:', err);
        }
      }
    };
    const transport = new PostMessageTransport(window.parent, window.parent);
    app
      .connect(transport)
      .then(() => {
        connectedApp = app;
        // Log the full handshake result so we can compare what each
        // host advertises. In particular: hostCapabilities tells us
        // which spec features are available (openLinks, downloadFile,
        // serverTools, etc.). When a request like ui/message comes
        // back with isError:true, the handshake log is the first
        // place to look for "did the host advertise the capability we
        // tried to use?".
        log('spec bridge: ui/initialize handshake completed', {
          hostInfo: app.getHostVersion(),
          hostCapabilities: app.getHostCapabilities(),
          hostContext: app.getHostContext(),
        });
      })
      .catch((err: unknown) => {
        log(
          'spec bridge: handshake failed — host does not implement MCP UI Apps spec, falling back to window.openai',
          { error: err instanceof Error ? err.message : err },
        );
      });
  } catch (err) {
    logWarn('spec bridge: setup threw, will rely on legacy bridge:', err);
  }
}
bootstrapSpecBridge();

/**
 * Read the current lens spec from whichever bridge is populated.
 *
 * Order:
 *   1. Spec bridge (if ui/notifications/tool-result has fired and given us a spec).
 *   2. Legacy ChatGPT bridge (`window.openai.toolOutput`).
 *   3. Dev override (`window.__mcpLensDevOutput`).
 *
 * The same `missing | ok | malformed` semantics apply at every layer.
 */
export function readToolOutput(): ReadResult {
  log('readToolOutput: scanning bridges', {
    specHasSpec: specSpec !== undefined,
    hasOpenai: typeof window !== 'undefined' && Boolean(window.openai),
    openaiKeys:
      typeof window !== 'undefined' && window.openai
        ? Object.keys(window.openai)
        : [],
  });

  // 1. Spec bridge. If a tool-result notification has populated specSpec
  //    we take it — but check for malformed shapes the same way we do for
  //    the legacy bridge.
  if (specSpec !== undefined) {
    const specResult = classify(
      { spec: specSpec },
      'mcp-ui-apps:tool-result',
    );
    if (specResult.kind !== 'missing') {
      log('using spec-bridge tool-result →', specResult.kind);
      return specResult;
    }
  }

  // 2. Legacy ChatGPT bridge. Only trust `window.openai.toolOutput` for
  //    hydration. ChatGPT Apps pre-populates the property as `null`
  //    before the tool response arrives, so we treat null/undefined as
  //    "not here yet" and keep polling.
  //
  //    We deliberately do NOT fall back to `window.openai.toolInput`.
  //    That slot holds the args of whatever tool is currently being
  //    invoked — which, after a button click in a still-mounted widget,
  //    can be a *different* tool's args (e.g. another show_lens call
  //    streaming in, or any other server tool the agent fires). Reading
  //    it mid-stream catches partial payloads (observed:
  //    `{specVersion: "0.1"}` only, because ChatGPT was still
  //    serializing the rest), which the widget then validates as a
  //    malformed lens. The right behavior is to leave the previous lens
  //    rendered until the host clears the iframe or delivers a fresh
  //    `toolOutput` for our own response.
  const fromHost = window.openai?.toolOutput;
  log('source: window.openai.toolOutput', describeValue(fromHost));
  const hostResult = classify(fromHost, 'window.openai.toolOutput');
  if (hostResult.kind !== 'missing') {
    log('using window.openai.toolOutput →', hostResult.kind);
    return hostResult;
  }

  // 3. Dev mode / test harness — only reached when no real bridge has a
  //    payload yet. Standalone (Vite dev server) sets this manually.
  const dev = window.__mcpLensDevOutput;
  log('source: window.__mcpLensDevOutput', describeValue(dev));
  const devResult = classify(dev, '__mcpLensDevOutput');
  if (devResult.kind !== 'missing') {
    log('using __mcpLensDevOutput →', devResult.kind);
    return devResult;
  }

  log('no source populated yet → missing');
  return { kind: 'missing' };
}

/**
 * Subscribe to lens-spec updates from any bridge.
 *
 * On the spec bridge, this fires when `ui/notifications/tool-result`
 * arrives. On the legacy bridge, this is wired to the
 * `openai:set_globals` event. Returns an unsubscribe function — call it
 * on cleanup.
 */
export function subscribeToUpdates(callback: () => void): () => void {
  specListeners.add(callback);

  const onSetGlobals = (): void => {
    callback();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('openai:set_globals', onSetGlobals);
  }

  return () => {
    specListeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('openai:set_globals', onSetGlobals);
    }
  };
}

function classify(value: unknown, source: string): ReadResult {
  // "Missing" vs. "malformed" is the key distinction — it decides whether
  // we poll, fall through to the next source, or fail deterministically.
  //
  // Missing means "this source isn't carrying a lens payload." Causes:
  //   - undefined (field doesn't exist)
  //   - null (host pre-populated the property but the value hasn't landed)
  //   - an object that has no `spec` field (it belongs to a different
  //     tool call — e.g. the agent just invoked search_shoes and
  //     ChatGPT updated window.openai.toolInput to that tool's args).
  //
  // In all of those cases the right behavior is "keep looking": try the
  // next source in the fallback chain, or poll a little longer.
  //
  // Malformed means "this source IS carrying a lens payload, and it's
  // structurally broken" — the field is present but unusable.
  if (value === undefined || value === null) {
    return { kind: 'missing' };
  }
  if (typeof value !== 'object') {
    return {
      kind: 'malformed',
      reason: `${source} is ${typeof value}, expected an object with a \`spec\` field.`,
    };
  }

  if (!('spec' in value)) {
    // No spec field → not a lens payload. Probably another tool's
    // input/output sharing the bridge. Fall through to the next source.
    return { kind: 'missing' };
  }

  const spec = (value as { spec: unknown }).spec;
  if (spec === null || typeof spec !== 'object') {
    return {
      kind: 'malformed',
      reason: `${source}.spec is ${spec === null ? 'null' : typeof spec}, expected an object.`,
    };
  }

  log(`classify: ${source} ok — spec keys`, Object.keys(spec as object));
  return { kind: 'ok', output: { spec } };
}

/** Compact describe-value for logging (avoids dumping deep trees). */
function describeValue(v: unknown): Record<string, unknown> {
  if (v === undefined) return { type: 'undefined' };
  if (v === null) return { type: 'null' };
  if (typeof v !== 'object')
    return { type: typeof v, preview: String(v).slice(0, 60) };
  if (Array.isArray(v)) return { type: 'array', length: v.length };
  return { type: 'object', keys: Object.keys(v as object) };
}

/**
 * Emit a follow-up prompt to the agent.
 *
 * Routes through whichever bridge is currently connected:
 *   - Spec hosts: `app.sendMessage({ role: 'user', content: [...] })`.
 *   - ChatGPT: `window.openai.sendFollowUpMessage({ prompt })`.
 *   - Dev: log only.
 *
 * Failures are surfaced to the console rather than thrown; a button
 * click or chrome feedback must not crash the renderer.
 */
export async function sendPrompt(prompt: string): Promise<void> {
  log('sendPrompt', {
    bridge: connectedApp
      ? 'spec'
      : window.openai?.sendFollowUpMessage
        ? 'openai'
        : 'dev',
    promptPreview: prompt.slice(0, 80),
  });

  if (connectedApp) {
    // Use the SDK's `app.sendMessage()` with the array `content` shape.
    //
    // Important wire-shape finding (2026-05-18): the SEP-1865 doc dated
    // 2026-01-26 specifies `ui/message` `content` as a single object —
    // `{ type: "text", text: string }`. But every implementation we've
    // observed (the `@modelcontextprotocol/ext-apps@1.7.1` SDK, AND
    // Slack's MCP UI Apps host) actually validates against the older
    // array shape `content: ContentBlock[]`. Sending the spec-correct
    // single-object shape produces a `-32603 Invalid input ... expected:
    // array` error from Slack's host validator. The spec doc is ahead
    // of every shipped implementation; for now, the array is what
    // works on the wire.
    //
    // The remaining question is *why* Slack returns `{isError: true}`
    // when the wire shape is correct. Hypotheses (in priority order):
    //   1. Missing host capability for messaging — `ui/message` is not
    //      gated by an explicit capability in SEP-1865, but Slack may
    //      gate it on something declared in `hostCapabilities`.
    //   2. Phase 0 read-only filter — Slack's pilot is documented as
    //      read-only; sending a chat message is a write action.
    //   3. User consent — the spec says hosts MAY request user consent;
    //      Slack might be denying without prompting.
    //   4. Tool-allowance — same as #2 but framed differently.
    //
    // Diagnostic logging surfaces hostCapabilities and any extra keys
    // the host puts on the rejection result, which is our best window
    // into which hypothesis is right.
    try {
      const result = await connectedApp.sendMessage({
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      });
      if (result.isError) {
        logWarn('spec bridge: ui/message rejected by host', {
          fullResult: result,
          keys: Object.keys(result),
          hostCapabilities: connectedApp.getHostCapabilities(),
          hostInfo: connectedApp.getHostVersion(),
          promptPreview: prompt.slice(0, 200),
        });
      } else {
        log('spec bridge: ui/message delivered');
      }
    } catch (err) {
      logError('spec bridge: ui/message threw:', err);
    }
    return;
  }

  const api = window.openai;
  if (api?.sendFollowUpMessage) {
    try {
      await api.sendFollowUpMessage({ prompt });
      log('legacy bridge: sendFollowUpMessage delivered');
    } catch (err) {
      logError('legacy bridge: sendFollowUpMessage failed:', err);
    }
    return;
  }
  // Dev fallback: log so we can see what would have been sent.
  logWarn('sendPrompt (dev fallback, no host bridge):', prompt);
}

/**
 * Open an external URL.
 *
 * Routes through whichever bridge is currently connected:
 *   - Spec hosts: `app.openLink({ url })`.
 *   - ChatGPT: `window.openai.openExternal({ href })`.
 *   - Last resort: `window.open(href, '_blank', 'noopener,noreferrer')`.
 *
 * Failures are logged rather than thrown — a click must not crash the
 * renderer.
 */
export function openExternal(href: string): void {
  log('openExternal', {
    bridge: connectedApp
      ? 'spec'
      : window.openai?.openExternal
        ? 'openai'
        : 'window.open',
    href: href.slice(0, 80),
  });

  if (connectedApp) {
    connectedApp
      .openLink({ url: href })
      .then((result) => {
        if (result.isError) {
          logWarn('spec bridge: openLink rejected by host', result);
        } else {
          log('spec bridge: openLink delivered');
        }
      })
      .catch((err) => {
        logError('spec bridge: openLink threw:', err);
      });
    return;
  }

  const api = window.openai;
  if (api?.openExternal) {
    try {
      api.openExternal({ href });
      return;
    } catch (err) {
      logError('legacy bridge: openExternal failed:', err);
      // fall through to window.open
    }
  }
  try {
    window.open(href, '_blank', 'noopener,noreferrer');
  } catch (err) {
    logError('window.open failed:', err);
  }
}

/**
 * Ask the host to dismiss the widget. Used after a *decisive* button click
 * (e.g. "Pick the X" in a comparison, confirmation dialog) where leaving
 * the widget on screen would feel stale.
 *
 * The MCP UI Apps spec has no `requestClose` equivalent — teardown is
 * host-initiated. So on spec hosts, this is a no-op (the next lens will
 * replace the current one anyway). On ChatGPT, we use
 * `window.openai.requestClose()`.
 */
export function closeWidget(): void {
  if (connectedApp) {
    log(
      'closeWidget: spec bridge has no requestClose equivalent — no-op',
    );
    return;
  }
  const api = window.openai;
  log('closeWidget', { hasRequestClose: Boolean(api?.requestClose) });
  if (!api?.requestClose) {
    log('closeWidget: host has no requestClose capability — no-op');
    return;
  }
  try {
    const result = api.requestClose();
    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch((err) => {
        logError('requestClose promise rejected:', err);
      });
    }
  } catch (err) {
    logError('requestClose failed:', err);
  }
}
