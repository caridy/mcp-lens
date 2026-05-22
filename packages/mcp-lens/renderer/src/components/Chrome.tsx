import { useState } from 'react';

/**
 * Renderer chrome — the star (favorite) affordance.
 *
 * One control: a star the user clicks to "save this presentation for next
 * time." On click the widget emits a follow-up prompt asking the agent to
 * memorialize. The widget never calls a memorialize tool directly — the
 * agent decides whether such a tool exists on this server (by reading
 * tool descriptions, since the name varies) and how to invoke it.
 *
 * No thumbs-down. If the user dislikes the view they will say so in their
 * next turn — that's the buttons-as-prompts invariant taken to its
 * conclusion (a thumbs-down is just typed feedback in a different costume).
 *
 * The renderer doesn't carry the description — it lives in the agent's
 * own context (the agent authored it when calling show_lens, and the
 * server attached it to the response _meta as `openai/widgetDescription`).
 * The follow-up prompt instructs the agent to pull the description from
 * its own context.
 */

/**
 * Prompt emitted when the user clicks the star. Exported for testing.
 */
export function buildStarPrompt(): string {
  return [
    'The user starred the view you just showed — they want this presentation preference remembered for next time.',
    '',
    'Find a tool registered on this server whose description indicates it stores presentation preferences (the name varies per server: memorialize_lens, save_view_preference, remember_layout, pin_view, etc. — read descriptions, not names). If you find one, call it with whatever shape its schema requires; pass the description you wrote when calling show_lens for this view.',
    '',
    'If no such tool exists, acknowledge briefly in conversation — say you will keep this presentation in mind for the rest of the conversation. Do not fabricate a tool call.',
  ].join('\n');
}

export function Chrome({
  onPrompt,
}: {
  onPrompt: (prompt: string) => Promise<void> | void;
}) {
  const [state, setState] = useState<'idle' | 'starred'>('idle');

  async function handleStar() {
    if (state !== 'idle') return;
    setState('starred');
    await onPrompt(buildStarPrompt());
  }

  return (
    <div className="lens-chrome" aria-label="Feedback">
      <button
        type="button"
        className={`lens-chrome-btn ${state === 'starred' ? 'lens-chrome-btn-on' : ''}`}
        onClick={handleStar}
        disabled={state !== 'idle'}
        aria-label="Star"
        title="Remember this presentation"
      >
        <StarIcon filled={state === 'starred'} />
      </button>
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
