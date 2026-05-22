import { describe, it, expect } from 'vitest';
import { listClassName } from './List.js';
import type { ListNode } from '../../../src/spec/types.js';

function list(overrides: Partial<ListNode> = {}): ListNode {
  return {
    type: 'list',
    items: [],
    ...overrides,
  };
}

describe('listClassName', () => {
  it('defaults divider to none when omitted', () => {
    // Lists are commonly used for catalog rows where dividers can add
    // clutter; dividers are an explicit opt-in.
    expect(listClassName(list())).toBe('lens-list lens-list-divider-none');
  });

  it('uses the provided divider value', () => {
    expect(listClassName(list({ divider: 'line' }))).toBe(
      'lens-list lens-list-divider-line',
    );
  });
});
