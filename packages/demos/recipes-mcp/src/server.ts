/**
 * recipes-mcp — a deliberately Lens-unaware MCP server.
 *
 * This is the validation server for the "agent uses MCP Lens against an
 * unaware upstream" thesis. It exposes a small recipe catalog through
 * three normal tools and *nothing else* — no show_lens, no presets, no
 * skill resource, no mcp-lens dependency. Any random MCP-server author
 * could write this in a couple of hours; that's the point.
 *
 * Pair this with `mcp-lens-server` (the standalone Lens app) in your
 * MCP host's connector list. The agent will see recipe data from this
 * server and lens tools from that one, and should compose useful
 * recipe lenses using only the generic moment-shaped presets shipped
 * by mcp-lens-server. If that works, Market A is real: end users can
 * upgrade any MCP server's UX without the server author doing anything.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  findRecipe,
  RECIPES,
  scaleIngredients,
  searchRecipes,
  type Recipe,
} from './data.js';

const CUISINES = [
  'italian',
  'mexican',
  'thai',
  'french',
  'middle-eastern',
  'american',
] as const;

export function createRecipesServer(): McpServer {
  const server = new McpServer(
    { name: 'recipes-mcp', version: '0.1.0' },
    {
      capabilities: { tools: {} },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  server.registerTool(
    'list_cuisines',
    {
      title: 'List available cuisines',
      description:
        'Return the cuisine families represented in the catalog. Use to discover valid filter values for search_recipes.',
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const cuisines = [...new Set(RECIPES.map((r) => r.cuisine))].sort();
      return {
        content: [
          {
            type: 'text' as const,
            text: cuisines.join(', '),
          },
        ],
        structuredContent: { cuisines },
      };
    },
  );

  server.registerTool(
    'search_recipes',
    {
      title: 'Search recipes',
      description:
        'Search the recipe catalog. Filter by cuisine, by tag (e.g. "quick", "vegetarian", "brunch"), and/or by total time (prep + cook, in minutes). Returns recipe summaries; use get_recipe for full details including ingredients and steps.',
      inputSchema: {
        cuisine: z
          .enum(CUISINES)
          .optional()
          .describe('Filter by cuisine family.'),
        tag: z
          .string()
          .optional()
          .describe(
            'Match any tag (case-insensitive). Examples: "quick", "vegetarian", "tacos", "brunch".',
          ),
        maxTotalMinutes: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Cap on prepMinutes + cookMinutes.'),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ cuisine, tag, maxTotalMinutes }) => {
      const results = searchRecipes({ cuisine, tag, maxTotalMinutes });
      return {
        content: [
          {
            type: 'text' as const,
            text:
              results.length === 0
                ? 'No recipes match those filters.'
                : results
                    .map(
                      (r) =>
                        `- ${r.id}: ${r.title} (${r.cuisine}, ${r.prepMinutes + r.cookMinutes} min, serves ${r.servings})`,
                    )
                    .join('\n'),
          },
        ],
        structuredContent: { recipes: results },
      };
    },
  );

  server.registerTool(
    'get_recipe',
    {
      title: 'Get recipe',
      description:
        "Fetch a recipe by id. If `servings` is provided, the returned ingredients are rescaled — quantities multiplied by (servings / original servings). Steps are returned unchanged. The recipe's original servings count is always included in the response so callers can show 'Serves N' next to the rescaled output.",
      inputSchema: {
        id: z.string().describe('Recipe id from search_recipes.'),
        servings: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            'Optional override. If provided, ingredient quantities are rescaled to this serving count. Steps are not modified.',
          ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id, servings }) => {
      const recipe = findRecipe(id);
      if (!recipe) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `No recipe with id "${id}". Try search_recipes first.`,
            },
          ],
        };
      }

      const out: Recipe & { rescaledForServings?: number } = { ...recipe };
      if (servings !== undefined && servings !== recipe.servings) {
        out.ingredients = scaleIngredients(
          recipe.ingredients,
          recipe.servings,
          servings,
        );
        out.rescaledForServings = servings;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: formatRecipeText(out),
          },
        ],
        structuredContent: { ...out },
      };
    },
  );

  return server;
}

/** Plain-text rendering of a recipe — for hosts that don't render widgets. */
function formatRecipeText(
  recipe: Recipe & { rescaledForServings?: number },
): string {
  const servingsLine =
    recipe.rescaledForServings !== undefined
      ? `Serves ${recipe.rescaledForServings} (rescaled from ${recipe.servings})`
      : `Serves ${recipe.servings}`;
  const lines = [
    recipe.title,
    recipe.description,
    '',
    servingsLine,
    `Prep ${recipe.prepMinutes} min · Cook ${recipe.cookMinutes} min`,
    '',
    'INGREDIENTS',
    ...recipe.ingredients.map(formatIngredientLine),
    '',
    'STEPS',
    ...recipe.steps.map((s, i) => `${i + 1}. ${s}`),
  ];
  return lines.join('\n');
}

function formatIngredientLine(i: {
  name: string;
  quantity: number;
  unit: string;
  prep?: string;
  optional?: boolean;
}): string {
  const qty = i.quantity === 0 ? '' : formatQuantity(i.quantity);
  const head = [qty, i.unit, i.name].filter(Boolean).join(' ');
  const tail = i.prep ? `, ${i.prep}` : '';
  const opt = i.optional ? ' (optional)' : '';
  return `- ${head}${tail}${opt}`;
}

/** Render a quantity with at most 2 decimal places, trimming trailing zeros. */
function formatQuantity(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

const SERVER_INSTRUCTIONS = `recipes-mcp — a small recipe catalog with three tools:

- list_cuisines: discover what cuisine filters are valid.
- search_recipes: find recipes by cuisine, tag, or max total time.
- get_recipe: fetch a recipe by id; pass an optional servings override to rescale ingredient quantities.

Recipes include images (multiple per recipe), ordered ingredients with quantities and prep notes, and step-by-step cooking instructions. There are no mutating tools — this is a read-only catalog.`;
