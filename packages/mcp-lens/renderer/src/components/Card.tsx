import type { CardNode } from '../../../src/spec/types.js';
import { RenderNode } from './RenderNode.js';

/**
 * Compose the className string for a Card. Default padding is `md` —
 * cards are the most common surface and a sensible-default keeps the
 * agent from having to specify it on every preset.
 */
export function cardClassName(node: CardNode): string {
  return [
    'lens-card',
    node.padding ? `lens-pad-${node.padding}` : 'lens-pad-md',
  ]
    .filter(Boolean)
    .join(' ');
}

export function Card({
  node,
  onPrompt,
}: {
  node: CardNode;
  onPrompt: (prompt: string) => void;
}) {
  const className = cardClassName(node);
  return (
    <div className={className}>
      {node.title ? <div className="lens-card-title">{node.title}</div> : null}
      {node.subtitle ? (
        <div className="lens-card-subtitle">{node.subtitle}</div>
      ) : null}
      <div className="lens-card-body">
        {node.children.map((child, i) => (
          <RenderNode key={i} node={child} onPrompt={onPrompt} />
        ))}
      </div>
    </div>
  );
}
