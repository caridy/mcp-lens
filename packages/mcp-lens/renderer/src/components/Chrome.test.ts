import { describe, it, expect } from 'vitest';
import { buildStarPrompt } from './Chrome.js';

describe('buildStarPrompt', () => {
  it('tells the agent the user starred the view', () => {
    const p = buildStarPrompt();
    expect(p).toMatch(/starred the view/);
  });

  it('asks the agent to discover a memorialize-style tool by description, not by name', () => {
    const p = buildStarPrompt();
    // Doesn't hard-code memorialize_lens — the SDK no longer ships it,
    // server authors define their own with their own name and schema.
    expect(p).toMatch(/description/i);
    expect(p).toMatch(/varies/);
  });

  it('instructs the agent to pass its own description to the tool', () => {
    const p = buildStarPrompt();
    // The widget doesn't carry the description — the agent pulls it
    // from its own context (it authored it when calling show_lens).
    expect(p).toMatch(/description you wrote/);
  });

  it('falls back to conversational acknowledgement when no such tool exists', () => {
    const p = buildStarPrompt();
    expect(p).toMatch(/no such tool/i);
    expect(p).toMatch(/acknowledge/);
    expect(p).toMatch(/Do not fabricate/);
  });
});
