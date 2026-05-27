# Decisions

Chronological log of decisions made about this POC. When an entry in `open-questions.md` gets answered, it moves here.

Format: `## YYYY-MM-DD — Title`, then **Decision**, **Reasoning**, optional **Alternatives considered**.

---

## 2026-05-27 — Published packages must not leak `workspace:*` metadata

**Decision:** Published package manifests use registry-resolvable semver for cross-package dependencies. All three public packages were bumped to `0.1.1` so the first post-publish patch set can be installed as a coherent version. `@mcp-lens/server@0.1.1` depends on `@mcp-lens/sdk@^0.1.1` and `@mcp-lens/presets@^0.1.1`; it also exposes a `server` bin pointing at the stdio entrypoint so `npx -y @mcp-lens/server` works without `--package`. `@mcp-lens/presets@0.1.1` declares `@mcp-lens/sdk@^0.1.1` in peer/dev metadata. The repo keeps local development links by setting `link-workspace-packages=true` and `prefer-workspace-packages=true` in the root `.npmrc`.

**Reasoning:** The first npm publish left `workspace:*` in the public `@mcp-lens/server` manifest. `npx --package @mcp-lens/server mcp-lens-server` then failed during install with `EUNSUPPORTEDPROTOCOL: Unsupported URL Type "workspace:"`. npm registry consumers cannot resolve pnpm workspace protocol; publishable package metadata has to be valid from outside the monorepo. Because npm package versions are immutable, fixing the public install requires publishing new patch versions rather than replacing `0.1.0`.

**Concrete follow-up:** Publish `@mcp-lens/sdk@0.1.1` first, then `@mcp-lens/presets@0.1.1`, then `@mcp-lens/server@0.1.1`.

**Verification:** Packed both packages with npm using an isolated cache and inspected the tarball `package/package.json` files. Neither tarball contains `workspace:*`; the server tarball exposes the default `server` bin plus the explicit `mcp-lens-server` and `mcp-lens-server-http` bins.

## 2026-05-21 — SDK no longer ships memorialize; chrome is single-star; thumbs-down dropped

**Decision:** Three changes to the feedback loop, all coupled:

1. **The SDK stops shipping `memorialize_lens`.** Deleted `registerInMemoryMemorialize`, `InMemoryMemorializeStore`, `MemorializeStore`, and `RegisterMemorializeOptions` from `@mcp-lens/sdk`. Server authors define their own memorialize-style tool with whatever name and schema fits their server's identity model.
2. **Chrome is a single star (favorite) icon, not thumbs-up.** Renamed in `Chrome.tsx`. The thumbs-down button is gone entirely — feedback for "I don't like this view" is just the user typing in the next turn (the buttons-as-prompts invariant taken to its conclusion).
3. **Star clicks emit a follow-up prompt, not a direct tool call.** The widget never calls a memorialize tool directly. It asks the agent to (a) discover a memorialize-style tool by reading tool descriptions on the server, (b) call it with the description the agent already has in context, or (c) acknowledge in conversation if no such tool exists.

**Reasoning:**

- **Thumbs-up was overloaded.** It collapsed two distinct signals — "I liked this" vs "remember this for next time." Memorialization is the second; a star icon (favorite/save) is closer to that intent than a thumbs-up (approval).
- **Thumbs-down was a fig leaf.** The user can already tell the agent "I'd prefer different" by typing. Adding a button that emits a generic "user didn't like this" prompt didn't add expressiveness — it added another control to scan past.
- **The widget shouldn't call memorialize directly.** Buttons-as-prompts (the 2026-04-30 invariant) says every click goes through the agent, so the agent can mediate. Memorialization should follow the same rule — otherwise the SDK is shipping a privileged path the rest of the affordance system avoids.
- **The SDK has no business in identity.** Memorialization needs a stable user id. Server authors who already know who their users are (auth tokens, OS user, OAuth claims) are the right place to wire that. The previous `registerInMemoryMemorialize` shipped an `anonymous`-bucket default that worked for demos but was actively harmful as a starting point for real deployments — encouraged copy-paste of a multi-user-unsafe shape. Removing it forces server authors to make a deliberate choice.
- **Tool-name independence falls out for free.** The agent already discovers tools by description on every other surface. Treating memorialize the same way means there's no "memorialize_lens or bust" coupling — server authors name the tool whatever they want; the agent finds it.

**Concrete artifacts:**

- Removed: `packages/mcp-lens/src/tools/memorialize.ts`, its test file, all index re-exports.
- Updated: `Chrome.tsx` (star icon, no thumbs-down, `buildStarPrompt` helper), `Chrome.test.ts`.
- Updated: `skills/show-lens.md` — new "Chrome" subsection on the star prompt flow plus a discover-by-description rule; the session-flow steps no longer reference `memorialize_lens` by name.
- Updated demos: shoes-mcp and orders-mcp both stopped registering memorialize. shoes-mcp smoketest no longer round-trips it.
- `LensChrome.suppressFeedback` field name unchanged (renaming would be a wire-shape change, not worth the breakage).
- `chrome.suppressFeedback: true` still suppresses the (now single) star — same behavior, narrower meaning.

**Alternatives considered:**

- *Keep thumbs-up, just rename it to "save."* Cosmetic — the icon shape carries semantics; a thumbs-up icon labelled "save" is just confusing.
- *Inline the description into the prompt vs. let the agent pull from its own context.* Picked option (a) — embed the description verbatim in the star prompt — because not all super-agents reliably display widget-emitted prompts, and embedding the description makes the prompt self-sufficient. The agent reads it directly from the prompt regardless of host display behavior.
- *Ship a separate `star-feedback.md` skill.* Picked option (1) — fold into existing `show-lens.md`. Single skill stays simpler to read; the feedback flow is short.
- *Ship a default `memorialize_lens` tool on the SDK with a `getUserId` extension point.* Rejected. The default-anonymous shape was net-harmful (encourages copy-paste), and any honest default requires identity infrastructure we don't have. Server authors picking their own name and schema is the right floor.

**Tested invariants after this change:**

- `Chrome.test.ts` asserts the star prompt embeds the discovery-by-description instruction, references the description-the-agent-wrote, and includes the no-tool-found fallback.
- `mcp-lens-server` regression test now asserts no memorialize-shaped tool name leaks in.
- Skill regression test asserts the markdown mentions "star" (the new affordance term) instead of `memorialize_lens` directly.

---

## 2026-05-20 — Keep `@modelcontextprotocol/ext-apps`'s `App` import; bundle size is acceptable

**Decision:** Keep importing `App` and `PostMessageTransport` from `@modelcontextprotocol/ext-apps`. Do not switch to `app-bridge`, do not hand-roll the postMessage transport.

**Reasoning:** Investigated alternatives after the bundle grew from 220KB to 471KB raw / 130KB gzipped when we adopted the SDK.

- `app.js` (the canonical entry) is **33KB** raw on its own. The bulk of the 251KB growth is the *transitive deps* — `@modelcontextprotocol/sdk` Protocol class + zod schema definitions for the `ui/initialize` handshake messages.
- `app-bridge.js` is **43KB** raw — *bigger* than `app.js`, not smaller, because it ships a more complete bridge surface. Switching would add bytes, not remove them.
- A hand-rolled JSON-RPC transport would save ~70KB gzipped at the cost of becoming the maintainer of every wire-shape change in SEP-1865. The spec is still settling (we already saw one `ui/message` shape mismatch between spec and SDK); paying the SDK weight to inherit their maintenance is the right trade.

**Bundle size as of writing:** 496KB raw / 130KB gzipped. Acceptable for a POC; loud-but-defensible in a public README. If a real customer reports the gzipped budget as a problem we revisit; until then, the SDK weight pays for itself by keeping us spec-current.

**Tested invariants after investigation:** none changed; this is a "decide not to act" decision.

---

## 2026-05-17 — Independent convergence with Slack's shelved "SlackAIKit"; what we adopt, what we don't

**Context:** Slack folks shared their **SlackAIKit Component Specification** — an internal proposal for Slackbot dashboards that they prototyped and shelved. They're now going back to Block Kit for mobile reasons. Comment from them: *"if you can describe the schema as JSON schema, the LLMs can generate you the widgets very quickly and accurately... a lot fewer tokens than the equivalent HTML and you can control the look and feel in CSS."*

