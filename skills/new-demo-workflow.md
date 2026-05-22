# Adding a new demo to this repo — a workflow for coding agents

**Audience:** a coding agent (Claude Code or similar) that has just been asked to add a new demo MCP server to the `mcp-lens` repo. The user is the repo owner or a contributor running locally.

**Goal:** end with a buildable, smoketested, document-mentioned demo at `packages/demos/<name>-mcp/` that follows every convention this repo has crystallized across four prior demos.

**Pair this with:** [`preset-authoring.md`](./preset-authoring.md) — the deeper craft handbook for the preset step. Read it before starting Step 4.

This skill is **not** exposed as an MCP resource. It is a repo-level developer aid for coding agents working inside this repo. The runtime agent never sees it.

---

## Before you start — interrogate the user

Don't scaffold blind. You're about to spend ~30 minutes producing 5–10 files; spend 5 minutes up front making sure they're the right files. Ask the user:

1. **What domain?** A noun, plus a few sentences on what kinds of records exist. ("Incident management — accounts, incidents, timeline events" / "Customer support — tickets, customer accounts, conversation history" / "Project management — projects, tasks, owners, milestones".)

2. **What's the canonical lifecycle?** Most domains have one (orders: pending → processing → shipped → delivered; incidents: open → mitigated → resolved). The lifecycle drives status-aware affordances. If the domain has none, say so out loud — the absence affects which presets earn their keep.

3. **What conversational moments matter most?** Walk through 4–6 hypothetical user prompts ("show me my open X", "what's the status of Y?", "compare X and Y", "page the IC for X"). Each prompt is a candidate moment. Some will be served by the generic `mcp-lens-server` presets and don't need a domain-specific one — you decide which after Step 4.

4. **Are there cross-domain relationships?** ("Incidents touch accounts." "Tickets belong to customer accounts." "Tasks belong to projects.") If yes, plan for the `combined-with-X` lens variant in the appropriate preset.

5. **What SPA anti-pattern are we explicitly designing against?** Every demo so far has had one — orders fights "form-style modal confirmations," incidents fights "tabs + dashboard." Ask the user "if you'd built this in the existing system, what would it look like, and what specifically don't you want here?" Their answer becomes the prose justification in your presets.

6. **Memorialize or no?** Default for new demos: **no** (per recent decisions). Only opt in if the demo's pitch genuinely depends on the preference loop.

7. **Port number?** Pick the next free one in `:3001..3009` (look at `docs/trying-it-out.md` for the current map). If the demo will pair with `mcp-lens-server`, document that.

Don't proceed past these answers being clear. If the user says "just go" without answering, push back once: "I can produce something generic, but this is the cheapest moment to make it specifically yours."

---

## The 8-step workflow

### Step 1 — Scaffold the package shell

Create `packages/demos/<name>-mcp/` with:

- `package.json` — copy from an existing demo (orders-mcp is the closest reference). Update name, description, port-related script comments. Keep the dependency block identical (`@modelcontextprotocol/sdk`, `mcp-lens: workspace:*`, `zod`, `tsx` devdep, `typescript` devdep, `@types/node`).
- `tsconfig.json` — extend `../../../tsconfig.base.json` exactly like other demos.
- `src/index.ts` — re-export `create<Name>Server`, `* from data.js`, the presets array.
- `src/stdio.ts` — boilerplate stdio entrypoint (copy from any demo, swap `createOrdersServer` → `create<Name>Server`).
- `src/http.ts` — boilerplate HTTP entrypoint with `PORT = Number(process.env.PORT ?? 300X)`.

Don't write `data.ts`, `server.ts`, `presets.ts`, or `smoketest.ts` yet. Those depend on the user's domain answers.

Verify the shell typechecks: `pnpm install && pnpm --filter <name>-mcp typecheck`. It will fail on the missing files, but the package wiring should be valid.

### Step 2 — Author `data.ts`

Design types and seed values that satisfy three constraints:

