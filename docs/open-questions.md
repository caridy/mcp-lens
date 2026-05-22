# Open questions

Things not yet decided. When one gets resolved, move it to `decisions.md` (or remove from this file if the answer is implicit in the shipped code).

---

## Spec versioning

- Every lens carries a `specVersion` field so renderers and skills can evolve. Initial value `"0.1"`. When and how we cut 0.2 — parked until the spec stabilizes. The MCP UI Apps spec adoption (SEP-1865) does NOT bump our spec version; that's a wire-shape change at the host layer, not a lens-spec change.

## Memorialization + widget description (residual)

- **Description: one field or two?** The `description` serves agent narration (what's on screen) and preference signal (what design choices were made). Started with a single field; still single. If memorialization becomes noisy/weak, split into `narration` + `presentationNotes`.

## Presets (residual)

- **Revisit: presets as MCP resources.** Decided for v1 to use tools (`list_lens_presets` / `get_lens_preset`). Worth revisiting once we see whether tool-call overhead becomes annoying in practice — MCP resources would let some clients auto-surface presets without an explicit call.
- **Generic moment-pack — three more to author.** Three of the six anticipated moments now ship in `mcp-lens-server` (`user-asked-about-a-thing`, `user-is-browsing-things`, `user-is-choosing-between-things`). Still to author when needs surface: `user-asked-for-irreversible-action` (probably needed once the demos cover destructive flows for unaware servers), `user-needs-clarification`, `we-are-partway-through-something` (multi-step flows). No rush — only add as concrete demos demand them.

## Standalone Lens server (mcp-lens-server)

- **Auth/identity tier for memorialize.** Resolved by the 2026-05-21 reframe — the SDK no longer ships memorialize at all, so the standalone server simply doesn't author one. Server authors pair it with whatever upstream they want; if that upstream advertises a memorialize-style tool, the agent finds it and uses it. If the standalone server itself ever needs an own-identity story (hosted variant, hand-issued tokens), that's its own decision; it isn't gating anything today.
- **Custom-preset extension story.** Currently the standalone server ships exactly three presets and that's it. With `mcp-presets` now the canonical commons, a flag like `--presets <package-name>` to swap in a different preset library would let power users extend without forking. Easy to add when needed.
- **Hosted version (vs. self-hosted via `npx`).** Phase 1 ships self-hosted only. Hosted has real privacy implications (the agent inlines upstream-server data into spec arguments that pass through our service) that need a deliberate writeup before launch. Parked.

## Schema design (residual)

- **Candidates considered but not shipped in v0.1:** `alert` / `callout` (prominent tone-colored message — strong candidate, likely v0.2), `keyValue` (two-column grid for labeled values — strong candidate), `icon` (curated name list, ~30 icons — blocked on choosing the set), `stat` (sugar over column + label + value — probably too thin). Revisit if demos need them.
- **Iteration.** Does the spec need a `forEach` primitive, or can the agent unroll loops into explicit child lists? Unrolling is simpler but costs tokens on large lists. Probably fine for POC.
- **Schema-level enforcement of named tokens** *(from SlackAIKit comparison)*. SlackAIKit's spec rejects raw CSS values across the board. Our spec leans on convention — `Spacing`, `Tone`, `Background` are typed enums in `types.ts` and `schema.ts`, but agents could in principle smuggle non-token values through string fields like `text` or `markdown`. The injection vector is mostly hypothetical (the renderer doesn't interpret arbitrary CSS from text content), but a stronger lint pass — explicitly rejecting unknown token values everywhere they're consumed — closes the ambiguity. One-day job, no breaking change. Worth doing before the spec stabilizes at v1.0.

## Second payload (persistence / determinism)

- **Deliberately deferred.** The owner mentioned a second argument to the mirror tool for memorization and determinism; scope for v1 is to ignore it. When it comes back, it gets its own decision entry.

## Non-obvious risks to revisit

- **Widget-originated prompts and destructive actions.** Relies on the host client (ChatGPT, Claude) to treat widget-emitted prompts with appropriate caution. This is a client property, not an MCPUI guarantee. If the target host does not do this well, the "buttons = prompts" story weakens.
- **Token cost of inlined data for list-y responses.** 20 search results inlined into a spec is a non-trivial payload and a non-trivial paraphrase/hallucination surface. Watch for this when testing; if it bites, revisit the data-reference question.

## Mobile rendering parity

- **The Block Kit / native-rendering wall.** Slack shelved SlackAIKit (their independent equivalent of MCP Lens) primarily for mobile reasons — HTML in iframes is hard on small viewports, native scroll/keyboard, accessibility, and performance. Block Kit renders natively on iOS/Android. MCP Lens will hit the same wall the day mobile parity matters. Two paths: (a) ship a `LensSpec → Block Kit` translator (the `table` primitive is the lossy one — Block Kit has no native side-by-side comparison surface), or (b) accept being web-first and let mobile be a follow-on. Not solving today; revisit when the first user actually complains about mobile.

## High-level node types (from SlackAIKit comparison)

- **Should we adopt Tier 1 nodes (`metric`, `stat_row`, `comparison`, `timeline`, `profile`, `progress`, `status`)?** SlackAIKit shipped them as first-class node types — token-efficient, consistent output. We approximate the same patterns through *moment-shaped presets* the agent composes from primitives. The bet: presets are more flexible per domain, but more compositional work per turn. Revisit if we observe the agent consistently failing to compose a common moment from primitives — at that point a targeted high-level node earns its keep. Don't add the whole catalog at once; cherry-pick when a demo demonstrates the need.

## Inline `confirm` on buttons (from SlackAIKit comparison)

- **`ButtonNode.confirm?: { title, body, ok, cancel, variant, tone }`?** SlackAIKit's `actions` component bakes confirmation into the button itself. We currently require the agent to compose a full confirmation lens (the `user-asked-to-cancel-an-order` preset). That's flexible (the confirmation lens can show line items, totals, consequences) but verbose for *simple* yes/no confirmations. An optional `confirm` field on `ButtonNode` would ship the simple case as a one-click pattern while leaving the full-lens approach available for the complex case. Non-breaking, additive. Hold until a real moment demonstrates the friction — most current demos benefit from the full-lens shape (cancel-order shows the order; pick-the-vaporfly shows the comparison).

## NPM publish

- **Names claimed under the `@mcp-lens` org.** Three packages will publish: `@mcp-lens/sdk` (the library), `@mcp-lens/server` (standalone reference server), `@mcp-lens/presets` (preset commons). Org claimed; first real publish pending owner availability + an actual decision on whether to publish at v0.1.0 or push the bar to v0.2.x first.