**This is a near-verbatim restatement of the MCP Lens thesis.** Two independent teams, no shared design conversation, both landed on the same primitives (rows/cols/cards/badges/buttons), the same "no raw HTML, no expression language" rules, and the same "JSON schema is enough for the LLM to compose accurate UI." Strong signal the design space has a natural shape and we're inside it.

**Where SlackAIKit went further than us:**

1. **Tier 1 / Tier 2 split.** They have *high-level* moment-shaped node types (`metric`, `stat_row`, `comparison`, `timeline`, `profile`, `fields`, `progress`, `status`) plus *low-level* primitives. Token-efficient at runtime — one `metric` node vs five primitives + layout. We approximate this through *presets* (markdown precedent the agent reads), which is more flexible per domain but more compositional work per turn.
2. **Design-token enforcement.** Strict "no raw CSS values" rule. All sizing/colors/spacing are named tokens (`xs|sm|md|lg|xl`, `success|warning|danger|info|discovery|secondary`). Explicit CSS-injection prevention. We're casual about this — agents *can* technically smuggle weirder values through string fields if they tried.
3. **`actions` with inline `confirm`.** Confirmation as a button affordance (`{title, body, ok, cancel, variant}`) rather than a separate lens. We do confirmations as a full new lens (`user-asked-to-cancel-an-order`), more flexible but heavier.

**What we adopt — none of it today, but tracked:**

- The Tier 1 / Tier 2 framing is interesting but doesn't earn its keep yet. Our presets fill the same role with more flexibility per domain. Revisit if we observe agent struggle on common moments.
- Design-token enforcement *is* worth tightening. Current spec leans on convention; a real schema-level lint pass that rejects raw CSS values is a one-day job and closes a real injection vector. **Not done; tracked in open-questions.**
- The `confirm` affordance pattern is appealing for *simple* yes/no confirmations and could ship as an addition to `ButtonNode` without breaking anything. Current implementation requires the agent to compose a full confirmation lens, which is fine but verbose. **Tracked in open-questions.**

**What we explicitly don't adopt:**

- **Their full Tier 1 catalog** — `metric`, `stat_row`, `comparison`, `timeline`, `profile`, `fields`, `progress`, `status` as first-class node types. Adding them all would balloon the spec; the agent already composes equivalent shapes from primitives + presets. We add specific high-level nodes case-by-case if a real demo shows the agent consistently failing the composition.
- **Their progress/timeline/profile shapes verbatim.** Even if we add high-level nodes later, the right shape is whatever falls out of moment-shaped presets in our domain demos, not a copy of their schema.

**The strategic signal we *do* take:** **mobile rendering is the wall MCP Lens will eventually hit.** Slack's reason for shelving was mobile: HTML in iframes is hard (viewports, native scroll/keyboard, accessibility, performance). Block Kit renders natively on iOS/Android. Two paths from here: (a) build a `LensSpec → Block Kit` translator (table is the lossy primitive); (b) accept being web-first and let mobile be follow-on. Not solving today; tracked.

**Side note on current Slackbot (not adopted):** Slackbot today uses AgentCore (Amazon code interpreter) to generate a per-request React dashboard, packaged as an SPA, served in a double-iframe sandbox. That's the "LLM-codes-the-widget" bet. Higher-fidelity output, much heavier infra (code interpreter, sandboxing, per-request build, security review). We deliberately bet that structured-composition is enough for the vast majority of conversational moments. Both bets work — theirs is the right answer if you need a custom React dashboard for a serious analytical session; ours is the right answer for the next-turn affordance loop.

**Where MCP Lens differentiates from SlackAIKit:** moment-shaped *presets* (not node types) that generalize across domains, per-server preset extension, and the standalone-Lens-on-an-unaware-server thesis (recipes-mcp + mcp-lens-server). SlackAIKit was for *Slackbot itself* generating UI; MCP Lens lets *upstream MCP servers* gain UI from a sibling connector — structurally a different distribution model.

---

## 2026-05-14 — Adopt the MCP UI Apps spec (SEP-1865); dual-emit for ChatGPT compat

**Decision:** Make MCP Lens spec-compliant with **MCP UI Apps (SEP-1865)** — the canonical extension that Claude, Slack, Postman, MCPJam, and others implement. Dual-emit the ChatGPT Apps legacy keys so the existing demo still works in ChatGPT during the transition.

**Concrete changes:**

1. **`show_lens` tool response.** The `_meta` now carries the canonical `ui: { resourceUri: 'ui://mcp-lens/renderer.html' }` shape. The legacy `_meta['openai/outputTemplate']` and `_meta['openai/widgetAccessible']` are still emitted, so ChatGPT continues to recognize the tool. The per-call `_meta['openai/widgetDescription']` stays — the spec has no equivalent for a per-call model-facing description, and ChatGPT relies on it; non-ChatGPT hosts ignore it.
2. **Resource registration.** The renderer resource (`ui://mcp-lens/renderer.html`) carries the same dual-keyed `_meta` on both the `resources/list` descriptor and each `resources/read` content item. MIME stays `text/html;profile=mcp-app` — already the canonical spec MIME, no change there.
3. **Renderer host bridge.** `host.ts` now tries the spec path first: instantiate `App` from `@modelcontextprotocol/ext-apps`, connect a `PostMessageTransport` to `window.parent`, run the `ui/initialize` handshake. Spec hosts deliver the spec via `ui/notifications/tool-result`; we read `structuredContent.spec` from the notification and feed it through the same classify/render pipeline we already had for `window.openai.toolOutput`. When the handshake fails (current ChatGPT, dev mode), the bridge falls through to the existing `window.openai` reader.
4. **Action methods.** `sendPrompt` routes to `app.sendMessage({role:'user', content:[…]})` on spec hosts, falling back to `window.openai.sendFollowUpMessage` on ChatGPT and a logged no-op in dev. Same pattern for `openExternal` (`app.openLink({url})` → `window.openai.openExternal({href})` → `window.open`).
5. **`closeOnClick` semantics on spec hosts.** SEP-1865 has no `requestClose` equivalent — teardown is host-initiated. On spec hosts the flag becomes a no-op (the next lens replaces the current one anyway); on ChatGPT it still calls `window.openai.requestClose()`. Documented in the host.ts comment for the function.

**Reasoning — what triggered this:**

- The recipes + Lens demo worked end-to-end in Claude Desktop (2026-05-12). Then we shipped the orders-mcp Slack app (2026-05-13–14) and saw `tool_call_success` events for `show_lens` in the Slack server logs but no widget rendered. The super agent diagnosed it: Slack's expected `[MCP_APP_DISPLAYED]` annotation wasn't coming back, meaning Slack received the tool result but didn't recognize anything as a UI to display. The ChatGPT-specific `_meta['openai/outputTemplate']` was invisible to Slack.
- Slack confirmed via internal channels that they're implementing the **MCP UI Apps spec** verbatim. Reading SEP-1865 (`specification/2026-01-26/apps.mdx` in `modelcontextprotocol/ext-apps`) revealed:
  - Canonical metadata key is `_meta.ui.resourceUri` (nested), not anything `openai/*`.
  - MIME is `text/html;profile=mcp-app` — same as we already use.
  - No window-level bridge in the spec; communication is JSON-RPC over `postMessage`. The reference SDK is `@modelcontextprotocol/ext-apps`, with an `App` class for the iframe side and `registerAppTool` / `registerAppResource` helpers for the server side.
  - The handshake is `ui/initialize` → host returns capabilities + context → iframe sends `ui/notifications/initialized`.
  - Tool results arrive via `ui/notifications/tool-result` (carrying `structuredContent`).
  - Iframe-to-host actions: `ui/message` (send a chat message), `ui/open-link` (external URL), `ui/request-display-mode` (inline/fullscreen/pip). **No `requestClose`.**
- Conclusion: the Slack failure isn't fixable with a tweak to the existing wire shape. The right move is to adopt the spec as the canonical path, keep ChatGPT support via dual-emit, and let the spec-compliant hosts (Claude, Slack, future) Just Work.

