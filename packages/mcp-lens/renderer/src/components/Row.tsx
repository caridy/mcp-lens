import type { RowNode } from '../../../src/spec/types.js';
import { RenderNode } from './RenderNode.js';

export function Row({
  node,
  onPrompt,
}: {
  node: RowNode;
  onPrompt: (prompt: string) => void;
}) {
  const className = [
    'lens-row',
    node.gap ? `lens-gap-${node.gap}` : '',
    node.align ? `lens-align-${node.align}` : '',
    node.justify ? `lens-justify-${node.justify}` : '',
    node.equalWidth ? 'lens-row-equal' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={className}>
      {node.children.map((child, i) => (
        <div key={i} className="lens-row-cell">
          <RenderNode node={child} onPrompt={onPrompt} />
        </div>
      ))}
    </div>
  );
}
