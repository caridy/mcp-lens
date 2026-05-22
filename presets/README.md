# Presets — the commons

A library of moment-shaped lens presets, organized by domain. PRs welcome.

## What you'll find here

```
presets/
├── generic/      # domain-blind moments — used by mcp-lens-server
├── incidents/    # incident management
├── orders/       # transactional / order management
├── shoes/        # catalog / browse / compare
└── <new domain>/ # add your own
```

Each `.md` file is **one preset**. Each preset captures a single conversational moment for that domain — what the user is doing, what data anchors the lens, and what 2–4 follow-up buttons keep the conversation moving.

## How presets become code

The `mcp-presets` package has a build script that reads every `.md` file under this directory at compile time and emits typed TypeScript exports per domain. A demo or external server then imports from `mcp-presets/<domain>` and registers the presets. **Presets are never read at runtime** — the build step is the only consumer.

So:

- **Author** → markdown file at `presets/<domain>/<moment>.md`.
- **Compile** → `pnpm --filter @mcp-lens/presets build` reads everything in this directory and writes `mcp-presets/dist/<domain>/index.{js,d.ts}`.
- **Use** → `import { fooPreset, BAR_PRESETS } from '@mcp-lens/presets/<domain>'`.

A broken preset (missing frontmatter, name mismatch, malformed YAML example) fails the build, which fails the PR. CI is the validator.

## File format

Each preset is markdown with YAML frontmatter:

```markdown
---
name: user-asked-about-a-shoe
description: Use when the user has named one specific shoe and is likely to want to compare it, see similar models, or check availability.
---

# Moment: user asked about one specific shoe

[prose explaining the moment, the likely next turns, and the anchor]

## Illustrative example — every string is fictitious

\```yaml
specVersion: "0.1"
root:
  type: card
  ...
\```

## Notes

[any prescriptive details, anti-patterns, etc.]
```

Three rules every preset must follow:

1. **`name` matches the filename.** `presets/shoes/user-asked-about-a-shoe.md` must have `name: user-asked-about-a-shoe`. The build fails on mismatch.
2. **`name` is unique within the domain folder.**
3. **Every fenced ```yaml block in the body must parse as valid YAML.** The build runs `YAML.parse` on each block.

The frontmatter `description` is the hook the agent sees in `list_lens_presets`. Make it specific. Generic descriptions get ignored.

## What goes in the body

The body is markdown the *runtime agent* reads when it fetches the preset. It teaches the agent how to handle this moment for this domain — specifically:

- **Likely next turns** — the 2–4 things the user usually wants next.
- **Anchor (prescriptive)** — what the lens looks like structurally (card vs. list vs. table; what fields go where; what badges; what affordances).
- **Affordances (the point)** — what the buttons say, in priority order, with `closeOnClick` semantics where appropriate.
- **Illustrative example** — one or more YAML blocks showing the structure with **fictitious data**. Never use real values from any data.ts file in this repo. The agent should adapt the structure to real data, not transcribe.
- **Notes** — anti-patterns to avoid, design rules ("severity tone is prescriptive"), edge cases.

For the full conventions, read [`../skills/preset-authoring.md`](../skills/preset-authoring.md). It distills the patterns from real failures across the demos.

## Adding a new domain

Create `presets/<domain-slug>/`, add at least one `.md` file, and register the domain in two places:

1. `packages/mcp-presets/package.json` — add a subpath under `exports`:

   ```json
   "./<domain-slug>": {
     "types": "./dist/<domain-slug>/index.d.ts",
     "import": "./dist/<domain-slug>/index.js"
   }
   ```

2. (Build does the rest.) The compile script discovers domains from `presets/*/` automatically.

Then run `pnpm --filter @mcp-lens/presets build` to verify. If it builds, you're done.

## Adding a preset to an existing domain

Just drop a new `.md` file into the right domain folder. Build will pick it up. The build emits a new named export (camelCased) and adds the preset to that domain's `<DOMAIN>_PRESETS` array. Server authors who consume the `*_PRESETS` array get the new preset for free; authors who hand-pick named imports just need to add the new name.

## Posture

These are **examples**, not contracts. Server authors who do something serious will copy the markdown into their own repo and make it theirs. Breaking changes upstream are someone else's problem to merge.

Ship presets that:

- Capture a moment that recurs across servers (worth being a precedent).
- Use fictitious data only.
- Articulate the *why* of the layout, not just the *what*.

If a preset is just "render this domain's data in a card," the generic `mcp-presets/generic` already covers it. Domain-specific presets should add real domain judgement: lifecycle-aware affordances, prescriptive structures the generic version can't predict, anti-patterns specific to this kind of data.
