# Decisions archive — superseded entries

Decisions that were reversed or replaced by later work, kept here for the historical record. The diagnostic content is sometimes still useful (the `outputSchema` saga in particular taught us where the seam between our wire shape and the host's enforcement layer fails), so it's preserved verbatim. The current state is in [`decisions.md`](./decisions.md).

If you're trying to understand *why* the current shape exists, this file is the map of dead ends. If you're trying to reproduce the current behavior, you don't need anything in here.

---

## 2026-05-06 — Ship the spec as a JSON-encoded string (`specJson`), not a nested object

**Note (2026-05-08):** Superseded. `specJson` was an over-engineered workaround for the `outputSchema` enforcement problem. Removing the `outputSchema` entirely (see the 2026-05-08 entry in `decisions.md`) is the actual fix.

**Decision:** `show_lens` ships the spec to the widget as a JSON-encoded **string** under `structuredContent.specJson`, not as a nested object under `structuredContent.spec`. The renderer parses it on receipt. The `outputSchema` declares `specJson: z.string()`.

**Reasoning:** This is the third (and final) attempt at a wire shape that survives ChatGPT Apps' host-side JSON Schema enforcement.

**The progression:**

1. `spec: z.unknown()` → JSON Schema property with no subschema → host stripped *every* nested field of the delivered `spec`. Manifested as "root.children: Required" on cards, "fields: Required" on tables, etc., on specs the agent had composed correctly.
2. `spec: z.record(z.string(), z.any())` → `{ "type": "object", "additionalProperties": {} }` → fixed the top-level stripping but the host *still* stripped some nested arrays/records in practice. Observed failure mode: `root.items.1.values: Required` on a table where every item's `values` was clearly populated.
3. **`specJson: z.string()` → host enforces "this is a string."** Strings have no nested fields to strip. The widget parses the JSON inside on receipt. Bulletproof against host enforcement, regardless of how aggressive that enforcement is.

**Why this works:** the host's JSON Schema enforcement applies to the structure described in `outputSchema`. With `specJson: string`, the host validates "is this a string?" — yes — and passes it through unchanged. The agent-composed spec, with all its nested cards/tables/items/values, lives entirely inside that opaque string and is not visible to the host's validator.

**Cost:** one extra `JSON.parse` in the renderer's host bridge. The widget still validates the parsed result against the lens schema (zod) before rendering, so the validation story is unchanged downstream.

**Backwards compatibility:** the renderer's `host.ts classify()` accepts both wire shapes — it prefers `specJson` (preferred path) and falls back to `spec` (legacy path) if present. The dev-mode harness (`window.__mcpLensDevOutput`) and old test fixtures using `spec: { ... }` still work.

**Regression test in place:** `show-lens.test.ts` asserts the published `outputSchema.properties.specJson.type === 'string'` and that `properties.spec` is undefined. A second test confirms a deeply nested spec (table with item values records) round-trips intact through the JSON string. Anyone reverting to a nested-object wire shape fails both tests.

**Diagnostic signal for any future "field X: Required" error on data the agent clearly sent:** check whether the field traveled inside `specJson` or as a top-level structuredContent property. Top-level structuredContent properties are still subject to host stripping; only contents of `specJson` are immune.

**Worth reflecting on:** this is the kind of bug that doesn't surface in unit tests, in-process integration tests, or any local validation. It only appears at the seam between our server's MCP response and the host's iframe payload — a layer we don't control and can only test against by running real ChatGPT. Locking the wire shape into a string is the simplest invariant that makes the seam unable to lose data.

---

## 2026-05-05 — `outputSchema.spec` must be a concrete object type (not `z.unknown()`)

**Note (2026-05-06):** This decision is superseded by the `specJson` approach (also archived above) — and then *that* was superseded by removing the `outputSchema` entirely. `z.record(z.string(), z.any())` was a partial fix that addressed top-level stripping but not deeply nested stripping. Kept here for the historical reasoning and the diagnostic-signal comment, which still applies for any future tool that exposes nested-object structuredContent.

**Decision:** In `show_lens`'s `outputSchema`, the `spec` field is typed `z.record(z.string(), z.any())`, not `z.unknown()`.

**Reasoning:** The MCP SDK publishes `outputSchema` as JSON Schema. `z.unknown()` compiles to a property with *no subschema at all* — just `{ "description": "..." }`. ChatGPT Apps takes that published schema and enforces it on the `structuredContent` payload before handing it to the widget via `window.openai.toolOutput`. With no subschema on `spec`, the enforcement strips every nested field, so the widget sees something like `{ spec: { root: {} } }` — the top-level keys survive but `children`, `title`, `subtitle`, etc. are gone. Zod validation in the widget then fires with "root.children: Required" against a spec the agent had actually composed correctly.

`z.record(z.string(), z.any())` compiles to `{ "type": "object", "additionalProperties": {} }`, which tells the host "any object with any properties, keep everything." Nested content survives the round-trip.

**Diagnostic signal for future instances of this class of bug:** if you see a "required" error on a field that's manifestly present in the agent's input, check the published JSON schema for that tool's `outputSchema` — `tools/list` will show you what ChatGPT actually enforces. A subschema-less property (`{ "description": "..." }` with no `type`) is the smoking gun.

**Regression test in place (subsequently removed):** `show-lens.test.ts` originally asserted that the published `outputSchema.properties.spec.type === 'object'`. After we removed `outputSchema` entirely, that test was inverted to assert `outputSchema === undefined`.

**General principle (worth encoding at a higher level):** every zod schema we expose via the MCP SDK's `outputSchema` is also an enforcement contract for downstream clients. If we want a field to carry rich nested data, the schema must say so at every level the client will enforce. Permissive in the wire format is fine; permissive in zod while strict at the host is a landmine.
