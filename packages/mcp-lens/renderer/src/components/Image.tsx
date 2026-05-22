import type { ImageNode } from '../../../src/spec/types.js';

export function Image({ node }: { node: ImageNode }) {
  const className = [
    'lens-image',
    node.aspectRatio ? `lens-ratio-${node.aspectRatio}` : '',
    node.fit ? `lens-fit-${node.fit}` : 'lens-fit-cover',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={className}>
      <img src={node.src} alt={node.alt} />
    </div>
  );
}
