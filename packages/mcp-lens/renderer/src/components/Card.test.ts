import { describe, it, expect } from 'vitest';
import { cardClassName } from './Card.js';
import type { CardNode } from '../../../src/spec/types.js';

function card(overrides: Partial<CardNode> = {}): CardNode {
  return {
    type: 'card',
    children: [],
    ...overrides,
  };
}

describe('cardClassName', () => {
  it('defaults padding to md when omitted', () => {
    // Cards are the most common surface; a sensible default lets the
    // agent omit padding on most presets without having to think about
    // it. Anything other than `md` is an explicit choice.
    expect(cardClassName(card())).toBe('lens-card lens-pad-md');
  });

  it('uses the provided padding token', () => {
    expect(cardClassName(card({ padding: 'sm' }))).toBe(
      'lens-card lens-pad-sm',
    );
    expect(cardClassName(card({ padding: 'lg' }))).toBe(
      'lens-card lens-pad-lg',
    );
    expect(cardClassName(card({ padding: 'none' }))).toBe(
      'lens-card lens-pad-none',
    );
  });
});
