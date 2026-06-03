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
import { LENS_SPEC_VERSION, type LensSpec } from '../spec/types.js';
import { RENDERER_HTML } from '../renderer-bundle.js';
import { toolError } from './_internal.js';
import { type LensPreset, InMemoryPresetStore } from './presets.js';
import { getLensSkill } from '../skill.js';

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

  /**
   * Moment-shaped presets the server ships. Registers `get_lens_preset`
   * and includes the preset index in `get_lens_guide` output.
   */
  presets?: LensPreset[];

  /**
   * Optional callback that returns user-specific preferences (previously
   * memorialized descriptions). Called each time `get_lens_guide` is
   * invoked — the result is appended to the guide so the agent has
   * preferences in context for the rest of the session.
   *
   * Server authors wire their own persistence + identity resolution here.
   */
  getPreferences?: (extra: unknown) => Promise<string[]> | string[];

  /**
   * Optional debug callback invoked on every show_lens call. Receives the
   * raw input arguments, any coercion that was applied, and the result
   * (success or error). Useful for diagnosing what the model actually sends.
   */
  onCall?: (event: ShowLensCallEvent) => void;
}

export interface ShowLensCallEvent {
  /** Raw arguments as received from the MCP transport. */
  rawArgs: { spec: unknown; description: unknown };
  /** The spec value after coercion (JSON-parse, unwrap, etc.), before validation. */
  coercedSpec: unknown;
  /** What coercion steps were applied (empty array = none). */
  coercionSteps: string[];
  /** Whether validation passed. */
  valid: boolean;
  /** Zod issues if validation failed. */
  issues?: Array<{ path: (string | number)[]; message: string }>;
}

/** Re-exported from presets.ts for convenience. */
export type { LensPreset } from './presets.js';

/**
 * Attach the show_lens tool (and its backing renderer resource) to an
 * existing MCP server. Safe to call once per server.
 */
export function registerShowLens(
  server: McpServer,
  options: RegisterShowLensOptions = {},
): void {
  const toolName = options.toolName ?? 'show_lens';
  const onCall = options.onCall;

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

      const coercionSteps: string[] = [];
      const coerced = coerceSpec(args.spec, coercionSteps);
      const validation = lensSpecSchema.safeParse(coerced);

      if (onCall) {
        try {
          onCall({
            rawArgs: { spec: args.spec, description: args.description },
            coercedSpec: coerced,
            coercionSteps,
            valid: validation.success,
            issues: validation.success ? undefined : validation.error.issues,
          });
        } catch { /* debug callback must not crash the tool */ }
      }

      if (!validation.success) {
        return toolError(
          formatSpecError(coerced, validation.error.issues),
        );
      }

      return buildToolResult(validation.data, description);
    },
  );

  // 3. Register get_lens_guide — the session bootstrap tool.
  const presetStore = options.presets?.length
    ? new InMemoryPresetStore(options.presets)
    : null;
  const getPreferences = options.getPreferences;

  server.registerTool(
    'get_lens_guide',
    {
      title: 'Get lens guide',
      description: GET_LENS_GUIDE_DESCRIPTION,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (extra) => {
      const sections: string[] = [];

      // Section 1: the spec reference (condensed skill).
      sections.push(getLensSkill());

      // Section 2: user preferences (if configured).
      if (getPreferences) {
        try {
          const prefs = await Promise.resolve(getPreferences(extra));
          if (prefs.length > 0) {
            sections.push(
              '---\n\n## Your saved preferences\n\n' +
              'The user has previously starred these views. Use them to shape every lens you compose this session:\n\n' +
              prefs.map((p) => `- ${p}`).join('\n'),
            );
          }
        } catch { /* preferences are best-effort */ }
      }

      // Section 3: preset index (if presets are registered).
      if (presetStore) {
        const all = await Promise.resolve(presetStore.list());
        if (all.length > 0) {
          const lines = all.map((p) => `- \`${p.name}\` — ${p.description}`);
          sections.push(
            '---\n\n## Available presets\n\n' +
            'Each preset contains custom composition rules, affordance patterns, and structural guidance for a well-defined conversational moment. ' +
            'The descriptions below help you pick which preset fits — but the actual guidance is in the body.\n\n' +
            '**When to call `get_lens_preset(name)`:**\n' +
            '- The first time you encounter a moment that matches a preset — fetch it and use it as your reference.\n' +
            '- You can reuse what you learned from a preset across the session without re-fetching.\n' +
            '- If no preset matches the moment, compose from scratch using the spec reference above.\n\n' +
            lines.join('\n'),
          );
        }
      }

      const body = sections.join('\n\n');
      return {
        content: [{ type: 'text' as const, text: body }],
      };
    },
  );

  // 4. Register get_lens_preset (only if presets are provided).
  if (presetStore) {
    server.registerTool(
      'get_lens_preset',
      {
        title: 'Get lens preset',
        description: GET_LENS_PRESET_DESCRIPTION,
        inputSchema: {
          name: z
            .string()
            .min(1)
            .describe("The preset's name, as listed in the guide. Case-sensitive."),
        },
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async ({ name }) => {
        const preset = await Promise.resolve(presetStore.get(name));
        if (!preset) {
          return toolError(
            `No preset named "${name}". Call get_lens_guide to see the available preset names.`,
          );
        }
        return {
          content: [{ type: 'text' as const, text: preset.body }],
          structuredContent: {
            name: preset.name,
            description: preset.description,
            body: preset.body,
          },
        };
      },
    );
  }
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

// ── Spec coercion ──────────────────────────────────────────────────────────
//
// Clients (models) send `spec` in several wrong-but-recoverable shapes:
//   1. JSON string instead of an object (Claude Desktop observed 2026-05-27)
//   2. Wrapped in an extra `{ spec: ... }` envelope
//   3. Bare root node without specVersion/root wrapper
//   4. specVersion missing but root present
//
// We fix these silently and validate the result. If the coerced value still
// fails validation, the structured error output is based on the coerced
// shape (so hints are relevant to what we actually tried to validate).

function coerceSpec(raw: unknown, steps: string[] = []): unknown {
  let value = raw;

  // 1. JSON string → parse it.
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        value = JSON.parse(trimmed);
        steps.push('parsed JSON string');
      } catch {
        return value;
      }
    } else {
      return value;
    }
  }

  if (value === null || typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;

  // 2. Unwrap `{ spec: { ... } }` envelope.
  if ('spec' in obj && typeof obj.spec === 'object' && obj.spec !== null) {
    const inner = obj.spec as Record<string, unknown>;
    if ('specVersion' in inner || 'root' in inner) {
      value = inner;
      steps.push('unwrapped { spec: ... } envelope');
    }
  }

  const current = value as Record<string, unknown>;

  // 3. Bare root node — has `type` but no `specVersion`/`root`.
  if ('type' in current && !('specVersion' in current) && !('root' in current)) {
    steps.push('wrapped bare node in { specVersion, root }');
    return { specVersion: LENS_SPEC_VERSION, root: current };
  }

  // 4. Has `root` but missing `specVersion` — inject it.
  if ('root' in current && !('specVersion' in current)) {
    steps.push('injected missing specVersion');
    return { specVersion: LENS_SPEC_VERSION, ...current };
  }

  return value;
}