**Why dual-emit instead of canonical-only:**

The spec doesn't address ChatGPT's legacy keys, but ChatGPT is one of our two validated hosts and the existing demo flow there is working. Removing the `openai/*` keys would break ChatGPT for zero gain — they cost almost nothing and are obviously legacy. We expect ChatGPT to migrate to the canonical keys eventually; when they do, we drop the legacy emit. Until then, both hosts read what they read.

**Why we still ship `openai/widgetDescription`:**

The spec has no per-call model-facing description field. ChatGPT uses our description to narrate the lens to the model after the widget renders — it's load-bearing on ChatGPT and harmless on hosts that ignore unknown `_meta` keys. We may eventually propose a spec extension for this, but for now we keep the ChatGPT key and live with it.

**Bundle size impact.** The renderer bundle grew from 220 KiB to 471 KiB (+251 KiB) — the App SDK plus its zod-validated spec schemas. Acceptable for a POC but worth tracking. If it becomes a problem we can swap to the lighter `app-bridge` entry point or build a hand-rolled JSON-RPC transport in `host.ts`. For now, having the spec's exact validation logic on our side is worth the weight.

**Testing.** All 102 tests still pass. Schema test extended to assert both canonical and legacy `_meta` keys on the tool response. Smoke tests on all four servers green.

**What this leaves open:**

- Real-world Slack rendering — needs verification. We've shipped the change but haven't yet observed Slack actually firing `[MCP_APP_DISPLAYED]` and rendering the widget. Next test cycle.
- ChatGPT regression risk — dual-emit means ChatGPT still gets the keys it always read, so this should be a no-op for ChatGPT, but worth a quick sanity pass.
- The `closeOnClick` no-op on spec hosts is a small UX regression: comparison decisions and confirmation dialogs will leave the widget on screen until the next lens replaces it. Acceptable but not ideal. If users notice we propose a spec extension for `ui/request-close`.
- We're still routing Slack auth as Option D (no auth, static header). When write-tool support arrives in Slack Phase 1, we'll need Option C (Slack Identity-Based Auth) to map `_meta.slack.user_id` to per-user state. Tracked in open-questions.

---

## 2026-05-11 — `closeOnClick` on buttons, prompt-unambiguity rule, lens-first skill, route-to-browse for ambiguous comparisons

**Decision (one batch — three changes that landed together because they fall out of the same observation):**

