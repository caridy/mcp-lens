/**
 * MCP Lens SDK — public API.
 *
 * Minimal install (one required call):
 *
 *   import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 *   import { registerShowLens } from '@mcp-lens/sdk';
 *
 *   const server = new McpServer({ name: 'my-server', version: '0.1.0' });
 *   registerShowLens(server);
 *
 * Full install (all optional helpers):
 *
 *   import {
 *     registerShowLens,
 *     registerPresets,
 *     registerLensSkillResource,
 *     getLensSkill,
 *   } from '@mcp-lens/sdk';
 *
 *   registerShowLens(server);
 *   registerPresets(server, [shoePreset, orderPreset]);
 *   registerLensSkillResource(server);
 */

// ── Tools ───────────────────────────────────────────────────────────────────

export {
  registerShowLens,
  LENS_RENDERER_URI,
  LENS_RENDERER_MIME,
  type RegisterShowLensOptions,
} from './tools/show-lens.js';

export {
  registerPresets,
  InMemoryPresetStore,
  type LensPreset,
  type PresetStore,
  type RegisterPresetsOptions,
} from './tools/presets.js';

// ── Skill ───────────────────────────────────────────────────────────────────

export {
  getLensSkill,
  registerLensSkillResource,
  LENS_SKILL_URI,
} from './skill.js';

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
