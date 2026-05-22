/**
 * Escape-safety tests for the markdown renderer.
 *
 * The markdown node is the only renderer primitive that emits raw HTML into
 * the DOM (via dangerouslySetInnerHTML). It is agent-authored, not user-
 * authored, but the agent can still be goaded into producing attack-shaped
 * input (prompt injection etc.), so the renderer must treat every input
 * as untrusted.
 *
 * Invariants exercised here:
 *   - No raw HTML tag ever reaches the output. All `<`, `>`, `"`, `'`, `&`
 *     in the input are escaped before any markdown conversion runs.
 *   - Link hrefs are restricted to http:, https:, and mailto:. Everything
 *     else (javascript:, data:, vbscript:, etc.) is replaced with `#`.
 *   - Event-handler attributes embedded in markdown syntax cannot escape.
 */

import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown.js';

describe('renderMarkdown — escape safety', () => {
  it('escapes raw HTML tags', () => {
    const out = renderMarkdown('<script>alert(1)</script>');
    expect(out).not.toMatch(/<script>/);
    expect(out).toMatch(/&lt;script&gt;/);
  });

  it('escapes img onerror injection', () => {
    const out = renderMarkdown('<img src=x onerror=alert(1)>');
    expect(out).not.toMatch(/<img/);
    expect(out).toMatch(/&lt;img/);
  });

  it('neutralizes javascript: links', () => {
    const out = renderMarkdown('[click](javascript:alert(1))');
    expect(out).not.toMatch(/javascript:/i);
    expect(out).toMatch(/href="#"/);
  });

  it('neutralizes data: links', () => {
    const out = renderMarkdown('[x](data:text/html,<script>)');
    expect(out).not.toMatch(/data:/);
    expect(out).toMatch(/href="#"/);
  });

  it('neutralizes vbscript: links', () => {
    const out = renderMarkdown('[x](vbscript:msgbox)');
    expect(out).toMatch(/href="#"/);
  });

  it('allows http and https links', () => {
    const out = renderMarkdown('[x](https://example.com)');
    expect(out).toMatch(/href="https:\/\/example\.com"/);
    expect(out).toMatch(/rel="noopener noreferrer"/);
    expect(out).toMatch(/target="_blank"/);
  });

  it('allows mailto links', () => {
    const out = renderMarkdown('[mail](mailto:a@b.c)');
    expect(out).toMatch(/href="mailto:a@b\.c"/);
  });

  it('escapes ampersands and quotes in paragraphs', () => {
    const out = renderMarkdown('A & B said "hi" and \'bye\'.');
    expect(out).toMatch(/&amp;/);
    expect(out).toMatch(/&quot;/);
    expect(out).toMatch(/&#39;/);
  });

  it('does not expand a style-tag attack across lines', () => {
    const out = renderMarkdown('<style>body{display:none}</style>');
    expect(out).not.toMatch(/<style>/);
  });

  it('handles empty input without error', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('handles whitespace-only input', () => {
    expect(renderMarkdown('   \n\n   ')).toBe('');
  });

  it('escapes HTML inside code spans too', () => {
    const out = renderMarkdown('`<script>`');
    expect(out).toMatch(/<code>&lt;script&gt;<\/code>/);
    expect(out).not.toMatch(/<code><script>/);
  });

  it('escapes HTML inside link labels', () => {
    const out = renderMarkdown('[<b>bold</b>](https://example.com)');
    expect(out).toMatch(/&lt;b&gt;bold&lt;\/b&gt;/);
    expect(out).not.toMatch(/<b>/);
  });
});

describe('renderMarkdown — basic formatting', () => {
  it('renders paragraphs', () => {
    expect(renderMarkdown('hello world')).toBe('<p>hello world</p>');
  });

  it('renders bold and italic', () => {
    const out = renderMarkdown('**b** and *i*');
    expect(out).toMatch(/<strong>b<\/strong>/);
    expect(out).toMatch(/<em>i<\/em>/);
  });

  it('renders bullet lists', () => {
    const out = renderMarkdown('- one\n- two');
    expect(out).toMatch(/<ul><li>one<\/li><li>two<\/li><\/ul>/);
  });

  it('renders numbered lists', () => {
    const out = renderMarkdown('1. one\n2. two');
    expect(out).toMatch(/<ol><li>one<\/li><li>two<\/li><\/ol>/);
  });

  it('renders horizontal rules', () => {
    expect(renderMarkdown('---')).toMatch(/<hr \/>/);
    expect(renderMarkdown('***')).toMatch(/<hr \/>/);
  });

  it('merges consecutive non-empty lines into one paragraph', () => {
    const out = renderMarkdown('line one\nline two');
    expect(out).toBe('<p>line one line two</p>');
  });

  it('separates paragraphs on blank line', () => {
    const out = renderMarkdown('one\n\ntwo');
    expect(out).toBe('<p>one</p><p>two</p>');
  });
});