1. **Cover the lifecycle.** If the domain has open / mitigated / resolved, the seed needs at least one record in each state. That way every status-aware affordance the presets produce can be exercised by a real prompt.
2. **Cover the cross-domain edges.** If "incidents touch accounts," at least one incident touches multiple accounts and at least one touches just one. The agent will encounter both shapes.
3. **One record gets the rich treatment.** For domains with sub-resources (timeline events, line items, attachments), one seed record gets a *lot* of them so the drill-in presets have meaty data to render. Other records stay sparse so "show me X" still works on them but doesn't take 10 seconds to scan.

Read-only query API. Do NOT add mutation functions unless the user explicitly asked for them. (Phase 0 of MCP UI Apps in Slack gates writes; keeping every tool read-only ensures every tool surfaces.) Functions to define:

- `list<Records>(filters?: Partial<...>)` → array.
- `get<Record>(id)` → record or undefined.
- One per drill-in: `get<Record>Timeline`, `get<Record>Impact`, `get<Record>Contributors`, etc.

Naming: identifiers are kebab-case prefixed with the type (`acct-globex`, `INC-52790`). Stick to ASCII; no emoji in IDs.

### Step 3 — Author `server.ts`

Each tool gets:

- A title.
- A description ending with: *"After fetching, render via show_lens using the user-... preset."* — this teaches the agent which preset fits which fetch.
- An input schema (zod, in the inline-shape form).
- `annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }`.
- A handler that returns `content` + `structuredContent`.

After the tool block, wire MCP Lens:

```ts
registerShowLens(server);
registerPresets(server, <NAME>_PRESETS);
registerLensSkillResource(server);
```

`SERVER_INSTRUCTIONS` is a short ~500-byte orientation paragraph. Do not embed the full lens skill — that ships as a resource.

### Step 4 — Author the presets

**This is where you spend the most time.** Read [`preset-authoring.md`](./preset-authoring.md) end to end before writing. The conventions there are derived from real failures across four demos; following them is non-negotiable.

For each conversational moment the user named in interrogation:

- Decide whether the generic `mcp-lens-server` presets cover it. If yes, skip — don't ship a domain-specific shadow.
- If it's domain-specific, write the preset following preset-authoring.md.

Ship presets in this order in the file (matches user mental model):

1. Sub-domain entities first (accounts, owners) — `user-asked-about-an-X`, `user-is-browsing-Xs`.
2. Main-domain entities — `user-asked-about-a-Y`, `user-is-browsing-Ys`.
3. Drill-in moments — `user-asked-about-Y-aspect`.
4. Comparison — `user-is-choosing-between-Ys`.
5. Confirmation / destructive — `user-asked-to-<verb>`.

**Cross-domain combination is documented in prose.** If the user named a combined moment ("show me top 3 incidents for Globex"), the documentation lives in *one of the two presets* (typically the listed one, e.g. `user-is-browsing-incidents` documents the with-account variant). Don't ship a third "combined" preset.

**Audit your own work before moving on.** `grep` every concrete value in your illustrative JSON against `data.ts`. If anything overlaps, the agent will transcribe instead of compose. Replace overlapping values with fictitious-but-plausible alternatives. This is the rule we enforced retroactively across all prior demos; it's cheaper to get right the first time.

### Step 5 — Author `smoketest.ts`

`smoketest.ts` exercises every tool and one representative `show_lens` call. Copy the structure from `incidents-mcp/src/smoketest.ts` — it's the most complete reference. The smoketest:

- Uses `InMemoryTransport.createLinkedPair()` to wire a server + client in-process.
- Lists tools and confirms every expected tool name is present.
- Calls each domain tool with a representative argument, prints a one-line summary of the result.
- Calls `list_lens_presets` and prints the preset names.
- Calls `show_lens` with a representative spec — ideally exercising the cross-domain combination if the demo has one. Confirm both the canonical `_meta.ui.resourceUri` and legacy `openai/widgetDescription` are present in the result.

The smoketest is the floor for "did I wire this up correctly." It catches schema mismatches, missing imports, typoed tool names. It does NOT catch "this preset is too rigid" — that's Step 8.

### Step 6 — Build, typecheck, test

