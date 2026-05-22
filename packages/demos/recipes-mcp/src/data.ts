/**
 * Hand-authored recipe data for the recipes-mcp demo.
 *
 * Five recipes spanning different cuisines, time budgets, and ingredient
 * profiles so the demo shows the agent has interesting things to compare
 * and browse. The shape is deliberately ordinary — what any real recipe
 * MCP server would return — so the agent has to compose lenses without
 * any Lens-specific hints from this server.
 *
 * Image URLs are hot-linked Unsplash stock photography. Vendor them
 * locally if the demo has to run air-gapped.
 *
 * Quantity format: numbers + units. The scaling logic in
 * `scaleIngredients` multiplies quantities cleanly; non-scaling
 * ingredients (one-of items like "1 lemon, juiced") stay sensible
 * because the unit string is empty and the prep note carries the rest
 * of the instruction.
 */

/** Possible cuisine families. Used as filter values in search_recipes. */
export type Cuisine =
  | 'italian'
  | 'mexican'
  | 'thai'
  | 'french'
  | 'middle-eastern'
  | 'american';

export interface Ingredient {
  /** Display name as it should read in an ingredient line ("smoked salmon"). */
  name: string;
  /** Numeric quantity. Use 0 for un-quantifiable items. */
  quantity: number;
  /** Unit string. Empty for "one shallot, finely chopped" style entries. */
  unit: string;
  /** Optional prep instruction ("torn into pieces", "thinly sliced"). */
  prep?: string;
  /** Optional flag — listed but the recipe is fine without it. */
  optional?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  /** One-line summary, shown under the title (matches the screenshot). */
  description: string;
  cuisine: Cuisine;
  /** Base servings the quantities below are sized for. */
  servings: number;
  /** Active prep time in minutes. */
  prepMinutes: number;
  /** Cook time in minutes. */
  cookMinutes: number;
  /** 1–3 photos. First image is the hero. */
  imageUrls: string[];
  ingredients: Ingredient[];
  /** Ordered cooking steps. */
  steps: string[];
  /** Loose tags for search ("quick", "vegetarian", "30-min"). */
  tags: string[];
}

