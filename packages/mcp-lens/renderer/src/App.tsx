import { useEffect, useMemo, useState } from 'react';
import { lensSpecSchema } from '../../src/spec/schema.js';
import type { LensSpec } from '../../src/spec/types.js';
import { readToolOutput, sendPrompt, subscribeToUpdates } from './host.js';
import { RenderNode } from './components/RenderNode.js';
import { Chrome } from './components/Chrome.js';

type State =
  | { status: 'waiting' }
  | { status: 'ok'; spec: LensSpec }
  | { status: 'error'; message: string };

// Poll for tool output for ~1s before giving up. ChatGPT Apps sometimes
// populates `window.openai.toolOutput` after the iframe mounts, so we can't
// assume it's present on the first read.
const POLL_INTERVAL_MS = 50;
const POLL_MAX_TRIES = 20;

const MAX_ISSUES_DISPLAYED = 8;

const LOG_PREFIX = '[mcp-lens app]';
function log(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(LOG_PREFIX, ...args);
}

export function App() {
  const [state, setState] = useState<State>({ status: 'waiting' });

  useEffect(() => {
    log('mount: starting load');
    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Track the last spec we successfully rendered. The host fires
    // `openai:set_globals` whenever any global mutates (toolOutput,
    // toolInput, widgetState, etc.) — most of which are not for us.
    // Skipping no-op updates avoids re-validating the same payload on
    // every unrelated bridge change.
    let lastRenderedSpec: unknown = undefined;

    function applyRead(read: ReturnType<typeof readToolOutput>): boolean {
      // Returns true if the read was conclusive (ok or malformed).
      if (read.kind === 'missing') return false;

      if (read.kind === 'malformed') {
        log('malformed payload:', read.reason);
        setState({ status: 'error', message: read.reason });
        return true;
      }

      // Skip if this is the same payload we already rendered. Cheap
      // identity check first, then a content compare for safety.
      if (read.output.spec === lastRenderedSpec) {
        log('host fired update but spec is unchanged — skipping');
        return true;
      }

      log(
        'received lens payload — validating with zod, top-level keys:',
        Object.keys(read.output.spec as object),
      );
      const parsed = lensSpecSchema.safeParse(read.output.spec);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        log(
          'zod validation FAILED — full received spec was:',
          read.output.spec,
        );
        log('zod issues:', issues);
        const head = issues
          .slice(0, MAX_ISSUES_DISPLAYED)
          .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('; ');
        const overflow = issues.length - MAX_ISSUES_DISPLAYED;
        setState({
          status: 'error',
          message: `Invalid lens spec: ${head}${
            overflow > 0 ? ` (+${overflow} more)` : ''
          }`,
        });
        return true;
      }
      log('zod validation passed — rendering root', {
        rootType: parsed.data.root.type,
      });
      lastRenderedSpec = read.output.spec;
      setState({ status: 'ok', spec: parsed.data });
      return true;
    }

    function tryLoad(): void {
      if (cancelled) return;
      log(`tryLoad attempt ${tries + 1}/${POLL_MAX_TRIES}`);

      let read: ReturnType<typeof readToolOutput>;
      try {
        read = readToolOutput();
      } catch (err) {
        log('readToolOutput threw:', err);
        setState({
          status: 'error',
          message: `Could not read lens output: ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
        });
        return;
      }

      const handled = applyRead(read);
      if (handled) return;

      if (tries++ < POLL_MAX_TRIES) {
        timer = setTimeout(tryLoad, POLL_INTERVAL_MS);
        return;
      }
      // Polling timed out — this is normal for a button click on an
      // already-rendered widget where the host doesn't deliver a fresh
      // toolOutput. Stay quiet (keep the previous lens visible) instead
      // of replacing it with a "host didn't deliver" error.
      log(
        'polling timed out — no toolOutput delivered, keeping previous render (or waiting state)',
      );
    }

    // Subscribe to update notifications from whichever bridge is
    // active. The host bridge handles routing — on spec hosts this
    // fires when ui/notifications/tool-result arrives; on ChatGPT it's
    // the `openai:set_globals` event.
    const unsubscribe = subscribeToUpdates(() => {
      if (cancelled) return;
      log('host fired update — re-reading');
      try {
        const read = readToolOutput();
        applyRead(read);
      } catch (err) {
        log('readToolOutput threw on update event:', err);
      }
    });

    // Initial read — most of the time toolOutput is already populated
    // by the time the iframe mounts, so we render straight away. If
    // not, fall back to polling for up to ~1s.
    tryLoad();

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const body = useMemo(() => {
    if (state.status === 'waiting')
      return <div className="lens-waiting">Loading…</div>;
    if (state.status === 'error')
      return <div className="lens-error">{state.message}</div>;
    return <RenderNode node={state.spec.root} onPrompt={sendPrompt} />;
  }, [state]);

  const suppressFeedback =
    state.status === 'ok' && state.spec.chrome?.suppressFeedback === true;

  return (
    <div className="lens-root">
      <div className="lens-content">{body}</div>
      {state.status === 'ok' && !suppressFeedback ? (
        <Chrome onPrompt={sendPrompt} />
      ) : null}
    </div>
  );
}
