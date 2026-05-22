## What changed

<!-- One sentence. -->

## Why

<!-- The motivating issue, the moment that wasn't expressible before, the bug that needed fixing. Link the issue if there is one. -->

## How

<!-- Optional. Surprising design choices worth surfacing. -->

## Checklist

- [ ] `pnpm build` passes from the repo root.
- [ ] `pnpm test` passes (102 tests baseline; you should still have 102+ green).
- [ ] If this touches presets: I read [`skills/preset-authoring.md`](../skills/preset-authoring.md) and every illustrative YAML uses fictitious values.
- [ ] If this touches the spec: I updated `types.ts`, `schema.ts`, `schema.test.ts`, the renderer component, the runtime skill (`packages/mcp-lens/skills/show-lens.md`), and `docs/spec.md`.
- [ ] If this is a new demo or new host: I added a smoketest and updated `docs/trying-it-out.md`.
- [ ] No `/Users/...` paths, real ngrok URLs, or other personal/local references.

## Test plan

<!-- How a reviewer can convince themselves this works. Smoketest output, screenshots, agent transcripts. -->
