import type { BoxNode, Spacing } from '../../../src/spec/types.js';
import { RenderNode } from './RenderNode.js';

export function Box({
  node,
  onPrompt,
}: {
  node: BoxNode;
  onPrompt: (prompt: string) => void;
}) {
  const className = [
    'lens-box',
    padClass(node.padding),
    bgClass(node.background),
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

function padClass(p: Spacing | undefined): string {
  return p ? `lens-pad-${p}` : '';
}

function bgClass(b: BoxNode['background']): string {
  return b ? `lens-bg-${b}` : '';
}
