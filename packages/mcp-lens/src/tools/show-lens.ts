/**
 * show_lens — the only required MCP Lens tool.
 *
 * The agent calls this with a lens spec and a description. The server
 * validates the spec, ships the renderer bundle inline as an MCP UI
 * resource, and returns the spec as structured content so the widget can
 * hydrate. The description is attached to the response _meta as
 * `openai/widgetDescription` so ChatGPT Apps surfaces it to the model
 * (model-facing metadata — the agent decides how to narrate to the user).
 *
 * Input vs. output asymmetry (deliberate):
 *   - input:  { spec, description }
 *   - output: { spec } only
 *
 * The description belongs to the agent's reasoning, not to the widget.
 * The widget renders from the spec alone. Keeping the description out of
 * the output payload also keeps the bridge payload focused on what the
 * widget actually needs.
 *
 * Wire shape (cross-host):
 *
 *   - We emit the canonical **MCP UI Apps** metadata (SEP-1865): the tool
 *     response carries `_meta.ui.resourceUri`, the resource entries carry
 *     the same nested key, and the resource is served with MIME
 *     `text/html;profile=mcp-app`. Spec-compliant hosts (Claude, Slack's
 *     Slackbot MCP client, Postman, MCPJam, etc.) read that.
 *   - For ChatGPT Apps backwards-compat, we also emit the legacy keys
 *     (`_meta['openai/outputTemplate']`, `_meta['openai/widgetAccessible']`,
 *     and per-call `_meta['openai/widgetDescription']`). Until ChatGPT
 *     migrates to canonical, this dual-emit keeps both worlds working.
 *
 * No outputSchema is published. We learned the hard way that publishing
 * one causes ChatGPT Apps to enforce the resulting JSON Schema on the
 * structuredContent it delivers to the widget — and that enforcement
 * strips nested fields when the schema isn't expressive enough (which
 * it never quite is, with zod-generated JSON Schema for arbitrary
 * recursive trees). Others have shipped nested
 * `view`/`state` objects in structuredContent without an outputSchema and
 * they arrive intact. Match that pattern.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { lensSpecSchema } from '../spec/schema.js';
import type { LensSpec } from '../spec/types.js';
import { RENDERER_HTML } from '../renderer-bundle.js';
import { toolError } from './_internal.js';

/** Canonical MCP UI resource URI for the lens renderer. */
export const LENS_RENDERER_URI = 'ui://mcp-lens/renderer.html';

/**
 * MIME type for the renderer bundle.
 *
 * Mandated by the MCP UI Apps spec (SEP-1865): hosts that participate in
 * the spec recognize `text/html;profile=mcp-app` and render the resource
 * as an MCP App widget. Hosts that don't recognize the profile parameter
 * fall through to plain `text/html` and render it as a normal iframe.
 */
export const LENS_RENDERER_MIME = 'text/html;profile=mcp-app';

export interface RegisterShowLensOptions {
  /**
   * Override the default tool name. Useful if `show_lens` collides with a
   * name already in use on the host server.
   */
  toolName?: string;
}

/**
 * Attach the show_lens tool (and its backing renderer resource) to an
 * existing MCP server. Safe to call once per server.
 */
export function registerShowLens(
  server: McpServer,
  options: RegisterShowLensOptions = {},
): void {
  const toolName = options.toolName ?? 'show_lens';

  // 1. Register the renderer as a resource so clients can fetch the HTML.
  //    The tool response references it by URI via _meta.ui.resourceUri
  //    (canonical SEP-1865) and _meta['openai/outputTemplate'] (ChatGPT
  //    Apps legacy).
  server.registerResource(
    'mcp-lens-renderer',
    LENS_RENDERER_URI,
    {
      description:
        'MCP Lens renderer widget — bundled HTML that hydrates from show_lens tool output.',
      mimeType: LENS_RENDERER_MIME,
      _meta: resourceMeta(),
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: LENS_RENDERER_MIME,
          text: RENDERER_HTML,
          _meta: resourceMeta(),
        },
      ],
    }),
  );

  // 2. Register the show_lens tool itself.
  server.registerTool(
    toolName,
    {
      title: 'Show lens',
      description: SHOW_LENS_DESCRIPTION,
      inputSchema: showLensInputShape,
      annotations: {
        // show_lens composes a UI resource and returns it. The widget
        // emits follow-up prompts the agent then handles, but the tool
        // itself produces no side effects on any external system.
        // Slack's Phase 0 read-only filter should let this through.
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      // No outputSchema (see file header for the full reasoning).
      //
      // The tool descriptor's _meta carries both the canonical
      // _meta.ui.resourceUri (SEP-1865) and the ChatGPT-legacy
      // _meta['openai/outputTemplate'] keys, so hosts of either era
      // recognize this tool as having a UI to display.
      _meta: toolDescriptorMeta(),
    },
    async (args) => {
      // Reject whitespace-only descriptions — zod's `.min(1)` would let
      // "   " through. The description is model-facing metadata and a
      // blank string is a no-op signal.
      //
      // Every invalid-input path below returns a toolError with no widget
      // payload. The agent is responsible for composing the spec; it will
      // make mistakes. Our errors must be structured, specific, and
      // actionable so the next call can succeed — never a stack trace,
      // never raw zod dumps, never a thrown exception.
      const description = args.description.trim();
      if (description.length === 0) {
        return toolError(formatDescriptionError());
      }

      const validation = lensSpecSchema.safeParse(args.spec);
      if (!validation.success) {
        return toolError(
          formatSpecError(args.spec, validation.error.issues),
        );
      }

      return buildToolResult(validation.data, description);
    },
  );
}