export const RECIPES: Recipe[] = [
  {
    id: 'smoked-salmon-penne',
    title: 'Smoked Salmon Penne',
    description: 'A quick, creamy pasta that feels indulgent without being heavy.',
    cuisine: 'italian',
    servings: 2,
    prepMinutes: 5,
    cookMinutes: 15,
    imageUrls: [
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=640&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=640&auto=format&fit=crop',
    ],
    ingredients: [
      { name: 'penne', quantity: 7.1, unit: 'oz' },
      { name: 'smoked salmon', quantity: 5.25, unit: 'oz', prep: 'torn into pieces' },
      { name: 'heavy cream', quantity: 0.625, unit: 'cup' },
      { name: 'garlic cloves', quantity: 2, unit: '', prep: 'thinly sliced' },
      { name: 'shallot', quantity: 1, unit: '', prep: 'finely chopped' },
      { name: 'butter', quantity: 1, unit: 'tbsp' },
      { name: 'lemon', quantity: 0.5, unit: '', prep: 'juiced' },
      { name: 'capers', quantity: 1, unit: 'tbsp', optional: true },
      { name: 'fresh dill', quantity: 1, unit: 'tbsp', prep: 'chopped' },
      { name: 'salt', quantity: 0, unit: '', prep: 'to taste' },
      { name: 'black pepper', quantity: 0, unit: '', prep: 'to taste' },
    ],
    steps: [
      'Cook the penne in well-salted boiling water until al dente, about 10 minutes. Reserve 1/2 cup of pasta water before draining.',
      'While the pasta cooks, melt the butter in a large skillet over medium heat. Add the shallot and garlic; cook until soft and fragrant, about 3 minutes.',
      'Pour in the cream and lemon juice. Simmer gently for 2 minutes until slightly thickened.',
      'Reduce heat to low. Add the smoked salmon and capers; stir until the salmon just warms through. Do not boil — it will toughen.',
      'Toss the drained pasta into the sauce, adding splashes of pasta water until it coats every piece. Finish with the dill, salt, and pepper.',
      'Serve immediately in warmed bowls.',
    ],
    tags: ['pasta', 'quick', '30-min', 'seafood'],
  },
  {
    id: 'chicken-tinga-tacos',
    title: 'Chicken Tinga Tacos',
    description: 'Smoky, lightly spicy shredded chicken in chipotle-tomato sauce.',
    cuisine: 'mexican',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 25,
    imageUrls: [
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=640&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=640&auto=format&fit=crop',
    ],
    ingredients: [
      { name: 'boneless skinless chicken thighs', quantity: 1.5, unit: 'lb' },
      { name: 'yellow onion', quantity: 1, unit: '', prep: 'thinly sliced' },
      { name: 'garlic cloves', quantity: 3, unit: '', prep: 'minced' },
      { name: 'fire-roasted diced tomatoes', quantity: 14, unit: 'oz can' },
      { name: 'chipotle peppers in adobo', quantity: 2, unit: '', prep: 'finely chopped' },
      { name: 'adobo sauce', quantity: 1, unit: 'tbsp' },
      { name: 'ground cumin', quantity: 1, unit: 'tsp' },
      { name: 'dried oregano', quantity: 1, unit: 'tsp' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'small corn tortillas', quantity: 8, unit: '' },
      { name: 'cotija cheese', quantity: 0.5, unit: 'cup', prep: 'crumbled', optional: true },
      { name: 'lime', quantity: 1, unit: '', prep: 'cut into wedges' },
      { name: 'cilantro', quantity: 0.25, unit: 'cup', prep: 'roughly chopped' },
    ],
    steps: [
      'Season the chicken thighs with salt. Heat the olive oil in a large skillet over medium-high; sear the chicken on both sides until lightly browned, about 6 minutes total. Remove to a plate.',
      'In the same pan, lower the heat to medium and add the onion. Cook until soft and starting to caramelize, about 8 minutes. Add the garlic and cook one more minute.',
      'Stir in the chipotles, adobo sauce, cumin, and oregano. Toast for 30 seconds.',
      'Add the tomatoes and 1/2 cup of water. Return the chicken to the pan, nestling it into the sauce. Cover and simmer for 15 minutes until the chicken is cooked through and pulls apart easily.',
      'Shred the chicken in the pan with two forks; stir to coat in the sauce. Taste and adjust salt.',
      'Warm the tortillas. Pile the tinga onto each, finish with cotija, cilantro, and a squeeze of lime.',
    ],
    tags: ['tacos', 'chicken', 'spicy', 'weeknight'],
  },
  {
    id: 'thai-green-curry',
    title: 'Thai Green Curry with Vegetables',
    description: 'Aromatic, brothy curry that comes together in 25 minutes.',
    cuisine: 'thai',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 15,
    imageUrls: [
      'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=640&auto=format&fit=crop',
    ],
    ingredients: [
      { name: 'green curry paste', quantity: 3, unit: 'tbsp' },
      { name: 'full-fat coconut milk', quantity: 13.5, unit: 'oz can' },
      { name: 'chicken stock', quantity: 1, unit: 'cup' },
      { name: 'firm tofu', quantity: 14, unit: 'oz', prep: 'cubed' },
      { name: 'thai eggplant', quantity: 0.5, unit: 'lb', prep: 'quartered', optional: true },
      { name: 'red bell pepper', quantity: 1, unit: '', prep: 'sliced' },
      { name: 'green beans', quantity: 1, unit: 'cup', prep: 'trimmed' },
      { name: 'fish sauce', quantity: 2, unit: 'tbsp' },
      { name: 'palm sugar', quantity: 1, unit: 'tbsp' },
      { name: 'thai basil leaves', quantity: 0.5, unit: 'cup' },
      { name: 'kaffir lime leaves', quantity: 4, unit: '', optional: true },
      { name: 'jasmine rice', quantity: 2, unit: 'cup', prep: 'cooked' },
    ],
    steps: [
      'In a wide saucepan over medium heat, scoop the thick cream from the top of the coconut milk and add it to the pan. Cook until the oil separates and the cream looks glossy, about 3 minutes.',
      'Stir in the curry paste and toast for 1 minute until fragrant.',
      'Pour in the rest of the coconut milk and the stock. Bring to a gentle simmer.',
      'Add the tofu, eggplant, bell pepper, and green beans. Drop in the lime leaves. Simmer 8 minutes until the vegetables are tender but still bright.',
      'Stir in the fish sauce and palm sugar. Taste and balance — should be savory, slightly sweet, slightly salty.',
      'Off the heat, fold in the thai basil. Serve over jasmine rice.',
    ],
    tags: ['curry', 'vegetarian-friendly', 'quick', 'thai'],
  },
  {
    id: 'classic-french-omelette',
    title: 'Classic French Omelette',
    description: 'Three eggs, butter, salt — done in three minutes if you focus.',
    cuisine: 'french',
    servings: 1,
    prepMinutes: 2,
    cookMinutes: 3,
    imageUrls: [
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=640&auto=format&fit=crop',
    ],
    ingredients: [
      { name: 'eggs', quantity: 3, unit: '' },
      { name: 'unsalted butter', quantity: 1, unit: 'tbsp' },
      { name: 'fine salt', quantity: 0.25, unit: 'tsp' },
      { name: 'fresh chives', quantity: 1, unit: 'tsp', prep: 'finely chopped', optional: true },
    ],
    steps: [
      'Crack the eggs into a bowl, add the salt, and beat with a fork until perfectly uniform — no streaks of white. About 30 seconds of brisk whisking.',
      'Heat a 8-inch nonstick pan over medium-high until hot. Add the butter; swirl until it foams and the foam just starts to subside.',
      'Pour in the eggs. Immediately stir constantly with the back of a fork while shaking the pan, breaking up large curds, until the eggs are mostly set but still glossy on top, about 30 seconds.',
      'Smooth the top, then tilt the pan toward you. Use the fork to fold the far edge over the middle, then nudge the omelette to the lip of the pan and roll it onto a plate, seam down.',
      'Finish with chives. Eat immediately.',
    ],
    tags: ['breakfast', 'eggs', 'quick', 'classic'],
  },
  {
    id: 'shakshuka',
    title: 'Shakshuka',
    description: 'Eggs poached in a spiced tomato-pepper sauce. Brunch hero.',
    cuisine: 'middle-eastern',
    servings: 3,
    prepMinutes: 10,
    cookMinutes: 25,
    imageUrls: [
      'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=640&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=640&auto=format&fit=crop',
    ],
    ingredients: [
      { name: 'olive oil', quantity: 3, unit: 'tbsp' },
      { name: 'yellow onion', quantity: 1, unit: '', prep: 'diced' },
      { name: 'red bell pepper', quantity: 1, unit: '', prep: 'diced' },
      { name: 'garlic cloves', quantity: 4, unit: '', prep: 'minced' },
      { name: 'sweet paprika', quantity: 1, unit: 'tbsp' },
      { name: 'ground cumin', quantity: 1, unit: 'tsp' },
      { name: 'red pepper flakes', quantity: 0.25, unit: 'tsp', optional: true },
      { name: 'whole peeled tomatoes', quantity: 28, unit: 'oz can', prep: 'crushed by hand' },
      { name: 'eggs', quantity: 6, unit: '' },
      { name: 'feta', quantity: 0.33, unit: 'cup', prep: 'crumbled', optional: true },
      { name: 'fresh parsley', quantity: 2, unit: 'tbsp', prep: 'chopped' },
      { name: 'crusty bread', quantity: 1, unit: 'loaf', prep: 'for serving' },
    ],
    steps: [
      'Heat the olive oil in a 10-inch ovenproof skillet over medium heat. Add the onion and bell pepper; cook until soft and starting to color, about 10 minutes.',
      'Stir in the garlic, paprika, cumin, and red pepper flakes. Toast for 1 minute.',
      'Add the crushed tomatoes and a generous pinch of salt. Simmer, stirring occasionally, until the sauce thickens to a stew-like consistency, about 12 minutes.',
      'Use the back of a spoon to make six wells in the sauce. Crack one egg into each. Cover the pan and cook over low heat until the whites are just set and the yolks are still runny, about 6 minutes.',
      'Scatter feta and parsley over the top. Serve straight from the pan with bread to mop up the sauce.',
    ],
    tags: ['brunch', 'eggs', 'vegetarian', 'one-pan'],
  },
];

