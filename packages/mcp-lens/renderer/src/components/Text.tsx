import type { TextNode } from '../../../src/spec/types.js';

export function Text({ node }: { node: TextNode }) {
  const className = [
    'lens-text',
    `lens-text-${node.variant ?? 'body'}`,
    node.tone ? `lens-tone-${node.tone}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return <div className={className}>{node.text}</div>;
}
