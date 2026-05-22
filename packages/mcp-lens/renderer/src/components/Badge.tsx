import type { BadgeNode } from '../../../src/spec/types.js';

export function Badge({ node }: { node: BadgeNode }) {
  const className = [
    'lens-badge',
    node.tone ? `lens-tone-${node.tone}` : 'lens-tone-neutral',
  ]
    .filter(Boolean)
    .join(' ');
  return <span className={className}>{node.label}</span>;
}
