/**
 * Lens presets for the shoes demo.
 *
 * The preset *content* lives at the repo root in `presets/shoes/*.md`
 * and is compiled into typed exports by the `mcp-presets` package's
 * build step. This file is a thin curation layer: it picks which
 * presets to ship and in what order. To author or edit a preset's
 * body, edit the markdown.
 */

import { SHOES_PRESETS } from '@mcp-lens/presets/shoes';

export const SHOE_PRESETS = SHOES_PRESETS;
