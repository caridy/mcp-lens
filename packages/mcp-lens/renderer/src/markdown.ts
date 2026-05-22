/**
 * Minimal escape-safe markdown renderer.
 *
 * Covers: paragraphs, **bold**, *italic*, `code`, [links](url), bullet lists,
 * numbered lists, horizontal rules. Deliberately tiny — this is one of five
 * primitive content types in MCP Lens and the input is agent-authored, not
 * user-authored, so the surface area is low.
 *
 * Never emits raw HTML. Every user-supplied character is escaped before any
 * markdown conversion runs.
 */
export function renderMarkdown(input: string): string {
  const escaped = escapeHtml(input);
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr />');
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '')) {
        items.push(
          `<li>${inline((lines[i] ?? '').replace(/^\s*[-*]\s+/, ''))}</li>`,
        );
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
        items.push(
          `<li>${inline((lines[i] ?? '').replace(/^\s*\d+\.\s+/, ''))}</li>`,
        );
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — accumulate consecutive non-empty, non-list lines
    const buf: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !/^\s*[-*]\s+/.test(lines[i] ?? '') &&
      !/^\s*\d+\.\s+/.test(lines[i] ?? '') &&
      !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i] ?? '')
    ) {
      buf.push(lines[i] ?? '');
      i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  return out.join('');
}

function inline(s: string): string {
  // Order matters: inline code first (protects its contents), then links,
  // then emphasis. We operate on already-HTML-escaped text, so the raw
  // brackets that survive into here only came from the original markdown.
  let out = s;

  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, href: string) => {
      const safeHref = /^(https?:|mailto:)/i.test(href) ? href : '#';
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
  );

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
