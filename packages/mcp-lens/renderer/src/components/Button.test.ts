import { describe, it, expect } from 'vitest';
import { buttonClassName } from './Button.js';
import type { ButtonNode } from '../../../src/spec/types.js';

function btn(overrides: Partial<ButtonNode> = {}): ButtonNode {
  return {
    type: 'button',
    label: 'Click',
    prompt: 'Click prompt',
    ...overrides,
  };
}

describe('buttonClassName', () => {
  it('defaults variant to secondary when omitted', () => {
    // The skill encourages the agent to pick `primary` explicitly. When
    // it doesn't, the safe default is `secondary` — never `primary`,
    // which would let an unintentional fallthrough end up looking like
    // the most prominent affordance.
    expect(buttonClassName(btn())).toBe('lens-button lens-button-secondary');
  });

  it('uses the provided variant', () => {
    expect(buttonClassName(btn({ variant: 'primary' }))).toBe(
      'lens-button lens-button-primary',
    );
    expect(buttonClassName(btn({ variant: 'ghost' }))).toBe(
      'lens-button lens-button-ghost',
    );
  });

  it('appends a tone class only when tone is present', () => {
    expect(buttonClassName(btn({ tone: 'danger' }))).toBe(
      'lens-button lens-button-secondary lens-tone-danger',
    );
    expect(buttonClassName(btn({ variant: 'primary', tone: 'success' }))).toBe(
      'lens-button lens-button-primary lens-tone-success',
    );
  });

  it('omits the tone slot when tone is undefined', () => {
    // Sanity: empty filter() must drop the empty tone slot, not leave
    // a double-space in the className. CSS doesn't care, but rendered
    // class lists are inspected by automation in tests.
    const cls = buttonClassName(btn());
    expect(cls).not.toMatch(/  /);
    expect(cls.split(' ').filter((c) => c === '')).toEqual([]);
  });
});