// ── Input schema ────────────────────────────────────────────────────────────

// Input validation is deliberately permissive at the schema layer and
// strict in the handler. The MCP SDK rejects inputs that fail schema
// validation with a raw zod message that bypasses our recoverability
// guidance — so we accept any string/unknown here and produce the
// structured, agent-friendly error inside the tool handler.
const showLensInputShape = {
  spec: z
    .unknown()
    .describe(
      'The lens spec JSON. Must conform to the lens spec schema (v0.1): a specVersion, an optional chrome block, and a root node. See the lens skill for the vocabulary and worked examples.',
    ),
  description: z
    .string()
    .describe(
      'Agent-authored account of what the lens shows — MODEL-FACING, not user-facing. Describe the content, layout, and any notable presentation choices (e.g. "two-product side-by-side comparison without pricing"). The agent reads this and decides how to narrate the view to the user in their own language. It is also the preference signal the agent re-uses if the user stars the view (memorialization).',
    ),
};

// No outputSchema is published. See the comment on registerTool above
// for the reasoning. structuredContent is shipped as `{ spec, description }`
// — the spec as a plain nested object, description as a string. ChatGPT
// Apps delivers it intact via window.openai.toolOutput when no schema
// gets in the way.

// ── Tool description (read by the agent) ────────────────────────────────────

const SHOW_LENS_DESCRIPTION = [
  'Render a rich view for the user by composing a lens spec.',
  '',
  'Use this instead of a text response when a visual presentation would serve the user better — comparing items, showing structured data, offering actionable buttons, or producing a summary card.',
  '',
  'The lens spec is a small JSON tree (boxes, columns, cards, text, buttons, images, comparisons). Compose it from data you already have. Do not embed placeholders; inline real values.',
  '',
  'Buttons emit follow-up prompts when clicked — write the prompt as the user would type it. Never reference server-side tools or APIs directly.',
  '',
  'Always pass a `description`. It is model-facing metadata (not shown verbatim to the user) describing what the lens contains and what design choices were made.',
].join('\n');

// ── Result construction ─────────────────────────────────────────────────────

function buildToolResult(spec: LensSpec, description: string) {
  return {
    // structuredContent is the spec the widget hydrates from. Shipped as
    // a plain nested object — no outputSchema is declared, so hosts don't
    // enforce a schema on the payload and nested fields survive the
    // round-trip. Spec-compliant hosts forward this through the
    // ui/notifications/tool-result postMessage notification; ChatGPT
    // additionally promotes it to window.openai.toolOutput.
    structuredContent: {
      spec: spec as unknown as Record<string, unknown>,
    },
    // A minimal text fallback for hosts that don't render the widget.
    content: [
      {
        type: 'text' as const,
        text: '[lens shown]',
      },
    ],
    _meta: {
      // Canonical SEP-1865 — the only thing spec-compliant hosts read.
      ui: {
        resourceUri: LENS_RENDERER_URI,
      },
      // ChatGPT Apps legacy — kept until ChatGPT migrates to canonical.
      'openai/outputTemplate': LENS_RENDERER_URI,
      'openai/widgetAccessible': true,
      // Per-call model-facing description. ChatGPT surfaces this to the
      // model so the agent can narrate the view intelligently. The spec
      // has no equivalent today; non-ChatGPT hosts simply ignore it.
      'openai/widgetDescription': description,
    },
  };
}

