/**
 * Lens presets for the orders demo.
 *
 * The preset *content* lives at the repo root in `presets/orders/*.md`
 * and is compiled into typed exports by the `mcp-presets` package's
 * build step. This file is a thin curation layer: it picks which
 * presets to ship and in what order. To author or edit a preset's
 * body, edit the markdown.
 */

import { ORDERS_PRESETS } from '@mcp-lens/presets/orders';

export const ORDER_PRESETS = ORDERS_PRESETS;
