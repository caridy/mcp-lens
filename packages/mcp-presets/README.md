# @mcp-lens/presets

Reference library of moment-shaped lens presets for [`@mcp-lens/sdk`](https://www.npmjs.com/package/@mcp-lens/sdk).

```bash
pnpm add @mcp-lens/presets @mcp-lens/sdk
```

```ts
import { registerShowLens } from '@mcp-lens/sdk';
import { INCIDENTS_PRESETS } from '@mcp-lens/presets/incidents';

registerShowLens(server, { presets: INCIDENTS_PRESETS });
```

## What's in here

Subpath exports per domain. Each subpath ships named per-preset constants plus a `<DOMAIN>_PRESETS` aggregate array.

| Subpath | What it covers |
|---|---|
| `@mcp-lens/presets/generic` | Domain-blind moments — `user-asked-about-a-thing`, `user-is-browsing-things`, `user-is-choosing-between-things`. Use these when your domain doesn't need bespoke lifecycle-aware affordances. |
| `@mcp-lens/presets/incidents` | Cross-domain (accounts + incidents) — eight presets including focused drill-ins (impact, timeline, contributors). The richest reference set. |
| `@mcp-lens/presets/orders` | Transactional flows including a confirmation-with-`closeOnClick` pattern. |
| `@mcp-lens/presets/shoes` | Catalog browse + N-way comparison. |

## Authoring posture

These are **examples, not contracts**. A serious server author copies the markdown into their own repo, makes it theirs, drifts at their own pace. Breaking changes upstream are someone else's problem to merge.

The source markdown lives at the repo root in `presets/<domain>/*.md`. The package's TypeScript exports are compiled at build time. To contribute a preset back, see the repo's `presets/README.md` and `skills/preset-authoring.md`.

## License

MIT.