// ── Metadata helpers ────────────────────────────────────────────────────────
//
// Three closely-related _meta objects:
//   - resourceMeta()       — on the renderer resource registration + each
//                            resources/read content item.
//   - toolDescriptorMeta() — on the tool's tools/list descriptor.
//   - (inline above)       — on each tool-call response, plus the
//                            per-call openai/widgetDescription.
//
// All three carry the same `ui.resourceUri` plus the ChatGPT legacy
// `openai/outputTemplate` so hosts of either era recognize the wiring.

function resourceMeta(): Record<string, unknown> {
  return {
    ui: {
      resourceUri: LENS_RENDERER_URI,
    },
    'openai/outputTemplate': LENS_RENDERER_URI,
    'openai/widgetAccessible': true,
  };
}

function toolDescriptorMeta(): Record<string, unknown> {
  return {
    ui: {
      resourceUri: LENS_RENDERER_URI,
    },
    'openai/outputTemplate': LENS_RENDERER_URI,
    'openai/widgetAccessible': true,
  };
}

// ── Error formatting ────────────────────────────────────────────────────────
//
// Design goals for every error message returned from show_lens:
//
//   1. No widget attached. The agent must not render a half-broken lens.
//   2. Tell the agent *what* was wrong, in structured form — a short list
//      of concrete issues with paths.
//   3. Tell the agent *how* to fix it when the mistake is recognizable
//      (old type names, common misplacements, etc.).
//   4. Show a known-good minimal skeleton so the agent can anchor on a
//      valid shape rather than pattern-matching against its own broken
//      output.
//   5. Point to the skill and presets for deeper reference.
//
// The agent will make mistakes. Our job is to make every mistake
// recoverable on the next call.

/** Cap on raw zod issues surfaced — deeply malformed input produces dozens. */
const MAX_ISSUES_REPORTED = 8;

/** Types the agent might remember from an earlier version of the spec. */
const RETIRED_TYPES: Record<string, string> = {
  comparison: 'table',
};

/** Current valid root-level node types, for hint generation. */
const KNOWN_TYPES = new Set([
  'text',
  'markdown',
  'image',
  'badge',
  'separator',
  'button',
  'link',
  'table',
  'column',
  'row',
  'box',
  'card',
  'list',
]);

function formatDescriptionError(): string {
  return [
    'Could not render lens — the `description` argument was empty or whitespace.',
    '',
    'No widget was shown. Call `show_lens` again with BOTH of:',
    '  • `spec`        — the lens JSON (required; see schema)',
    '  • `description` — a short account of what the lens shows, for model-facing context (required; non-empty)',
    '',
    'The description is not rendered to the user — it is metadata the agent reads to narrate the view in conversation, and the signal the agent re-uses when the user stars the view (memorialization). Example: "Side-by-side comparison of the Vaporfly 3 and Alphafly 3 on weight, drop, and stack height. No price column."',
  ].join('\n');
}

function formatSpecError(
  rawSpec: unknown,
  issues: ReadonlyArray<{ path: (string | number)[]; message: string }>,
): string {
  const parts: string[] = [];

  // ── Headline ────────────────────────────────────────────────────────────
  parts.push(
    'Could not render lens — the `spec` did not match the lens schema (v0.1). No widget was shown; call `show_lens` again with a corrected spec.',
  );

  // ── Structured issues ──────────────────────────────────────────────────
  const issueLines = issues
    .slice(0, MAX_ISSUES_REPORTED)
    .map((i, n) => {
      const path = i.path.join('.') || '(root)';
      return `  ${n + 1}. ${path}: ${i.message}`;
    });
  const overflow = issues.length - MAX_ISSUES_REPORTED;
  parts.push('');
  parts.push(`Problems (${issues.length}):`);
  parts.push(...issueLines);
  if (overflow > 0) {
    parts.push(`  … and ${overflow} more similar issue(s).`);
  }

  // ── Likely fixes for recognizable mistakes ─────────────────────────────
  const fixes = detectLikelyFixes(rawSpec, issues);
  if (fixes.length > 0) {
    parts.push('');
    parts.push('Likely fixes:');
    for (const fix of fixes) parts.push(`  → ${fix}`);
  }

  // ── Minimal skeleton ───────────────────────────────────────────────────
  parts.push('');
  parts.push('Minimal valid lens (replace the node with the content you want to show):');
  parts.push(
    '  { "specVersion": "0.1", "root": { "type": "text", "text": "Hello" } }',
  );

  // ── Pointers ───────────────────────────────────────────────────────────
  parts.push('');
  parts.push(
    'Need a fuller reference? Read `skill://mcp-lens/show-lens` for the complete vocabulary and examples. If presets are available on this server, call `list_lens_presets` and `get_lens_preset` for precedents that already use the correct shape.',
  );

  return parts.join('\n');
}

