# Development guide

How to work on this repo.

## Prerequisites

- **Node 20+** (22 in `.nvmrc`).
- **pnpm 10+**. This is a pnpm workspace; npm and yarn won't work.

## First-time setup

```bash
pnpm install
pnpm build   # builds renderer + all packages
pnpm test    # runs the mcp-lens test suite
```

## Layout

```
packages/
├── mcp-lens/                     # core library
│   ├── src/
│   │   ├── spec/                 # LensSpec types + zod schema
│   │   ├── tools/                # show_lens, presets
│   │   ├── skill.ts              # getLensSkill, registerLensSkillResource
│   │   └── renderer-bundle.ts    # GENERATED — do not edit
│   ├── renderer/                 # React widget
│   │   ├── src/                  # App, components, host bridge, markdown, styles
│   │   ├── index.html
│   │   └── vite.config.ts
│   ├── skills/show-lens.md       # the skill (ships at runtime)
│   └── scripts/bundle-renderer.mjs
└── demos/
    ├── shoes-mcp/                # stdio + streamable HTTP
    └── orders-mcp/               # stdio + streamable HTTP
```

## Build pipeline

`mcp-lens` is two-stage:

1. **Renderer build** — Vite bundles `renderer/src/` into a single self-contained `renderer/dist/index.html` with all JS and CSS inlined.
2. **TypeScript build** — but before `tsc` runs, `scripts/bundle-renderer.mjs` reads the HTML and writes it as a TypeScript module (`src/renderer-bundle.ts`) so `show_lens` can import the inline HTML at runtime without a filesystem lookup.

```bash
# Full pipeline:
pnpm --filter @mcp-lens/sdk build

# Individual steps:
pnpm --filter @mcp-lens/sdk build:renderer          # step 1
pnpm --filter @mcp-lens/sdk build:bundle-renderer   # step 2
pnpm --filter @mcp-lens/sdk build:ts                # step 3
```

`mcp-presets` is also two-stage:

1. **Compile presets** — `scripts/compile-presets.mjs` reads `presets/<domain>/*.md` from the repo root, validates each preset's frontmatter (`name`, `description`) plus every fenced ```yaml block, and emits typed TypeScript modules at `packages/mcp-presets/src/<domain>/index.ts`. The `src/` tree is fully generated and gitignored — never edit it by hand.
2. **TypeScript build** — `tsc` compiles the generated TypeScript into `dist/<domain>/index.{js,d.ts}` matching the package's `exports` map.

```bash
pnpm --filter @mcp-lens/presets build               # full pipeline
pnpm --filter @mcp-lens/presets build:compile       # step 1 (validate + emit TS)
pnpm --filter @mcp-lens/presets build:ts            # step 2 (compile TS)
```

A broken preset (missing frontmatter, name mismatch with filename, malformed YAML example) fails the compile step, which fails the build, which fails the PR.

### Build order matters across packages

`mcp-presets` consumes `mcp-lens`'s `LensPreset` type, and the demos consume `mcp-presets`'s compiled exports. The full-repo `pnpm build` orders these correctly via workspace topology, so a fresh clone does the right thing:

```bash
pnpm install
pnpm build           # builds mcp-lens → mcp-presets → demos in dependency order
```

If you `pnpm --filter <demo>-mcp build` *before* `pnpm --filter @mcp-lens/presets build` on a fresh clone, you'll get import-resolution errors (`Cannot find module 'mcp-presets/incidents'`). Run `pnpm build` once at the repo root, or filter-build the dependencies first:

```bash
pnpm --filter @mcp-lens/sdk build && pnpm --filter @mcp-lens/presets build
pnpm --filter incidents-mcp build   # now safe
```

## Common commands

```bash
# Run everything across the workspace:
pnpm build       # build all packages
pnpm typecheck   # tsc --noEmit across all packages
pnpm test        # run all tests
pnpm clean       # remove dist/, .tsbuildinfo, etc.

# Single package:
pnpm --filter @mcp-lens/sdk test
pnpm --filter shoes-mcp build

# Run all four HTTP servers in parallel (Ctrl+C shuts them all down):
pnpm start:all
# Or skip the build step (assumes already built):
pnpm serve:all

# Run a single demo over stdio (Claude Desktop etc.):
pnpm demo:shoes
pnpm demo:orders
pnpm demo:recipes

# Or single HTTP server:
pnpm --filter shoes-mcp start:http        # :3001
pnpm --filter orders-mcp start:http       # :3002
pnpm --filter recipes-mcp start:http      # :3003 (Lens-unaware)
pnpm --filter @mcp-lens/server start:http  # :3010 (standalone Lens)

# Develop the renderer standalone (no MCP host):
pnpm --filter @mcp-lens/sdk dev:renderer
# Then in the browser console:
#   window.__mcpLensDevOutput = { spec: { specVersion: '0.1', root: { type: 'text', text: 'hi' } }, description: 'dev' };
#   location.reload();
```