export interface SearchQuery {
  cuisine?: Cuisine;
  /** Match any tag (case-insensitive). */
  tag?: string;
  /** Cap on prepMinutes + cookMinutes. */
  maxTotalMinutes?: number;
}

export function searchRecipes(query: SearchQuery): Recipe[] {
  return RECIPES.filter((r) => {
    if (query.cuisine && r.cuisine !== query.cuisine) return false;
    if (query.tag) {
      const t = query.tag.toLowerCase();
      if (!r.tags.some((tag) => tag.toLowerCase() === t)) return false;
    }
    if (query.maxTotalMinutes !== undefined) {
      if (r.prepMinutes + r.cookMinutes > query.maxTotalMinutes) return false;
    }
    return true;
  });
}

export function findRecipe(id: string): Recipe | null {
  return RECIPES.find((r) => r.id === id) ?? null;
}

/**
 * Return ingredients rescaled to a different serving count.
 *
 * Multiplies numeric quantities by `target / source`. Quantity 0 stays 0
 * (un-quantifiable items like "salt to taste"). Units and prep notes are
 * preserved verbatim — the rescaling is purely a quantity multiplier; we
 * don't try to be clever about "1 lemon, juiced" → "0.7 lemons" (the
 * agent can decide whether to round in its narration).
 */
export function scaleIngredients(
  ingredients: Ingredient[],
  sourceServings: number,
  targetServings: number,
): Ingredient[] {
  if (sourceServings <= 0) {
    throw new Error(
      `scaleIngredients: sourceServings must be positive (got ${sourceServings})`,
    );
  }
  if (targetServings <= 0) {
    throw new Error(
      `scaleIngredients: targetServings must be positive (got ${targetServings})`,
    );
  }
  const factor = targetServings / sourceServings;
  return ingredients.map((ing) => ({
    ...ing,
    quantity: ing.quantity === 0 ? 0 : roundForDisplay(ing.quantity * factor),
  }));
}

/** Round to a sensible display precision: 2 decimals, trimming trailing zeros. */
function roundForDisplay(n: number): number {
  return Math.round(n * 100) / 100;
}