// ── Tool description (read by the agent) ────────────────────────────────────

const SHOW_LENS_DESCRIPTION = [
  'Render a rich view for the user by composing a lens spec.',
  '',
  'Call `get_lens_guide` before composing your first lens — it returns the full spec vocabulary, your user\'s saved preferences, and a list of available presets.',
  '',
  'The lens spec is a small JSON tree (boxes, columns, cards, text, buttons, images, comparisons). Compose it from data you already have. Do not embed placeholders; inline real values.',
  '',
  'Buttons emit follow-up prompts when clicked — write the prompt as the user would type it. Never reference server-side tools or APIs directly.',
  '',
  'Always pass a `description`. It is model-facing metadata (not shown verbatim to the user) describing what the lens contains and what design choices were made.',
].join('\n');

const GET_LENS_GUIDE_DESCRIPTION = [
  'Get the MCP Lens spec reference, user preferences, and available presets.',
  '',
  'Call this once before composing your first lens. Returns:',
  '1. The full node vocabulary (containers, content, interactive, table) and core composition rules.',
  '2. Previously saved user preferences (if any) — use them to shape every lens this session.',
  '3. A list of available presets — call `get_lens_preset(name)` the first time you encounter a matching moment. The one-line descriptions help you pick; the full body has the composition guidance.',
  '',
  'After context compaction, call again to reload the spec reference and preferences.',
].join('\n');

const GET_LENS_PRESET_DESCRIPTION = [
  'Fetch the full body of a lens preset by name.',
  '',
  'The body is markdown describing how to present a specific conversational moment. It explains intent, labels which parts are prescriptive vs. illustrative, and embeds worked JSON examples.',
  '',
  'Use it as reference when composing a lens for that moment. Inline your real data in place of sample values.',
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
    'Need a fuller reference? Call `get_lens_guide` for the complete node vocabulary and composition rules. If presets are available, call `get_lens_preset(name)` for precedents that already use the correct shape.',
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
