import type { LinkNode } from '../../../src/spec/types.js';
import { openExternal } from '../host.js';

export function Link({ node }: { node: LinkNode }) {
  const variant = node.variant ?? 'standalone';

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Route through the host bridge so ChatGPT Apps (or any future host)
    // can apply its own open-link policy. Suppress default anchor
    // navigation — the iframe must not navigate itself.
    e.preventDefault();
    openExternal(node.href);
  }

  const className = [
    'lens-link',
    `lens-link-${variant}`,
    node.tone ? `lens-tone-${node.tone}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a
      className={className}
      href={node.href}
      onClick={handleClick}
      // target/rel are a belt-and-suspenders fallback for the one case where
      // the click handler is bypassed (middle-click, ctrl/cmd-click). They
      // let the browser handle the open correctly without navigating the
      // iframe.
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="lens-link-label">{node.label}</span>
      {variant === 'standalone' ? <ExternalIcon /> : null}
    </a>
  );
}

function ExternalIcon() {
  return (
    <svg
      className="lens-link-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