```bash
pnpm install                              # picks up new workspace package
pnpm --filter <name>-mcp build            # tsc only, no renderer
pnpm --filter <name>-mcp typecheck        # belt + suspenders
node packages/demos/<name>-mcp/dist/smoketest.js
pnpm test                                 # full repo, confirm no regressions
```

If any step fails, fix before moving on. Do NOT proceed with broken artifacts.

### Step 7 — Update repo-wide docs

Three places, all small:

- **`README.md`** — bump the server count in the intro paragraph; add the new demo to the bullet list with a one-line pitch; add it to the monorepo layout tree; add a `pnpm --filter <name>-mcp start:http # :300X` line in the Quickstart commands.
- **`docs/trying-it-out.md`** — add a `node packages/demos/<name>-mcp/dist/smoketest.js` line to the smoke-test section; add the port to the port-map list; add a `### <Domain> demo` section between existing demo sections with a prompt-and-expectations table; add a Claude Desktop config block entry; add the new server to the port-list code blocks.
- **Root `package.json`** — add a `"demo:<name>": "pnpm --filter <name>-mcp start"` script in the `demo:*` block.

These updates are *not optional* — without them, the next person to try the repo won't know the new demo exists. The repo's discoverability is half what makes the project usable.

### Step 8 — Real-host validation

The smoketest passes. That's the floor, not the ceiling.

Run the new server against a real host (ChatGPT Apps via tunnel, Claude Desktop via stdio, or Slack if available) and ask the prompts that should trigger the new presets. Watch what the agent composes:

- **Lens looks structurally right + says useful things** → ship.
- **Lens looks structurally wrong** → preset prose is too vague. Refine the "Anchor (prescriptive)" or "Likely next turns" sections.
- **Lens looks right but agent gets affordances wrong for the state** → status-aware lifecycle in the preset is too implicit. Add an explicit table.
- **Agent ignores the preset entirely** → preset's `description` is too generic. Make it more specific so the agent picks it.
- **Agent transcribes preset values into the lens** → dataset leak in the preset. Audit Step 4 again.

Iterate until the lens consistently produces sensible output across 5+ prompts. Then commit.

---

## Common mistakes to avoid

- **Don't add mutation tools without explicit ask.** "List, get, drill-in" is the default surface for a read-only demo. Mutations need a justification (the user wants to demonstrate confirmation flows? OK, add cancel/update; otherwise skip).
- **Don't skip the interrogation.** Five minutes of questions saves an hour of rewrites.
- **Don't ship a preset that shadows a generic one.** If your `user-asked-about-a-Y` is structurally identical to the generic `user-asked-about-a-thing`, skip it. The runtime agent will compose against the generic one.
- **Don't forget the dataset-leakage audit.** Even if you wrote fictitious values from the start, double-check by `grep`-ing your JSON example values against `data.ts`. The audit caught leaks I didn't realize I'd written.
- **Don't ship without smoketest output.** The smoketest is your contract that the wiring is right; without it the next contributor has no fast feedback loop.
- **Don't update CLAUDE.md or AGENTS.md to mention your demo.** Those are stable orientation files. Your demo is *just another demo*; it gets a line in README and trying-it-out, not in agent-orientation files.

---

## Useful references inside this repo

- [`preset-authoring.md`](./preset-authoring.md) — the craft handbook. Read before Step 4.
- `packages/demos/incidents-mcp/` — the most complete and recent reference. Cross-domain (accounts + incidents), 8 presets, focused drill-in moments. Closest mirror for new demos with sub-resources.
- `packages/demos/orders-mcp/` — the canonical reference for confirmation flows and external-link patterns.
- `packages/demos/shoes-mcp/` — the canonical reference for browse-list / single-record / comparison without sub-resources.
- `packages/mcp-lens/skills/show-lens.md` — what the *runtime* agent reads. Useful to understand what the agent will already know without your preset.
- `docs/spec.md` — every node type and field in the lens spec.
- `docs/decisions.md` — the chronological log of why this repo's conventions are what they are. Read the recent entries (preset-authoring, dataset-leakage, MCP UI Apps spec adoption, closeOnClick, lens-first).

If something in this workflow contradicts those references, the references win — flag the contradiction to the user so we can update this skill.
