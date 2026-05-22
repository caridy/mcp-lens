/**
 * Smoke test — boots the recipes server in-process and exercises every
 * tool. Run with: node dist/smoketest.js
 */

import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createRecipesServer } from './server.js';

async function main() {
  const server = createRecipesServer();
  const client = new Client(
    { name: 'smoketest', version: '0.0.0' },
    { capabilities: {} },
  );
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);

  console.log('─── tools ───');
  const tools = await client.listTools();
  for (const t of tools.tools) console.log(`  ${t.name}: ${t.title ?? ''}`);

  console.log('\n─── list_cuisines ───');
  const cuisines = await client.callTool({
    name: 'list_cuisines',
    arguments: {},
  });
  console.log('  ', (cuisines.content as Array<{ text: string }>)[0]?.text);

  console.log('\n─── search_recipes (quick, ≤30 min) ───');
  const search = await client.callTool({
    name: 'search_recipes',
    arguments: { tag: 'quick', maxTotalMinutes: 30 },
  });
  const found = (search.structuredContent as { recipes: unknown[] })?.recipes ?? [];
  console.log(`  ${found.length} recipe(s)`);
  console.log((search.content as Array<{ text: string }>)[0]?.text);

  console.log('\n─── get_recipe (smoked-salmon-penne, default servings) ───');
  const r = await client.callTool({
    name: 'get_recipe',
    arguments: { id: 'smoked-salmon-penne' },
  });
  const recipe = r.structuredContent as {
    title: string;
    servings: number;
    ingredients: Array<{ name: string; quantity: number; unit: string }>;
    rescaledForServings?: number;
  };
  console.log(`  ${recipe.title} · serves ${recipe.servings}`);
  console.log(`  rescaledForServings: ${recipe.rescaledForServings ?? 'no'}`);
  const penne = recipe.ingredients.find((i) => i.name === 'penne');
  console.log(`  penne: ${penne?.quantity} ${penne?.unit}`);

  console.log('\n─── get_recipe (rescaled to 4 servings) ───');
  const r2 = await client.callTool({
    name: 'get_recipe',
    arguments: { id: 'smoked-salmon-penne', servings: 4 },
  });
  const recipe2 = r2.structuredContent as {
    servings: number;
    rescaledForServings?: number;
    ingredients: Array<{ name: string; quantity: number; unit: string }>;
  };
  const penne2 = recipe2.ingredients.find((i) => i.name === 'penne');
  console.log(`  rescaledForServings: ${recipe2.rescaledForServings}`);
  console.log(`  penne (rescaled): ${penne2?.quantity} ${penne2?.unit}`);

  console.log('\n─── get_recipe (unknown id) ───');
  const r3 = await client.callTool({
    name: 'get_recipe',
    arguments: { id: 'does-not-exist' },
  });
  console.log('  isError:', r3.isError);
  console.log('  ', (r3.content as Array<{ text: string }>)[0]?.text);

  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