/**
 * Inspect the input against known-mistake patterns. Each recognized
 * mistake adds a one-line hint pointing at the specific remediation.
 * Conservative — if we can't be sure, we don't hint (the generic
 * zod messages and skeleton are still present).
 */
function detectLikelyFixes(
  raw: unknown,
  issues: ReadonlyArray<{ path: (string | number)[]; message: string }>,
): string[] {
  const hints: string[] = [];

  // Fix #1: retired type names. Walk the raw spec tree for `type` fields
  // that match our renamed/retired list.
  const retiredHits = findRetiredTypes(raw);
  for (const [retired, at] of retiredHits) {
    const to = RETIRED_TYPES[retired]!;
    const where = at.length === 0 ? '(root)' : at.join('.');
    hints.push(
      `\`${retired}\` is no longer a valid node type. Rename to \`${to}\` at ${where}. The field shape is unchanged.`,
    );
  }

  // Fix #2: wrong root shape. If the input has a top-level `type` but no
  // `specVersion` or `root`, the agent probably passed a node where a
  // lens was expected.
  if (looksLikeBareNode(raw)) {
    hints.push(
      'Root must be `{ "specVersion": "0.1", "root": <node> }`. You passed a node at the top level — wrap it.',
    );
  }

  // Fix #3: missing specVersion at root.
  if (
    issues.some(
      (i) =>
        i.path.length === 1 &&
        i.path[0] === 'specVersion',
    ) &&
    !hints.some((h) => h.includes('Root must be'))
  ) {
    hints.push(
      'Add `"specVersion": "0.1"` at the root. This is required on every lens.',
    );
  }

  // Fix #4: unknown type values anywhere in the tree.
  const unknownTypes = findUnknownTypes(raw);
  for (const [type, at] of unknownTypes) {
    // Skip if we already flagged it as a retired type.
    if (type in RETIRED_TYPES) continue;
    const where = at.length === 0 ? '(root)' : at.join('.');
    hints.push(
      `\`"type": "${type}"\` at ${where} is not a known node type. Valid types: ${[...KNOWN_TYPES].sort().join(', ')}.`,
    );
  }

  return hints;
}

function findRetiredTypes(
  raw: unknown,
  path: (string | number)[] = [],
  out: [string, (string | number)[]][] = [],
): [string, (string | number)[]][] {
  if (raw === null || typeof raw !== 'object') return out;
  const obj = raw as Record<string, unknown>;
  const t = obj['type'];
  if (typeof t === 'string' && t in RETIRED_TYPES) {
    out.push([t, path]);
  }
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      v.forEach((child, i) => findRetiredTypes(child, [...path, k, i], out));
    } else if (typeof v === 'object' && v !== null) {
      findRetiredTypes(v, [...path, k], out);
    }
  }
  return out;
}

function findUnknownTypes(
  raw: unknown,
  path: (string | number)[] = [],
  out: [string, (string | number)[]][] = [],
): [string, (string | number)[]][] {
  if (raw === null || typeof raw !== 'object') return out;
  const obj = raw as Record<string, unknown>;
  const t = obj['type'];
  // Skip the root `type: "lens"` and similar — unknown-type hints are
  // only useful for nodes, and we only get here when something is wrong.
  if (typeof t === 'string' && !KNOWN_TYPES.has(t) && !(t in RETIRED_TYPES)) {
    out.push([t, path]);
  }
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      v.forEach((child, i) => findUnknownTypes(child, [...path, k, i], out));
    } else if (typeof v === 'object' && v !== null) {
      findUnknownTypes(v, [...path, k], out);
    }
  }
  return out;
}

function looksLikeBareNode(raw: unknown): boolean {
  if (raw === null || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  const hasType = typeof obj['type'] === 'string';
  const hasSpecVersion = 'specVersion' in obj;
  const hasRoot = 'root' in obj;
  return hasType && !hasSpecVersion && !hasRoot;
}
