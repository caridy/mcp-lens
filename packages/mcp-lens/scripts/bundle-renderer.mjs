#!/usr/bin/env node
/**
 * Convert the built renderer (renderer/dist/index.html) into a TypeScript
 * source module that exports the HTML as a string constant. The runtime
 * code imports that module and serves the HTML inline as the MCP UI
 * resource body — no filesystem lookups, no external hosting.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const rendererHtml = resolve(pkgRoot, 'renderer', 'dist', 'index.html');
const outputTs = resolve(pkgRoot, 'src', 'renderer-bundle.ts');

if (!existsSync(rendererHtml)) {
  console.error(
    `[bundle-renderer] Expected built renderer at ${rendererHtml}. Run pnpm build:renderer first.`,
  );
  process.exit(1);
}

const html = await readFile(rendererHtml, 'utf-8');

await mkdir(dirname(outputTs), { recursive: true });

const serialized = JSON.stringify(html);

const content = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * The renderer bundle is produced by \`pnpm build:renderer\` and inlined
 * here by \`scripts/bundle-renderer.mjs\`. It contains the single-file HTML
 * with all JS and CSS inlined.
 *
 * Regenerate with: pnpm run build  (in packages/mcp-lens)
 */
export const RENDERER_HTML: string = ${serialized};

export const RENDERER_BYTES: number = ${html.length};
`;

await writeFile(outputTs, content, 'utf-8');

const kb = (html.length / 1024).toFixed(1);
console.log(
  `[bundle-renderer] Wrote ${outputTs} (${kb} KiB of inlined HTML).`,
);