1. **Add an optional `closeOnClick: boolean` field to `ButtonNode`.** When true, the renderer asks the host to dismiss the widget after emitting the prompt (\`window.openai.requestClose\`). Hosts without a close capability silently no-op. Use it on **decisive** clicks where the moment is clearly over: "Pick the X" buttons in a comparison (the choice is final), confirmation-dialog buttons (the user has decided). Leave it default (omitted/false) on **transitional** clicks where the next lens supersedes the current one anyway: "Details" buttons in a browsing list, "See similar" lateral moves.

2. **Skill rewrite — lens-first by default.** Added a "Default to lens" section at the top of \`packages/mcp-lens/skills/show-lens.md\`. When the user is looking at structured data on this server's domain, the agent's *default* response is a lens, not prose. Plain prose is the fallback for chatter and explanations, not the default for showing data. The skill also reframes "when to call show_lens" with a lower bar: *any time the user is looking at structured data, the answer is a lens.*

3. **Prompt-unambiguity rule baked into the skill and presets.** A button's \`prompt\` arrives at the next turn alongside the conversation history but **not** the rendered lens — the prompt has to make sense on its own. Two consequences encoded in the skill and every preset:
   - **Always name the thing in the prompt.** \`"See similar."\` is broken; \`"Show me other carbon-plate racers like the Vaporfly 3."\` is correct.
   - **Never write prompts that depend on a choice the user hasn't made.** A "Compare with another" or "Add another to compare" button whose prompt is \`"Add another shoe to this comparison."\` fabricates: *which* shoe? You don't know, and neither does future-you when the prompt comes back. Route the user to a browseable list instead — \`"Show me racing shoes I could compare the Vaporfly 3 against."\` — let them pick from the next lens, then compose the comparison once the second item is real.

**Reasoning — what triggered this:**

- Real-world ChatGPT testing showed lenses landing correctly when invoked, but the agent rarely chose to call \`show_lens\` voluntarily. The user repeatedly had to type "please always use show_lens" to opt in. The skill's tone ("call show_lens when…") was permissive when it needed to be a default. Flipping it to lens-first removes the friction without forcing every response into a widget.
- A second observed failure: the agent generated buttons like "Compare with another" / "Add another to compare" whose prompts asked for an unspecified addition. When clicked, the agent had to fabricate a second shoe out of thin air — wrong almost every time. The fix isn't to drop the affordance (the user *does* want to compare with something else); it's to route the next turn through a browse list so the user picks the second item before the comparison is composed.
- A third observed quirk: after a decisive click ("Pick the Vaporfly", "Yes, cancel order"), the comparison or confirmation dialog stayed on screen indefinitely. Adding \`closeOnClick\` lets the agent mark the moment as over so the widget dismisses; the agent's next turn renders the *next* moment cleanly without a stale dialog hanging behind it.

**Why ship them in one batch:** all three issues are facets of the same insight — *a lens is one beat of a conversation, not a static surface*. A lens should appear when the user is looking at data, end on prompts that make sense out of context, and disappear when the moment is over. Each change is small in isolation; together they tighten the conversational loop the project is built around.

**What changed where:**

- **Spec + types.** \`packages/mcp-lens/src/spec/types.ts\` — \`ButtonNode\` gains \`closeOnClick?: boolean\` with detailed JSDoc. \`packages/mcp-lens/src/spec/schema.ts\` — \`buttonNodeSchema\` accepts \`closeOnClick: z.boolean().optional()\`.
- **Renderer.** \`renderer/src/host.ts\` — new \`closeWidget()\` helper calls \`window.openai.requestClose()\` if available, otherwise no-ops. \`renderer/src/components/Button.tsx\` — calls \`closeWidget()\` after \`onPrompt\` when \`node.closeOnClick\` is true.
- **Skill.** \`packages/mcp-lens/skills/show-lens.md\` — "Default to lens" section added; "When to call show_lens" lowered the bar; \`button\` documentation gained the prompt-unambiguity rule and \`closeOnClick\` semantics; worked examples updated (decisive picks set \`closeOnClick\`, "Compare with another" routes to browse); "Common mistakes" gained three new entries.
- **Presets.** All three preset files updated: \`packages/demos/shoes-mcp/src/presets.ts\`, \`packages/demos/orders-mcp/src/presets.ts\`, \`packages/mcp-lens-server/src/presets.ts\`. Comparison presets now use \`closeOnClick\` on Pick buttons and route the secondary "compare with a different X" button to a browse list. The orders cancel-confirmation preset uses \`closeOnClick\` on both buttons. The detail preset's "Compare with another" button now routes to browse.
- **Tests.** New schema test (\`accepts a button with closeOnClick\`) added to \`packages/mcp-lens/src/spec/schema.test.ts\`. All 102 tests pass; smoke tests for all four servers pass.

**Out of scope here (deliberately):**
- A test that exercises \`closeWidget()\` in the renderer was not added — \`window.openai.requestClose\` is a host capability without a meaningful unit-test surface; the existing \`Button\` rendering tests cover the click path. If host behavior diverges (e.g. throws), the runtime logging in \`closeWidget\` will surface it.
- No skill regression test asserts the new "lens-first" framing; the existing skill tests check structural invariants ("next turn", "affordance", "per-row") that remain valid. We may add a "default to lens" assertion if drift becomes a problem.
- The agent's behavior in real ChatGPT is the actual verification surface for these changes. They've been built to ship cleanly; observation in production is the next loop.

---

## 2026-05-11 — Standalone `mcp-lens-server` package + Lens-unaware `recipes-mcp` demo

**Decision:** Ship two new packages to validate the "MCP Lens helps agents render lenses on top of upstream servers that don't know about Lens" thesis.

1. **`packages/mcp-lens-server/`** — a standalone MCP server that exposes only the lens machinery: `show_lens`, `list_lens_presets`, `get_lens_preset`, the renderer resource, the lens-authoring skill resource. No domain knowledge, no `memorialize_lens` (deferred until the standalone server gets an auth/identity story), no custom-preset configuration (also deferred). Ships a built-in pack of three **domain-blind moment-shaped presets**: `user-asked-about-a-thing`, `user-is-browsing-things`, `user-is-choosing-between-things`. Stdio + HTTP entrypoints. Published as `mcp-lens-server`.

2. **`packages/demos/recipes-mcp/`** — a deliberately Lens-unaware MCP server. Plain `@modelcontextprotocol/sdk` + `zod`, **no `mcp-lens` dependency**. Three tools (`list_cuisines`, `search_recipes`, `get_recipe`) over a hand-authored five-recipe catalog modeled after the screenshot the user shared. `get_recipe` accepts an optional `servings` argument to rescale ingredient quantities — this is the recipe-domain affordance the agent will discover and offer ("Make for 4") without any Lens-side hint that it exists.

**The demo this enables.** Configure both servers as connectors in the MCP host. The agent sees:

- Recipe data tools (from `recipes-mcp`).
- Lens tools and generic moment presets (from `mcp-lens-server`).

The agent can browse, view, and compare recipes, and lens its responses using only the generic presets. The recipe server gets rich UX without a single line of Lens-aware code.

**Reasoning:** the existing demos (`shoes-mcp`, `orders-mcp`) are integrated demos — Lens awareness is baked into the server itself. Useful for showing what server authors *can* do, but they don't validate the more transformative thesis: that an end user can install a single connector (the standalone Lens server) alongside any MCP server they already use and unlock rich next-turn affordances without the upstream server doing anything. The recipes + standalone-Lens pair is the only configuration that validates this end-to-end.

**Why a recipe domain.** The user shared a screenshot of an Anthropic-styled recipe app showing exactly the moment-shapes we're trying to generalize: a hero image, a "Servings" stepper, structured ingredients, ordered steps. Recipes give us:
- Multi-image cards (hero photography is meaningful).
- A natural "Make for N" affordance via ingredient rescaling — proves the agent can discover and offer domain-specific verbs from generic presets.
- Filterable categories (cuisine, tags, total time) for browsing.
- Real comparison fields (time, servings, dietary fit, difficulty) for choosing.

A different domain would have worked but the screenshot gave us a concrete reference target.

**Why no `memorialize_lens` in the standalone server (yet).** The whole point of memorialize is per-user persistence; the standalone server has no auth tier yet, so identity is undefined. The library's memorialize support remains intact for *integrated* servers (shoes/orders) where the server author wires their own identity. Adding it to the standalone server is a Phase 1 polish item — see open-questions.md.

**Why no configurable presets (yet).** Same reason — Phase 1 polish. The current standalone server ships its three presets and you get what you get. A `--presets <path>` flag and an extension story are easy to add later; the priority right now was validating the *thesis* (does the agent compose useful lenses for unaware data with only domain-blind presets?).

**Tested invariants:**
- recipes-mcp has zero `mcp-lens` references in `package.json` or source. `grep` confirms.
- `recipes-mcp/dist/smoketest.js` exercises every tool including `get_recipe(id, servings=4)` rescaling.
- `mcp-lens-server` has 8 server-level tests including: exposes `show_lens`/`list_lens_presets`/`get_lens_preset`, does NOT expose `memorialize_lens` (regression-locked), exposes both resources, lists exactly three named presets, every preset body is non-trivial, browsing preset calls out per-row buttons, choosing preset requires per-item Pick buttons.
- 101/101 across 10 test files. Build clean. Typecheck clean.

**What this leaves open:**
- Generic presets for moments not yet shipped: `user-asked-for-irreversible-action`, `user-needs-clarification`, `we-are-partway-through-something`. Ship as needed.
- Standalone-server auth/identity story for memorialize (open-questions.md).
- Standalone-server custom-preset extension story (open-questions.md).
- Hosted standalone server (vs. self-hosted via `npx`). Privacy story TBD.

---

## 2026-05-10 — A lens is a next-turn suggestion surface; presets are moment-shaped

**Decision (reframe of what MCP Lens *is*):** A lens is **a suggestion surface for the user's next turn** — visualizing data is the anchor, but the point is the affordances. Every meaningful turn should end with 2–4 one-click follow-ups so the user advances the conversation without typing. Lists must include per-row buttons.

This is a framing change, not an engine change. The spec, the renderer, the tools — all unchanged. What changes is how we *teach* the agent to compose lenses (the skill) and how presets are organized (by conversational moment, not data shape).

**Reasoning — what triggered the reframe:** the user observed lenses landing in ChatGPT that *displayed* the right data but *didn't help advance the conversation*. The most common failure mode: a list of products with no per-row buttons, forcing the user to type "show me the second one" when a click should have been one millimetre away.

Sitting on the realization, the better mental model is:

- The agent's job is to predict the small set of next-turn moves the user will likely want, and render them.
- The data is the anchor — it gives the affordances context — but the affordances are the product.
- A bare card or list without follow-ups is a billboard: pretty, but stuck. The point of MCP Lens is not the visual; it's the *unblocking* of the next move.

**Changes shipped together as this reframe:**

1. **Skill rewrite (`packages/mcp-lens/skills/show-lens.md`).** Reorganized around "what's the user likely to want next, and have I made it one click away?" Added the 2–4 affordance rule as the new core invariant. Added explicit guidance on per-row buttons in lists. Reframed the worked examples as moment-shapes (user asked about one thing / user is choosing / user is browsing / user asked for an irreversible action / mixed buttons-and-links).

2. **Skill regression tests** (`src/skill.test.ts`). New assertions check that the skill mentions "next turn", "affordance", the "2–4" rule, and "per-row" buttons in lists. If anyone simplifies these out of the skill, tests fail.

3. **Demo presets renamed and rewritten.** Both demos drop their data-shape preset names and adopt moment-shape names:
   - `shoe-detail` → `user-asked-about-a-shoe` (with explicit 2–3 follow-up buttons).
   - `shoe-comparison` → `user-is-choosing-between-shoes` (with one "Pick this one" button per item).
   - `shoe-list` → `user-is-browsing-shoes` (each row gets "Details" and "Compare" buttons).
   - `order-summary` → `user-asked-about-an-order` (status-appropriate affordances).
   - `order-list` → `user-is-browsing-orders` (per-row "Details" buttons).
   - `cancel-confirmation` → `user-asked-to-cancel-an-order` (was already moment-shaped; just renamed).

   Each preset's prose now explicitly names the moment, the likely next turns, and the affordance set. Structural skeletons unchanged where they were already correct; the choosing preset added a "Pick this one" button row, the browsing preset added per-row "Compare" buttons, and the detail preset expanded from one button to two-or-three.

4. **No code change.** Spec, renderer, tools, schema, package APIs — all unchanged. This is a *teaching* reframe, not an engine change.

**Why presets organize by moment, not by data shape:** the original presets ("shoe-detail", "shoe-list", etc.) read like "here's how to render N shoes." That was domain-shaped on the inside but data-shaped on the outside. The new naming makes the conversational fit explicit: "the user is *choosing* between shoes" describes a *moment*, and the moment dictates both the anchor *and* the affordances. This generalizes cleanly across domains — the same moment shapes (asked about one / is choosing / is browsing / asked for an irreversible action) recur in commerce, CRM, calendar, anywhere people interact with structured data.

**Implication for the future generic preset library:** when we ship the standalone `mcp-lens-server` for Market A (Phase 1 of the broader plan), its preset pack will be domain-blind versions of these same moments. The server author writes the data; the moment-shapes carry over.

**Implication for downstream demos and adoption:** if a server author follows this pattern, their lenses naturally invite the user to keep the conversation moving through clicks. That's the actual product.

---

## 2026-05-08 — Server `instructions` field stays short; full skill lives only in the resource

**Decision:** The demo servers' `instructions` field on the `initialize` response is a short orientation paragraph (~500 bytes) — not the full 15KB lens skill. The skill is exposed exclusively via the MCP resource `skill://mcp-lens/show-lens`, which the demos already register via `registerLensSkillResource`.

**Reasoning:** The original demos interpolated `getLensSkill()` into `SERVER_INSTRUCTIONS`, shipping ~16KB of markdown on every connection's initialize response. The HTTP transport on ChatGPT happened to tolerate this. The stdio transport on Codex Desktop did not — the connection appeared to succeed (no error) but the agent never used the tools. Likely cause: client-side limits on the `instructions` field, either silently truncated or used as-is, blowing past whatever per-server budget the host allocates for system context. There is no error path because clients aren't required to surface "your server is too verbose."

**Diagnostic signal that drove this fix:** sending an initialize request to the stdio binary directly returned a 16KB+ JSON-RPC response with the entire skill embedded in `instructions`. Reference servers in the wild use no instructions field at all and let agents discover behavior via tool descriptions and resources; our demos were over-providing context at the wrong layer.

**Rule:** the `instructions` field is for *orientation* (what tools exist, what they're for, how to discover the rest). Long-form authoring guidance, vocabulary references, and worked examples belong in MCP resources, where the agent can fetch them on demand and the client doesn't pay the cost on every connect.

**Tested invariants after change:** instructions field is ~530 bytes; `skill://mcp-lens/show-lens` is still listed in `resources/list` with `text/markdown` MIME type; tests still pass.

---

## 2026-05-08 — Read only `window.openai.toolOutput`; subscribe to `openai:set_globals`

**Decision (two related changes):**

1. **The renderer reads `window.openai.toolOutput` only.** No fallback to `toolInput`. (The `__mcpLensDevOutput` dev-only path remains for standalone mode.)
2. **The renderer subscribes to `openai:set_globals` events** instead of one-shot polling. The host fires this event whenever any of `toolOutput`, `toolInput`, `widgetState`, `toolResponseMetadata` changes; we re-read on each event and only re-render when our own `toolOutput.spec` actually differs from the last one we drew.

**Reasoning — diagnosed from real iframe console output:**

The earlier `toolInput` fallback was meant as a defense for hosts that populate `toolInput` instead of `toolOutput`. In practice on ChatGPT Apps, `toolInput` is the args of *whatever tool is currently being invoked* — which, after a button click on a still-mounted widget, is a *different* tool that the agent just fired (often another `show_lens`, but potentially anything). Reading `toolInput` mid-streaming caught a partially populated object: the agent had begun emitting `{ specVersion: "0.1", ...rest pending... }` and we read `{ specVersion: "0.1" }` only. Zod then rejected it as a malformed lens, the widget showed "Invalid lens spec: root.children: Required" — on a spec the agent had actually never finished sending.

A reference implementation we had access to reads `toolOutput` only and subscribes to `openai:set_globals` for live updates. The SDK chat layer's `accessToolOutput()` is `() => window.openai.toolOutput`. Matching that pattern fixes the bug.

**Why subscribe instead of polling:** the renderer used to poll `window.openai` 20× at 50ms then give up. After load, no further reads. That meant a button click on a still-mounted widget couldn't re-render even if the host *did* deliver fresh `toolOutput` for our own next response. Subscribing to `openai:set_globals` is the SDK-blessed way to receive live updates, with deduplication on the spec identity to avoid rerendering on unrelated bridge changes.

**Behavior change on stale widgets:** when polling times out without a fresh `toolOutput`, the renderer no longer flips to a "host didn't deliver" error. It logs and stays put — the previous lens (if any) remains visible, or the loading state holds. This keeps button-click follow-ups from clobbering a working widget with a confusing error message while ChatGPT is busy invoking unrelated tools.

**Diagnostic signal that drove this fix:** the iframe console showed:
```
source: window.openai.toolOutput {type: "null"}
source: window.openai.toolInput {type: "object", keys: ["description","spec"]}
classify: window.openai.toolInput ok — spec keys ["specVersion"]
zod validation FAILED — full received spec was: {specVersion: "0.1"}
```
Two facts together — (a) `toolOutput` was null, (b) `toolInput` had only `{specVersion}` populated — proved the data was a *streaming-in-progress* read from another tool, not stripped data. Lesson: the heavy `[mcp-lens]` console logging earned its keep on the second real-world bug after it was added.

---

## 2026-05-08 — Drop `outputSchema` entirely; ship plain nested objects in structuredContent

**Decision:** `show_lens` publishes **no `outputSchema`**. `structuredContent` ships `{ spec: <nested object> }` directly. The renderer reads it from `window.openai.toolOutput.spec`.

**Reasoning — the diagnosis we should have had three iterations ago:** the `outputSchema` was the cause, not the protection. A working reference implementation we had access to ships `view`/`state` as deeply nested objects in `structuredContent` and ChatGPT delivers them intact end-to-end — with no `outputSchema` declared on the tool. We had one. ChatGPT was enforcing the JSON Schema we published on the data it handed to the iframe, and that enforcement was stripping nested fields when the schema couldn't perfectly express the recursive lens tree (which it can never quite do, for any zod-generated schema over a discriminated-union recursive type).

**The progression of wrong answers we walked through:**

1. `spec: z.unknown()` → property with no subschema → host stripped every nested field of `spec`.
2. `spec: z.record(z.string(), z.any())` → `{ "type": "object", "additionalProperties": {} }` → host preserved top-level keys but still stripped some nested arrays/records (e.g., `items[N].values` inside a table).
3. `specJson: z.string()` → host enforced "this is a string" → bypassed schema enforcement, but added a serialization layer and reverse-encoded the agent's data into an opaque string the widget then had to re-parse.

The right answer was **0**: don't publish an `outputSchema`. The MCP spec lists `outputSchema` as optional. ChatGPT promotes `structuredContent` to `window.openai.toolOutput` whether or not we declare it. Declaring it only invites enforcement.

**What I missed earlier and should have caught:** I assumed `outputSchema` was required for the `toolOutput` promotion. That assumption never had evidence behind it — I extrapolated from "things stopped working when I added it" to "the schema must be making it work." The reference implementation I had access to falsifies that assumption directly, and I had access to it the whole time.

**Operational fixes shipped together with the schema removal:**

- `host.ts` and `App.tsx` now log every step of the load path with a `[mcp-lens]` prefix. The iframe console tells the whole story: bridge inspection, source classification, raw payload keys, zod validation result, render decision. When the widget misbehaves we can read the iframe devtools console and see exactly which step lost the data — instead of guessing across a transit layer we don't control.
- The renderer's classifier no longer accepts the `specJson` legacy path. The wire shape is exactly one thing: `{ spec: <object> }`.
- A new regression test (`does NOT publish an outputSchema`) fires on `tools/list` and asserts `outputSchema === undefined`. Anyone tempted to "improve" the contract by adding a schema fails the test and reads the comment explaining why.

**General principle (worth internalizing):** before patching a symptom by adding constraints, look for a working reference and check whether *fewer* constraints solve the problem. We added `outputSchema` to be helpful, watched it break things, and kept iterating on the schema to compensate. The simpler answer was to remove it.

---

## 2026-05-06 — Ship the spec as a JSON-encoded string (`specJson`) — *superseded*

Superseded by the 2026-05-08 decision to drop `outputSchema` entirely. The full original entry, including the three-step progression of wrong wire shapes and the diagnostic signal that still applies to any tool exposing nested structuredContent, is preserved at [`decisions-archive.md`](./decisions-archive.md).

---

## 2026-05-05 — `outputSchema.spec` must be a concrete object type (not `z.unknown()`) — *superseded*

Superseded twice: first by the `specJson` workaround, then by removing `outputSchema` entirely. The full original entry, including the diagnostic-signal section that still applies for any future tool exposing nested-object structuredContent, is preserved at [`decisions-archive.md`](./decisions-archive.md).

---

## 2026-05-05 — `show_lens` errors must be agent-recoverable

**Decision:** Every invalid call to `show_lens` returns a structured, actionable error as a normal tool result (`isError: true`), never a thrown exception, never a raw zod dump, never a half-rendered widget. The goal is that the next call can succeed.

**Principle:** the agent is the lens author. Agents compose structured data imperfectly; they transpose field names, use stale type names, forget required fields. Our error path is an API surface for the retry loop, not a fault condition.

**Structure of every spec error:**

1. **Headline** — *"Could not render lens — the `spec` did not match the lens schema (v0.1). No widget was shown; call `show_lens` again with a corrected spec."*
2. **Problems (N):** — a numbered list of up to 8 concrete zod issues with paths (`root.children.2.prompt: Required`). Overflow as *"and N more similar issue(s)."*
3. **Likely fixes:** (when recognizable) — specific remediations. Cases detected:
   - Retired type names (`comparison` → `table`). Names the *exact path* where the retired type appears.
   - Bare node at root (agent passed `{ type, ... }` instead of `{ specVersion, root }`). Explains the wrapper.
   - Missing `specVersion` at root. Calls it out directly.
   - Unknown node types anywhere in the tree, with the full valid-type list.
4. **Minimal valid lens** — a tiny complete example (`{ "specVersion": "0.1", "root": { "type": "text", "text": "Hello" } }`) the agent can anchor on.
5. **Pointers** — `skill://mcp-lens/show-lens` for full reference, `list_lens_presets`/`get_lens_preset` for precedents.

**Description errors** (empty/whitespace-only) get their own formatted message that names both `spec` and `description` as required, explains what the description is for (model-facing metadata, memorialization signal), and shows an example description.

**No widget on error.** `structuredContent`, `_meta['openai/outputTemplate']`, `_meta['openai/widgetDescription']` are all absent. Agents must not see a half-valid widget — that would encourage rendering broken UIs instead of fixing the call.

**Implementation notes:**

- The input schema is deliberately permissive (`z.string()` not `z.string().min(1)`) so the MCP SDK doesn't short-circuit our error formatting with its own generic zod dump.
- `detectLikelyFixes` walks the *raw* input (not the validated spec, since validation failed) to find patterns. Conservative — only hints when confident.
- `RETIRED_TYPES` is a single dictionary. Future renames add one entry; the hint text is generated.

**Tested:** retired-type detection, bare-node-at-root, unknown-type-with-path, preset pointer presence, no-widget-on-error, non-object spec inputs (null/string/array/number) all recover cleanly instead of throwing.

---

## 2026-05-05 — Refine "missing" vs. "malformed": a missing `spec` field means another tool, not corruption

**Decision:** In the renderer's host-bridge classifier (`readToolOutput` → `classify`), an object that lacks a `spec` field is **missing**, not malformed. Only a *present but wrong-typed* `spec` value counts as malformed.

**Reasoning:** ChatGPT Apps reuses `window.openai.toolInput` and `window.openai.toolOutput` across tool calls within the same conversation. When the agent fires a different tool (e.g. `search_shoes` with `{ brand: "Asics" }`) while our lens widget is still mounted, that tool's args appear on the bridge. Our old classifier flagged this as "malformed" and produced a diagnostic: *"window.openai.toolInput has no `spec` field."* That error was wrong — the payload wasn't corrupt, it just belonged to someone else. The right response is to fall through to the next source in the chain.

**Rule encoded in `classify`:**

- `undefined`, `null`, or an object without a `spec` field → **missing** (fall through / keep polling).
- A non-object primitive (string, number, boolean) → **malformed** (host-contract violation, surface immediately).
- An object with a `spec` field that isn't an object (null, string, number) → **malformed** (the spec is broken).
- An object with a valid-looking `spec` → **ok**.

**Tested invariants:** a foreign object on `toolOutput` falls through to `toolInput` and recovers; a foreign object on `toolOutput` with no fallback returns plain "missing"; a genuinely broken `spec` still fails fast.

---

## 2026-05-05 — `show_lens` input/output asymmetry; `null` is "missing"

> **Note (2026-05-08):** the original title of this entry included "`outputSchema` is required," which was reversed by the 2026-05-08 decision to drop `outputSchema` entirely. The asymmetry rule (input has both `spec` and `description`; output's `structuredContent` carries `spec` only) and the null-is-missing rule both stand. Title updated to reflect what's still in force.

**Decision (two related changes to `show_lens` + host bridge that are still in force):**

1. **The tool's input and output are deliberately asymmetric.**
   - Input: `{ spec, description }`.
   - Output (in `structuredContent`): `{ spec }` only.
   - The description lives in `_meta['openai/widgetDescription']`, not in `structuredContent`. It's agent/model-facing metadata; the widget doesn't need it.

2. **The renderer's host bridge treats `null` at any source as "missing," not "malformed".** ChatGPT Apps pre-populates `window.openai.toolOutput` as `null` before the tool response arrives; treating null as a structural error fires a permanent diagnostic on every cold start. The fix: `null`/`undefined` → keep polling (and try the next source in the fallback chain); non-null wrong-shape → fail fast.

**Reasoning:**

- **Why asymmetry.** The description serves two non-widget purposes: narration to the user (model-facing) and preference-memorialization signal. Neither is useful to the renderer. Keeping it out of the structured output narrows the surface the widget depends on and makes the `toolOutput` payload minimal.
- **Why null-is-missing.** Observed behavior — the null pre-population is a host convention, not a contract violation. Making the renderer tolerant of it is how production-grade bridges handle this kind of thing.

**In retrospect — the broader principle** (captured for future node types that may also cross this boundary): input may legitimately carry fields the output shouldn't. The server controls both sides and can translate between them to preserve backward compatibility on the agent-facing input while keeping the widget-facing output focused. Treat the tool response as a *surface*, not a mirror of the input.

**Testing:** the host-bridge tests now explicitly cover `toolOutput === null` (must fall through) and `toolOutput === null` with a `toolInput` fallback (must recover). The show_lens test asserting the old `structuredContent: { spec, description }` shape was updated to `{ spec }` only.

---

## 2026-05-05 — Spec includes a `link` node for external navigation

**Decision:** The spec includes a `link` node for external navigation. Clicking opens the `href` via the host's external-open capability (`window.openai.openExternal` on ChatGPT Apps), with `window.open(..., '_blank', 'noopener,noreferrer')` as a fallback. The zod validator enforces `http://` or `https://` on `href`; other schemes (`javascript:`, `data:`, `file:`, etc.) are rejected.

Links have two variants: `standalone` (default) renders as a button-shaped control with an external-arrow icon; `inline` renders as a text-flow hyperlink.

**Reverses:** the earlier stance that "all actionable elements must be buttons emitting follow-up prompts." That rule still applies to anything the user could express in words — cancellation, comparison, navigation within the conversation. But it was too strict for genuine external destinations (carrier tracking URLs, product pages, supplier PDFs, invoices). Those aren't "things the user could have typed"; they're navigation out of the conversation. Forcing them through follow-up prompts was ceremony without purpose.

**Rule the agent follows (captured in the skill):** use `button` when the action is a thing the user could type. Use `link` when the destination is a URL that genuinely belongs outside the conversation. If unsure, prefer `button` — the agent can always turn a prompt into a link if needed.

**Safety posture:** external open is host-mediated so the host can apply policy (link preview, warning dialogs, allowlists). The fallback uses `noopener,noreferrer` to prevent tab-hijacking via `window.opener`. The iframe never navigates itself (`target="_blank"` is belt-and-suspenders for middle-click/ctrl-click; the `onClick` handler preempts default anchor navigation in normal clicks).

**Alternatives considered:** (a) extend `button` with an optional `href` that switches it to navigation mode — rejected because it blurs two orthogonal semantics; (b) rely on markdown inline links for everything — rejected because `link` as a first-class node is needed for standalone visual treatment; (c) add a `navigate` node type — rejected because `link` is the universally understood name.

---

## 2026-05-04 — Rename `comparison` → `table`

**Decision:** The node formerly known as `comparison` is renamed to `table`. Shape unchanged: `fields` are rows, `items` are columns, `highlightDifferences` flag optional. TypeScript type renames: `ComparisonNode` → `TableNode`, `ComparisonField` → `TableField`, `ComparisonItem` → `TableItem`. CSS class prefix renamed `lens-comparison-*` → `lens-table-*`.

**Reasoning:** `comparison` named the *use case* (the act of comparing); `table` names the *structure* (a fields-by-items grid, which is what we actually have). The node is structurally a table; calling it a comparison was misleading for structured views that aren't specifically comparisons (e.g., a key-value summary, a spec sheet). `table` reads correctly across both uses.

**Field names kept as `fields`/`items`:** deliberately *not* renamed to `columns`/`rows`. Our table has an unusual orientation (fields as rows, items as columns) — naming them `columns`/`rows` would imply the standard orientation and confuse the agent. The skill now explicitly calls out the orientation.

**Alternatives considered:** (Option B, which we rejected) generalizing to `{ columns, rows }` in standard orientation with arbitrary cell types — would have covered more use cases but at the cost of losing the tuned comparison shape (image + subtitle on item headers) and adding surface area without a concrete second use case. YAGNI. If and when a second tabular use case appears, we add it then.

---

## 2026-05-02 — POC scaffold decisions (made during implementation)

Batch-decided at the start of implementation, once conceptual design was locked:

- **Package manager:** pnpm workspaces. Chosen for fast install, native workspace support, and strict hoisting behavior. Lockfile is `pnpm-lock.yaml`.
- **Language:** TypeScript everywhere. Strict mode on, with `exactOptionalPropertyTypes` off (it conflicts with zod's inferred optional types). `noUncheckedIndexedAccess` on.
- **Renderer hosting:** the renderer bundle is **inlined into `mcp-lens`** at build time (Vite + `vite-plugin-singlefile` → one HTML → bundled as a TypeScript string constant). No public hosting dependency. Shipping the bytes means zero infra to run the POC, and the bundle is small enough (~65KB gzipped) that the cost is acceptable.
- **Demo count for v1:** two — `shoes-mcp` (shopping/comparison) and `orders-mcp` (transactional/confirmation). Different enough to exercise both display-oriented and action-oriented patterns, including the `chrome.suppressFeedback` path.
- **Skill format:** markdown file (`packages/mcp-lens/skills/show-lens.md`) loaded via `readFileSync` at runtime. Chosen over an inline string so the skill is easy to edit and review; cost is a filesystem dependency at load time, mitigated by caching.
- **Transport for demos:** both stdio (`dist/stdio.js`) and streamable HTTP (`dist/http.js`). Stdio for local clients (Claude Desktop, CLIs); HTTP for ChatGPT Apps, which requires HTTPS and the streamable HTTP transport.

---

## 2026-04-30 — Standalone repo

**Decision:** Build the entire POC as a standalone repo. No shared code with any external reference framework. Copy ideas if useful, not code.

**Reasoning:** The thesis benefits from a minimal, from-scratch proof. Production-grade frameworks (data providers, expression languages, cross-channel linkers, state management, migrations) would obscure the POC's thesis. Simplicity of the demo is the point.

---

## 2026-04-30 — Agent composes structured JSON, not HTML

**Decision:** The agent's authoring surface is a constrained JSON schema. The widget bundle is fixed and vetted; only composition varies per turn.

**Reasoning:** (a) Safety — no LLM-generated executable code running in the iframe. (b) Consistency — the bundle has a known visual language. (c) Leverages the same idea as battle-tested UI frameworks like Slack Block Kit. The tradeoff — less visual flexibility than generative HTML — is acceptable; the POC's hypothesis is that most conversational UI needs fit inside a card/column/button vocabulary.

---

## 2026-04-30 — Button actions are follow-up prompts, not API calls

**Decision:** Every actionable element in the widget is a button that, when clicked, emits a prompt string back to the agent host. The widget never calls a tool or API directly.

**Reasoning:** (a) Anything clickable is also typeable — the agent can accomplish the same effect whether the user clicks "Cancel order" or types it. (b) Keeps the widget stateless and decoupled from any specific MCP server's API. (c) Puts the agent in control of safety/confirmation for destructive actions (though this relies on the host — ChatGPT, Claude — treating widget-originated prompts with appropriate caution; that is a load-bearing assumption of this design).

---

## 2026-04-30 — Data is inlined into the spec by the agent

**Decision:** When the agent composes a UI-spec, it inlines the data it has already gathered (from other tools, web, conversation) into the spec. No handle-based references.

**Reasoning:** Simplicity. The alternative — a reference/handle system across tool calls — requires a convention for cross-tool handles that doesn't exist in MCP today. Known residual risks (token cost, paraphrase drift on re-serialization) are accepted for POC. If they become material, we revisit.

---

## 2026-04-30 — Single bundled React renderer (reversal of pluggable-renderer idea)

**Decision:** For v1 there is exactly one renderer, built in React, and it ships as a bundled HTML/JS asset *inside the `mcp-lens` package*. `show_lens` serves the bundle inline in the MCP UI resource body (`text/html+skybridge`). No public hosting, no renderer abstraction, no `renderer-*` sub-packages.

**Reasoning:** Owner direction: keep it simple. The premature renderer-pluggability abstraction added a layer without concrete need. If a second renderer ever lands, we extract then.

**Skill is renderer-agnostic anyway** — it teaches the lens spec, not a rendering stack — so swapping the renderer later does not invalidate the skill.

**Reverses:** the earlier "Pluggable renderers; lens spec is the contract" decision. That framing is archived.

---

## 2026-04-30 — `show_lens` takes `spec` and `description`

**Decision:** The `show_lens` tool accepts two arguments:

1. `spec` — the lens JSON (structured view definition).
2. `description` — the agent's account of what the user is being shown, written for the *model* (not the user).

The description is placed on the tool *response*'s `_meta` (under `openai/widgetDescription` for ChatGPT Apps, or an equivalent per-host field).

**Critical clarification — who reads the description:**

- The description is **model-facing metadata**, not user-facing text. It informs the agent about what is on screen.
- The agent decides what to actually say to the user based on that description — translating into the user's language, tone, and level of detail.
- It is **not** rendered verbatim below the widget. The user sees whatever the agent chooses to say in conversation.

Two uses of the description:
- Informs the agent's narration in conversation after the lens renders.
- It is the preference signal sent to `memorialize_lens` when the user thumbs-ups a view.

Important distinction: this is *not* the tool description (which is static, in the tool descriptor). It's the agent's per-call account of what this particular lens shows.

**Open:** whether ChatGPT Apps honors `openai/widgetDescription` on the tool response _meta or only on the tool descriptor. Confirm against current docs when building; parked in open-questions.

---

## 2026-04-30 — Thumbs up/down chrome + memorialization flow

**Decision:** The renderer's chrome always shows thumbs-up / thumbs-down affordances (outside the composed spec). They are not part of the lens spec; they are renderer-provided.

**Thumbs-up behavior:**
1. Renderer emits a follow-up prompt asking the agent to memorialize the current description.
2. Agent calls `memorialize_lens` (if available) with the description string. This is a separate, *real* MCP tool call — that is what makes the memory durable across sessions on the server.
3. Agent also acknowledges the memorialization in conversation. The description now lives in session context too, so subsequent turns can treat it as an active preference without re-reading from the server.

**Thumbs-down behavior:** follow-up prompt inviting the user to say what they'd prefer different. No auto-memorialization on negative signal.

**Session context alone is a valid fallback.** If `memorialize_lens` is not installed on the server, the thumbs-up still updates session context ("the user liked that view") via the follow-up prompt. That is useful within the session and is the default behavior.

**Reasoning:** Separating the durable-storage call (`memorialize_lens` MCP tool) from the in-session signal (follow-up prompt) means:
- Servers that don't opt into storage still get a useful feedback loop within a session.
- Servers that do opt in get cross-session durability under their own identity and policy.
- Consistent with the "widget never calls tools directly" invariant: the agent always mediates.

---

## 2026-04-30 — Lens presets: server-provided reference lenses

**Decision:** MCP server authors can optionally ship **lens presets** — reference lenses for the common data/view types their server deals with (e.g., a shoe card, an order summary, an itinerary). Presets are precedent, not templates — the agent treats them as examples to learn from, adapt, or combine, not as forms to fill in.

**Naming:** we call them **presets**, not templates. "Template" implies placeholder-substitution semantics (Handlebars, email templates). Presets are closer to *examples the agent studies* — the agent is free to adapt, combine, or extend them.

**Two tools on the server (both optional):**
- `list_lens_presets()` → list of `{ name, description }`. Low-token overview.
- `get_lens_preset(name)` → full preset JSON + description.

**Skill guidance:**
- *"Before composing a lens, consider calling `list_lens_presets` if the tool is available. If one or more presets fit the current conversational moment, call `get_lens_preset` on them and treat them as precedent — adapt, combine, or extend. If none fit, compose from scratch. Use presets as reference, not as a form to fill in; the point of MCP Lens is runtime composition."*

**Combination is explicitly encouraged.** If the user asks to see a shoe *and* its order status, the agent fetches both presets and decides how to combine them (side by side, nested, whatever fits the moment). The skill should name this capability explicitly.

**If no preset tools are installed, the agent composes from scratch.** Presets are an optional determinism lever the server author controls — not a requirement.

**Default in `mcp-lens`:** a minimal built-in preset store and registration helper. Server authors define presets inline and hand them over. If more sophisticated storage is needed, they swap in their own implementation.

**Future: predefined preset repositories.** Shared npm packages like `mcp-lens-presets-commerce` or `mcp-lens-presets-crm` can ship curated preset libraries server authors install and pipe in. Post-POC direction — the primitive shape should already support it, but we don't ship any preset repos in v1.

**Reasoning:** Presets give server authors a lever between pure-agent-dynamic-composition (maximum flexibility, least determinism) and static widgets (maximum determinism, least flexibility). Each MCP server author is the domain expert for their own data — they know what a "good" shoe card looks like — and presets let them codify that knowledge without taking composition control away from the agent.

---

## 2026-04-30 — Preset format: markdown document with embedded JSON (not plain JSON)

**Decision:** A preset is a small markdown document with embedded JSON code blocks — *not* a standalone JSON object. Structure:

```yaml
name: shoe                        # identifier the agent references
description: string               # one-line hook shown in list_lens_presets
body: markdown                    # prose + embedded ```json``` blocks
```

The markdown body combines prose (explaining intent, what's prescriptive vs. illustrative, when to apply it) with concrete JSON examples (showing the structural shape).

**Reasoning:** Neither raw JSON-with-no-placeholders nor JSON-with-placeholder-syntax works reliably. Plain JSON leaves the agent unsure whether example values are prescriptive or illustrative; placeholder syntax (`{{shoe.name}}`) gets rendered literally or misinterpreted. Markdown-with-embedded-JSON lets prose carry intent while JSON carries structure — the agent is strong at reading documents and weak at inferring intent from raw data. This also makes presets easy to author and review by hand.

**No formal placeholder syntax.** The prose in the markdown body explicitly labels which parts of the JSON are structural (prescriptive) and which are sample values (illustrative). The agent reads both and composes accordingly.

**Implication — presets are essentially mini-skills.** The useful distinction:
- **Skill** = server-wide behavior guidance. One per server.
- **Preset** = one presentation pattern. Many per server. Optional.

Both are markdown documents the agent reads. Presets are skills at a smaller, more specific scope.

---

## 2026-04-30 — Preset delivery is tools for v1; resources deferred

**Decision:** For v1, presets are served via the `list_lens_presets` and `get_lens_preset` tools. Not as MCP resources.

**Reasoning:** Once presets are markdown documents (see previous decision), whether they're served as tool responses or MCP resources is a delivery-mechanism choice — the content is identical. ChatGPT Apps' tool semantics are battle-tested; resource semantics (especially around auto-surfacing) are less so, and not all MCP clients handle resources the same way. Start with tools; revisit if the tool-call overhead becomes a practical problem.

---

## 2026-04-30 — `memorialize_lens` is server-owned, optional, with an in-memory default

**Decision:** `memorialize_lens` is an MCP tool that lives *on the MCP server*, not the widget. It is owned by the server author — they control storage, user scoping, and retention policy.

**API:**
- Call with `{ description: string }` → stores it against the authenticated user.
- Call with no args → returns all memorialized descriptions for the authenticated user.

**`mcp-lens` ships a default in-memory implementation** that server authors can opt into with one call. Suitable for POCs, demos, and single-session uses. Not durable across restarts.

**Real deployments replace it.** Each MCP server already knows who the user is; memorialization is server-scoped by design. Preferences on the shoe server don't leak to the orders server.

**How the agent loads preferences:** skill instructs the agent to call `memorialize_lens` with no args **once at the start of the session, before composing any lens**. After that, subsequent thumbs-ups land in session context, so re-reading is unnecessary until a new session.

**Reasoning:** Server-scoped memory is the right mental model — it's not a second global memory competing with ChatGPT/Claude memory; it's a per-server preference store tied to the authenticated identity. Making the durability optional keeps the default installation simple (the in-memory default suffices for demos) while letting real servers wire their own backing store.

---

## 2026-04-30 — Modular package structure

**Decision:** The repo is a monorepo with separate packages for core, renderer(s), and demo MCP servers. Layout:

```
packages/
├── mcp-lens/                   # core library (published to npm)
├── mcp-lens-renderer-react/    # v1 React renderer (published separately)
└── demos/
    ├── shoes-mcp/
    └── orders-mcp/
```

Each demo is a standalone MCP server that imports `mcp-lens` + a renderer and registers `show_lens` in ~a few lines. Demos are not published.

**Reasoning:** Modular boundaries keep the adoption story clean: a server author installs `mcp-lens` + one renderer. The demos serve as worked examples and stress tests of the "drop-in" claim.

---

## 2026-04-30 — Name: MCP Lens

**Decision:** The approach is called **MCP Lens**. The npm package will be `mcp-lens`. The mirror tool is named **`show_lens`** (verb-noun; reads naturally in a skill prompt: "call `show_lens` with a spec describing what to show"). The unit of composition — one JSON spec — is called **a lens**.

**Reasoning:** A lens names the *mechanic* (one dataset, many possible views, chosen per moment) rather than the *category* (MCP UX). It sits apart from MCP / MCP UI / MCP App instead of next to them, which avoids the adoption trap of being evaluated on MCPUI's terms. It works as a noun and scales into natural phrasing ("add a lens", "this lens shows…", "render a lens"). "Lens" already has the right connotation in software (views, projections, perspectives).

**Alternatives considered:** MCP UX (too generic, sounds like design consulting), MCP Scene (too ephemeral/theatrical), MCP Facet (too technical), MCP Frame (overloaded), MCP Cast (ambiguous).

---

## 2026-04-30 — Target ChatGPT Apps first for the POC demo

**Decision:** The first (and likely only, for POC) MCP client we target is ChatGPT Apps. The widget bundle, mirror tool, and skill will be validated end-to-end there before considering other hosts.

**Reasoning:** ChatGPT Apps is the easiest path to a visible demo: public developer docs, established widget embedding model (iframe + `window.openai` bridge), fast iteration loop. Targeting one client up front lets us make concrete choices about how the widget receives the spec and how button-click prompts flow back, instead of abstracting over hypothetical clients.

**Alternatives considered:** Claude Desktop (MCPUI support less mature), Slack (Block Kit is a whole different rendering path), Gemini (less public tooling).

**Implications to confirm when building:**
- Widget likely receives the spec via `window.openai.toolInput` (or equivalent) rather than a URL-encoded spec — needs verification against current ChatGPT Apps docs.
- Button-click → follow-up prompt almost certainly goes through `window.openai.sendFollowupPrompt` (or equivalent). Naming/shape TBD when we build.
- ChatGPT renders widgets in a sandboxed iframe with a known postMessage contract — we inherit its security posture.

---

## 2026-04-30 — One generic "mirror" tool, not per-server UI tools

**Decision:** Ship one MCP tool (`show_lens`) that accepts a lens spec and returns an MCP UI resource URI. Do not push per-tool widget registration.

**Reasoning:** The mirror tool is the universal plug: drop it into any MCP server (even one with no UI awareness) and that server gains rich UI. Per-tool widgets recreate the static-authoring problem we're trying to avoid. The tool is trivial (~nothing in the body); the engineering interest lives in the schema, the skill prompt, and the renderer bundle.
