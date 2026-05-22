/**
 * Generic moment-shaped lens presets shipped by mcp-lens-server.
 *
 * The preset *content* lives at the repo root in `presets/generic/*.md`
 * and is compiled into typed exports by the `mcp-presets` package's
 * build step. This file is a thin curation layer.
 *
 * These presets are deliberately domain-blind — they describe
 * *conversational moments* without naming any specific record type.
 * The agent reads them as precedent and adapts the structure to
 * whatever data lives on the upstream MCP server it's working with.
 */

import { GENERIC_PRESETS as GENERIC_PRESETS_FROM_MCP_PRESETS } from '@mcp-lens/presets/generic';

export const GENERIC_PRESETS = GENERIC_PRESETS_FROM_MCP_PRESETS;
