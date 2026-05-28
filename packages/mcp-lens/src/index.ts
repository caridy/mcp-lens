/**
 * MCP Lens SDK — public API.
 *
 * Single-call registration:
 *
 *   import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 *   import { registerShowLens } from '@mcp-lens/sdk';
 *
 *   const server = new McpServer({ name: 'my-server', version: '0.1.0' });
 *   registerShowLens(server, { presets: MY_PRESETS });
 *
 * This registers three tools:
 *   - show_lens           — compose and render a lens
 *   - get_lens_guide      — spec reference + user preferences + preset index
 *   - get_lens_preset     — fetch one preset's full body (only if presets provided)
 */

// ── Tools ───────────────────────────────────────────────────────────────────

export {
  registerShowLens,
  LENS_RENDERER_URI,
  LENS_RENDERER_MIME,
  type RegisterShowLensOptions,
  type ShowLensCallEvent,
} from './tools/show-lens.js';

export {
  type LensPreset,
  type PresetStore,
  InMemoryPresetStore,
} from './tools/presets.js';

// ── Skill ───────────────────────────────────────────────────────────────────

export { getLensSkill } from './skill.js';

// ── Legacy (deprecated — use registerShowLens with options.presets) ──────────

export { registerPresets, type RegisterPresetsOptions } from './tools/presets.js';
export { registerLensSkillResource, LENS_SKILL_URI } from './skill.js';

// ── Spec ────────────────────────────────────────────────────────────────────

export {
  LENS_SPEC_VERSION,
  type LensSpec,
  type LensSpecVersion,
  type LensChrome,
  type LensNode,
  type BoxNode,
  type ColumnNode,
  type RowNode,
  type CardNode,
  type TextNode,
  type MarkdownNode,
  type ImageNode,
  type BadgeNode,
  type SeparatorNode,
  type ButtonNode,
  type LinkNode,
  type ListNode,
  type TableNode,
  type TableField,
  type TableItem,
  type Spacing,
  type AlignCrossAxis,
  type JustifyMainAxis,
  type Background,
  type TextVariant,
  type Tone,
  type ButtonVariant,
  type LinkVariant,
} from './spec/types.js';

export {
  lensSpecSchema,
  lensNodeSchema,
  lensChromeSchema,
  type LensSpecParsed,
} from './spec/schema.js';
