import type { MarkdownNode } from '../../../src/spec/types.js';
import { renderMarkdown } from '../markdown.js';

export function Markdown({ node }: { node: MarkdownNode }) {
  return (
    <div
      className="lens-markdown"
      // Markdown is rendered via a tiny, escape-safe renderer (no raw HTML).
      dangerouslySetInnerHTML={{ __html: renderMarkdown(node.markdown) }}
    />
  );
}
