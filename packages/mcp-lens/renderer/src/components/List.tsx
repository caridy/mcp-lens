import type { ListNode } from '../../../src/spec/types.js';
import { RenderNode } from './RenderNode.js';

/**
 * Compose the className string for a List. Default divider is `none` —
 * lists are commonly used for catalog rows where dividers add clutter;
 * dividers are an explicit opt-in (`divider: 'line'`).
 */
export function listClassName(node: ListNode): string {
  const divider = node.divider ?? 'none';
  return `lens-list lens-list-divider-${divider}`;
}

export function List({
  node,
  onPrompt,
}: {
  node: ListNode;
  onPrompt: (prompt: string) => void;
}) {
  return (
    <div className={listClassName(node)}>
      {node.items.map((item, i) => (
        <div key={i} className="lens-list-item">
          <RenderNode node={item} onPrompt={onPrompt} />
        </div>
      ))}
    </div>
  );
}
