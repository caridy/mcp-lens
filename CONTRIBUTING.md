# Contributing to MCP Lens

Thanks for considering a contribution. This is a small project with strong opinions; the bar for landing changes is "does this match the conventions already in the repo?" Contributions that follow the existing patterns are easy to land. Contributions that ask the project to take a different direction need a conversation first — open an issue, not a PR.

## Quick start

```bash
pnpm install        # uses pnpm 10+; npm and yarn won't work
pnpm build          # builds renderer + library + demos
pnpm test           # runs the Vitest suite
```

If `pnpm build` fails, fix the build before doing anything else. The demos depend on `@mcp-lens/sdk` and `@mcp-lens/presets` being built first; the workspace topology handles ordering when you `pnpm build` from the repo root.

See [`docs/development.md`](./docs/development.md) for the longer working guide.

## Common contributions, in order of how welcome they are

### Adding a preset

The preset commons lives at [`presets/`](./presets/). Each preset is one markdown file at `presets/<domain>/<moment>.md`.

1. Read [`skills/preset-authoring.md`](./skills/preset-authoring.md) — distilled conventions from real failures across the demos. Non-negotiable.
2. Read [`presets/README.md`](./presets/README.md) — the file format, the build, the validation rules.
3. Write your preset. Use **fictitious-but-plausible values** in every illustrative YAML block. Never copy values from any `data.ts` in this repo.
4. Run `pnpm --filter @mcp-lens/presets build`. The compile step validates frontmatter, name uniqueness, and YAML parseability. If your preset is malformed, the build fails loudly.
5. PR with a one-paragraph rationale: what conversational moment does this capture, and why isn't it covered by an existing preset (especially the generic ones in `presets/generic/`)?

Presets that just rename existing generic ones in domain-specific terms will be closed. Presets that capture genuinely domain-specific affordances (lifecycle-aware buttons, prescriptive anchor structures, anti-patterns specific to your data shape) are welcome.

### Adding a demo

Demos are reference integrations of the `@mcp-lens/sdk` library. They live at `packages/demos/<name>-mcp/`.

If you're working with a coding agent (Claude Code, Cursor, etc.), point it at [`skills/new-demo-workflow.md`](./skills/new-demo-workflow.md). It contains the 8-step workflow and the conventions every existing demo follows. The skill is not exposed at runtime — it's purely an authoring aid.

Demos shouldn't compete on coverage. The four existing ones (shoes, orders, incidents, recipes-as-Lens-unaware) cover catalog browse, transactional confirmation, cross-domain composition, and the standalone-Lens-on-an-unaware-server pattern. New demos should demonstrate *something different* — a domain shape we haven't shown, a host-specific quirk, a moment-shaped pattern that doesn't fit the existing catalog.

### Fixing a bug

Bug fixes are welcome. Two things speed up review:

- A test (or smoketest output) showing the bug. The test should fail before the fix and pass after.
- A short note on **why** the bug existed, not just the line that fixed it. Future-you will thank present-you.

### Proposing a spec change

The lens spec lives at [`packages/mcp-lens/src/spec/types.ts`](./packages/mcp-lens/src/spec/types.ts) (TypeScript) and [`schema.ts`](./packages/mcp-lens/src/spec/schema.ts) (zod runtime validator). Documented at [`docs/spec.md`](./docs/spec.md).

Spec changes are the highest-bar contribution. Open an issue first describing:

1. The conversational moment that current vocabulary can't express.
2. Why an existing primitive doesn't suffice.
3. The proposed shape, with at least two example lenses.

Breaking changes bump `LENS_SPEC_VERSION`. Non-breaking additions don't. Either way, every spec change touches the runtime schema, the renderer, the skill, the docs, and at least one preset that exercises the new shape.

### Other contributions

- Improving documentation: always welcome. Fix typos, sharpen explanations, replace stale examples.
- Improving error messages and developer ergonomics: welcome.
- Refactoring without behavior change: please don't, unless it unblocks something concrete. Prefer a feature or bug-fix PR that needs the refactor.

## Code style

- TypeScript strict (with `exactOptionalPropertyTypes` off — it conflicts with zod-inferred types).
- `noUncheckedIndexedAccess` on. Index into arrays defensively.
- `type: 'module'` everywhere. Imports must use `.js` extensions (Node ESM).
- React components are function components.
- Comments document *why* and contract boundaries, not *what*.
- No new runtime dependencies without a strong reason.

## Tests

- 102 tests run in `pnpm test`. Keep them green.
- Vitest, in-process MCP `InMemoryTransport` for integration tests.
- Renderer tests use a manually-stubbed `window`.

## What not to do

- Don't add features the project explicitly chose not to ship (see [`docs/decisions.md`](./docs/decisions.md) and [`docs/open-questions.md`](./docs/open-questions.md) before opening a PR for anything load-bearing).
- Don't import abstractions from heavier frameworks (data providers, expression languages, state machines). The simplicity of the spec is the point.
- Don't add LLM-generated HTML or JavaScript pathways. The widget bundle is fixed; the agent only composes structured JSON.

## Questions?

Open an issue with the `question` label. The maintainers read everything; expect a response within a few days.
