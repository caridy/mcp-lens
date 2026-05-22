import type { LensNode } from '../../../src/spec/types.js';
import { Box } from './Box.js';
import { Column } from './Column.js';
import { Row } from './Row.js';
import { Card } from './Card.js';
import { Text } from './Text.js';
import { Markdown } from './Markdown.js';
import { Image } from './Image.js';
import { Badge } from './Badge.js';
import { Separator } from './Separator.js';
import { Button } from './Button.js';
import { Link } from './Link.js';
import { List } from './List.js';
import { Table } from './Table.js';

export interface RenderNodeProps {
  node: LensNode;
  onPrompt: (prompt: string) => void;
}

/**
 * Dispatches a lens node to its component. The switch is exhaustive; TS
 * enforces that we handle every node type in the union.
 */
export function RenderNode({ node, onPrompt }: RenderNodeProps) {
  switch (node.type) {
    case 'box':
      return <Box node={node} onPrompt={onPrompt} />;
    case 'column':
      return <Column node={node} onPrompt={onPrompt} />;
    case 'row':
      return <Row node={node} onPrompt={onPrompt} />;
    case 'card':
      return <Card node={node} onPrompt={onPrompt} />;
    case 'text':
      return <Text node={node} />;
    case 'markdown':
      return <Markdown node={node} />;
    case 'image':
      return <Image node={node} />;
    case 'badge':
      return <Badge node={node} />;
    case 'separator':
      return <Separator />;
    case 'button':
      return <Button node={node} onPrompt={onPrompt} />;
    case 'link':
      return <Link node={node} />;
    case 'list':
      return <List node={node} onPrompt={onPrompt} />;
    case 'table':
      return <Table node={node} />;
    default: {
      // Exhaustiveness check — compiler will fail if a node type is missed.
      const _exhaustive: never = node;
      return null;
    }
  }
}
