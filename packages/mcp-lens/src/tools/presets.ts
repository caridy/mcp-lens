/**
 * Lens presets — optional MCP tools.
 *
 * A preset is a small markdown document (prose + embedded JSON examples)
 * that teaches the agent how to present a specific kind of data on this
 * server. Presets are precedent, not templates — the agent studies them,
 * adapts and combines them, or ignores them if nothing fits.
 *
 * Two tools are exposed when the server author calls `registerPresets`:
 *   - list_lens_presets() → { name, description }[]
 *   - get_lens_preset(name) → full preset body
 *
 * Presets are held in memory. Server authors who want a durable preset
 * catalog can pass a custom `PresetStore` — the in-memory default works
 * for inline registration.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { describeError, toolError } from './_internal.js';

/** A lens preset — markdown doc with prose + embedded JSON examples. */
export interface LensPreset {
  /** Short identifier used by get_lens_preset. Convention: kebab-case. */
  name: string;
  /** One-line hook shown in list_lens_presets output. */
  description: string;
  /** Markdown body. Explains intent, labels prescriptive vs. illustrative, and embeds JSON examples via ```json fences. */
  body: string;
}

export interface PresetStore {
  list(): Promise<Omit<LensPreset, 'body'>[]> | Omit<LensPreset, 'body'>[];
  get(name: string): Promise<LensPreset | null> | LensPreset | null;
}

export class InMemoryPresetStore implements PresetStore {
  private readonly map = new Map<string, LensPreset>();

  constructor(initial: LensPreset[] = []) {
    for (const p of initial) this.set(p);
  }

  set(preset: LensPreset): void {
    this.map.set(preset.name, preset);
  }

  list(): Omit<LensPreset, 'body'>[] {
    return Array.from(this.map.values()).map(({ name, description }) => ({
      name,
      description,
    }));
  }

  get(name: string): LensPreset | null {
    return this.map.get(name) ?? null;
  }
}

export interface RegisterPresetsOptions {
  /** Rename the list tool. Default: list_lens_presets. */
  listToolName?: string;
  /** Rename the get tool. Default: get_lens_preset. */
  getToolName?: string;
  /** Custom backing store. Default: new InMemoryPresetStore(presets). */
  store?: PresetStore;
}

/**
 * Attach the preset tools to an existing MCP server.
 *
 * `presets` is the convenient inline form — the function wraps it in a
 * new InMemoryPresetStore. To use a custom backing store (filesystem,
 * database), pass `options.store` instead and leave `presets` as [].
 */
export function registerPresets(
  server: McpServer,
  presets: LensPreset[],
  options: RegisterPresetsOptions = {},
): { store: PresetStore } {
  const listName = options.listToolName ?? 'list_lens_presets';
  const getName = options.getToolName ?? 'get_lens_preset';

  // Fail fast at registration time for inline presets with missing fields.
  // Custom stores (options.store) are the author's responsibility to validate.
  for (const p of presets) {
    if (!p.name || !p.name.trim()) {
      throw new Error('registerPresets: preset is missing a name.');
    }
    if (!p.description || !p.description.trim()) {
      throw new Error(
        `registerPresets: preset "${p.name}" is missing a description.`,
      );
    }
    if (!p.body || !p.body.trim()) {
      throw new Error(`registerPresets: preset "${p.name}" has an empty body.`);
    }
  }

  const store = options.store ?? new InMemoryPresetStore(presets);

  server.registerTool(
    listName,
    {
      title: 'List lens presets',
      description: LIST_DESCRIPTION,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const all = await Promise.resolve(store.list());
        return {
          content: [
            {
              type: 'text' as const,
              text: formatPresetList(all),
            },
          ],
          structuredContent: { presets: all },
        };
      } catch (err) {
        return toolError(`Failed to list presets: ${describeError(err)}`);
      }
    },
  );

  server.registerTool(
    getName,
    {
      title: 'Get lens preset',
      description: GET_DESCRIPTION,
      inputSchema: {
        name: z
          .string()
          .min(1)
          .describe(
            "The preset's name, as returned by list_lens_presets. Case-sensitive.",
          ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ name }) => {
      let preset: LensPreset | null;
      try {
        preset = await Promise.resolve(store.get(name));
      } catch (err) {
        return toolError(
          `Failed to load preset "${name}": ${describeError(err)}`,
        );
      }
      if (!preset) {
        return toolError(
          `No preset named "${name}". Call list_lens_presets to see available names.`,
        );
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: preset.body,
          },
        ],
        structuredContent: {
          name: preset.name,
          description: preset.description,
          body: preset.body,
        },
      };
    },
  );

  return { store };
}

// ── Agent-facing descriptions ───────────────────────────────────────────────

const LIST_DESCRIPTION = [
  'List the lens presets this server provides as presentation precedents.',
  '',
  'Each preset is a short markdown document describing how a common kind of data on this server should typically be shown. Call this once before composing a lens; if a preset fits the moment, fetch it with get_lens_preset and use it as reference.',
  '',
  "Presets are precedent, not templates. Adapt, combine, or extend them — they describe the server author's preferred defaults, not a form to fill in.",
].join('\n');

const GET_DESCRIPTION = [
  'Fetch the full body of a lens preset by name.',
  '',
  'The body is markdown. It explains intent, labels which parts of any embedded JSON are prescriptive (structure) vs. illustrative (sample values), and describes when the preset is appropriate.',
  '',
  'Use the body as reference when composing a lens. Inline your real data in place of sample values. Combine presets when the user asks for multiple kinds of information in one view.',
].join('\n');

function formatPresetList(
  presets: Omit<LensPreset, 'body'>[],
): string {
  if (presets.length === 0) {
    return 'No lens presets are available on this server.';
  }
  const lines = presets.map((p) => `- ${p.name}: ${p.description}`);
  return [
    'Available lens presets (fetch with get_lens_preset):',
    ...lines,
  ].join('\n');
}
