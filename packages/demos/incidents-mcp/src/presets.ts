/**
 * Lens presets for the incidents demo.
 *
 * The preset *content* lives at the repo root in `presets/incidents/*.md`
 * and is compiled into typed exports by the `mcp-presets` package's
 * build step. This file is a thin curation layer: it picks which
 * presets to ship, in what order, and is the single place a server
 * author would edit if they wanted to drop a preset, reorder them, or
 * mix in presets from another domain.
 *
 * To author or edit a preset's body, edit the markdown — never this
 * file. To rename a preset, rename the markdown file and update the
 * frontmatter `name` to match.
 */

import { INCIDENTS_PRESETS } from '@mcp-lens/presets/incidents';

export const INCIDENT_PRESETS = INCIDENTS_PRESETS;