## Testing

Tests live in `packages/mcp-lens/src/**/*.test.ts` and use Vitest with the MCP SDK's `InMemoryTransport` to spin up a server+client pair in-process. No network, no mocks — tests call real MCP tools over a real MCP transport.

```bash
pnpm --filter @mcp-lens/sdk test
pnpm --filter @mcp-lens/sdk test:watch
```

Demos ship with lightweight smoke tests (`src/smoketest.ts`) — not formal tests, just "does it boot" scripts you can run after `build`:

```bash
pnpm --filter shoes-mcp build && node packages/demos/shoes-mcp/dist/smoketest.js
pnpm --filter orders-mcp build && node packages/demos/orders-mcp/dist/smoketest.js
pnpm --filter incidents-mcp build && node packages/demos/incidents-mcp/dist/smoketest.js
```

## Adding a new demo

The repo includes a step-by-step workflow at [`skills/new-demo-workflow.md`](../skills/new-demo-workflow.md) that takes a coding agent (Claude Code or similar) from "user asks for a new demo" to "smoketested + documented". Pair with [`skills/preset-authoring.md`](../skills/preset-authoring.md) — the craft handbook for the preset step.

These skills are NOT exposed as MCP resources. They are repo-level developer aids; the runtime agent never sees them. If you're working in this repo (locally, in Claude Code) and want to add a demo, point your agent at `skills/new-demo-workflow.md` first.

## Editing the spec

1. Update types in `packages/mcp-lens/src/spec/types.ts`.
2. Mirror in `packages/mcp-lens/src/spec/schema.ts` (zod).
3. Add cases to `src/spec/schema.test.ts`.
4. Add the rendering component in `renderer/src/components/`, wire it into `RenderNode.tsx`.
5. Update `skills/show-lens.md` to teach the agent.
6. Update `docs/spec.md`.
7. Rebuild: `pnpm --filter @mcp-lens/sdk build`.
8. Run tests: `pnpm test`.

Breaking changes bump `LENS_SPEC_VERSION` in `types.ts`. Non-breaking additions don't.

## Editing the skill

The skill is the single most important piece of agent-facing content. It lives at `packages/mcp-lens/skills/show-lens.md` as plain markdown. Edit in place. It's loaded via `readFileSync` at `getLensSkill` call time (cached), so edits take effect on next process restart — no rebuild needed for the text itself, though `registerLensSkillResource` serves the cached copy.

When shipping a release: test the skill against a real agent in ChatGPT Apps before tagging.

## Editing the renderer

The renderer is a standalone React app in `packages/mcp-lens/renderer/`. Standard Vite dev workflow:

```bash
pnpm --filter @mcp-lens/sdk dev:renderer
```

Opens a hot-reloading dev server. See `host.ts` for the `window.__mcpLensDevOutput` override that lets you feed the renderer a fake lens without an MCP host.

After editing, always:

```bash
pnpm --filter @mcp-lens/sdk build   # full pipeline — regenerates src/renderer-bundle.ts
pnpm --filter @mcp-lens/sdk test    # confirms nothing broke
```

## Code style

- TypeScript strict (with `exactOptionalPropertyTypes` off — it conflicts with zod-inferred types).
- `noUncheckedIndexedAccess` on. Index into arrays defensively.
- `type: 'module'` everywhere. Imports must use `.js` extensions (Node ESM).
- React components are function components. No class components.
- No dependencies beyond what's strictly necessary. Current runtime deps: `zod`, `react`, `react-dom`. Peer: `@modelcontextprotocol/sdk`.
- Comments: document *why* and contract boundaries, not *what*.

## Publishing

Not yet. When we publish:

- `mcp-lens` goes to npm public.
- Demos (`shoes-mcp`, `orders-mcp`) stay in-repo as examples; they are `"private": true`.
