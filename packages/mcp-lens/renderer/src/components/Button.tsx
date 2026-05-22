import { useState } from 'react';
import type { ButtonNode } from '../../../src/spec/types.js';
import { closeWidget } from '../host.js';

/**
 * Compose the className string for a Button. Extracted so it can be
 * unit-tested without rendering. Default variant is `secondary` (the
 * skill encourages the agent to pick a primary explicitly); tone is
 * optional and tone-prefixes are only emitted when present.
 */
export function buttonClassName(node: ButtonNode): string {
  return [
    'lens-button',
    `lens-button-${node.variant ?? 'secondary'}`,
    node.tone ? `lens-tone-${node.tone}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  node,
  onPrompt,
}: {
  node: ButtonNode;
  onPrompt: (prompt: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const className = buttonClassName(node);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await Promise.resolve(onPrompt(node.prompt));
      // Decisive clicks (e.g. "Pick the X" in a comparison, confirmation
      // dialog buttons) ask the host to dismiss the widget after the
      // prompt has been emitted. Hosts without requestClose silently
      // no-op — the prompt still goes through.
      if (node.closeOnClick) {
        closeWidget();
      }
    } finally {
      // Keep the button in a cooldown state briefly so quick double-taps
      // don't produce duplicate prompts.
      setTimeout(() => setBusy(false), 400);
    }
  }

  return (
    <button
      className={className}
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={node.label}
    >
      {node.label}
    </button>
  );
}
