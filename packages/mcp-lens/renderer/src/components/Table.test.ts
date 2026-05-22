import { describe, it, expect } from 'vitest';
import { computeDiffFields } from './Table.js';
import type { TableNode } from '../../../src/spec/types.js';

function node(
  fields: { key: string; label: string }[],
  items: { label: string; values: Record<string, string> }[],
): TableNode {
  return {
    type: 'table',
    fields,
    items,
    highlightDifferences: true,
  };
}

describe('computeDiffFields', () => {
  it('flags fields whose values differ', () => {
    const diffs = computeDiffFields(
      node(
        [
          { key: 'weight', label: 'Weight' },
          { key: 'drop', label: 'Drop' },
        ],
        [
          { label: 'A', values: { weight: '100', drop: '8mm' } },
          { label: 'B', values: { weight: '200', drop: '8mm' } },
        ],
      ),
    );
    expect(diffs.has('weight')).toBe(true);
    expect(diffs.has('drop')).toBe(false);
  });

  it('does not flag a field missing on every item', () => {
    const diffs = computeDiffFields(
      node(
        [{ key: 'color', label: 'Color' }],
        [
          { label: 'A', values: {} },
          { label: 'B', values: {} },
        ],
      ),
    );
    expect(diffs.has('color')).toBe(false);
  });

  it('flags a field present on some items and missing on others', () => {
    const diffs = computeDiffFields(
      node(
        [{ key: 'price', label: 'Price' }],
        [
          { label: 'A', values: { price: '$100' } },
          { label: 'B', values: {} },
        ],
      ),
    );
    expect(diffs.has('price')).toBe(true);
  });

  it('handles three or more items correctly', () => {
    const diffs = computeDiffFields(
      node(
        [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ],
        [
          { label: '1', values: { a: 'same', b: 'one' } },
          { label: '2', values: { a: 'same', b: 'two' } },
          { label: '3', values: { a: 'same', b: 'three' } },
        ],
      ),
    );
    expect(diffs.has('a')).toBe(false);
    expect(diffs.has('b')).toBe(true);
  });
});
