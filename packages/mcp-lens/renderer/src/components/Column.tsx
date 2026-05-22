import type { ColumnNode } from '../../../src/spec/types.js';
import { RenderNode } from './RenderNode.js';

export function Column({
  node,
  onPrompt,
}: {
  node: ColumnNode;
  onPrompt: (prompt: string) => void;
}) {
  const className = [
    'lens-column',
    node.gap ? `lens-gap-${node.gap}` : '',
    node.align ? `lens-align-${node.align}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={className}>
      {node.children.map((child, i) => (
        <RenderNode key={i} node={child} onPrompt={onPrompt} />
      ))}
    </div>
  );
}
