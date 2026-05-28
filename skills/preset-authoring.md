# Preset authoring — a craft handbook

**Audience:** server authors prompting Claude Code (or any coding agent) to write **lens presets** for their MCP server. You are likely sitting in a fork of this repo, contributing a new preset (or a new domain) to `presets/<domain>/` at the repo root.

**Not for the running agent.** This skill teaches *humans + their coding agents* how to author presets at design time. It is **not** exposed as an MCP resource and the runtime agent never sees it. The runtime skill is `packages/mcp-lens/skills/show-lens.md` and that is the contract for *composing* lenses; this is the contract for *teaching the runtime agent's precedent*.

If you are a coding agent reading this: your job is to produce a markdown file at `presets/<domain>/<moment>.md` that follows every rule in this document. Do not skip any rule because the surrounding repo "looks fine without it." The rules are derived from real failures observed across four demos.

---

## What a preset is

A preset is a **markdown file with YAML frontmatter** at `presets/<domain>/<moment>.md`. The `mcp-presets` build step reads every preset file, validates it, and emits typed TypeScript exports per domain. A demo or external server then imports `@mcp-lens/presets/<domain>` and passes the presets to `registerShowLens(server, { presets })`.

Each preset has:

- `name` (frontmatter) — kebab-case identifier following the `user-<is/asked/asked-to>-<predicate>` convention. **Must match the filename**.
- `description` (frontmatter) — one-line hook the agent sees in the `get_lens_guide` preset index. Decides whether the agent *fetches* this preset.
- body (everything below the frontmatter) — markdown with prose + YAML examples. Decides how the agent *uses* it.

The agent reads the body the way a thoughtful engineer reads a code review comment: as guidance plus a worked example, not as a template to fill in.

The build step validates: frontmatter must have non-empty `name` + `description`, the `name` must match the filename (without `.md`), names must be unique within a domain folder, every fenced ```yaml block in the body must parse as valid YAML. A broken preset fails the build, which fails the PR.

---

## The single most important rule

**Presets are precedent, not templates.**

If your preset reads like a Mad Lib ("the user asked about a {NOUN}; render a {COMPONENT} with {VALUE}…"), the agent will pattern-match it and produce a Mad Lib lens. If your preset reads like *a designer explaining why this layout fits this moment*, the agent will internalize the reasoning and produce something appropriate even when the specific data doesn't fit the example.

The corollary is the second-most-important rule:

**Every concrete value in your illustrative YAML must be fictitious.** Do not use real values from any data.ts in this repo (or in your own server's data layer). If you do, the agent will transcribe them into its lens output and look like it's composing brilliantly when it's just copy-pasting your fixtures. We caught this across every demo in an audit; fixing it required rewriting every preset's example. Do it right the first time.

---

## The naming convention

Presets are organized by **conversational moment**, not data shape. Same data, different moments → different presets.

Use this template for the preset name:

- `user-asked-about-a-{noun}` — the user named one specific record.
- `user-is-browsing-{noun-plural}` — the user wants an overview of a small set.
- `user-is-choosing-between-{noun-plural}` — the user is comparing 2+ items.
- `user-asked-to-{verb-the-user-might-do}` — the user wants to perform an action that needs a confirmation.
- `user-asked-about-{noun}-{aspect}` — drill-in on one facet of a record (incident impact, incident timeline, incident contributors).
- `user-needs-clarification-about-{topic}` — the agent needs to ask a multiple-choice question.

Concrete examples from this repo:

- `user-asked-about-a-shoe` (shoes-mcp)
- `user-is-browsing-orders` (orders-mcp)
- `user-asked-to-cancel-an-order` (orders-mcp)
- `user-asked-about-incident-impact` (incidents-mcp)
- `user-is-choosing-between-incidents` (incidents-mcp)

A preset name that includes a *data shape* ("shoe-comparison", "order-list") is a smell. Rename it to a moment.

---

## The anchor + affordances frame

Every lens has two parts:

1. **Anchor** — the data the lens shows. Card with the shoe, table comparing two shoes, list of recent orders.
2. **Affordances** — the 2–4 next-turn buttons (or links) the user can click to advance the conversation.

A preset's `body` must describe both. Specifically:

- A **"Likely next turns"** section listing the 2–4 things the user is likely to want next from this moment, in priority order. This is what becomes the affordance set.
- An **"Anchor (prescriptive)"** section describing the layout of the data — what container, what content nodes, what badges, in what order.
- An **"Affordances (the point)"** section calling out the affordance choices specifically, including *which affordance is primary* and why. Phrase the affordance as "the user's voice" prompts ("Compare the X with another Y", not "call compare_tool").

If your preset omits the "Likely next turns" section, the agent doesn't know what to put on the buttons and you'll get inconsistent lenses across turns.

---

## The 2–4 affordances rule

**Every lens ends with 2–4 next-turn buttons.** This rule is in the runtime skill; presets must respect it.

- 1 affordance — only for confirmations ("Done") or unambiguous moments. Rare.
- 5+ affordances — noise. If you find yourself wanting 5+, you're trying to be a navigation menu, not a turn predictor. Split into multiple moments — one preset per drill-in.
- Mix variants: one `primary`, one or two `secondary`, the rest `ghost`.

Two patterns worth memorizing:

- **`closeOnClick: true` on decisive picks.** "Pick the Vaporfly" in a comparison. "Yes, cancel order" in a confirmation. The moment is over once they click; dismiss the widget so the next lens replaces it cleanly.
- **Route-to-browse on ambiguous picks.** "Compare with another" / "Add another to compare" must NEVER fabricate a second item. Phrase the prompt as a request for a *list of candidates*: "Show me other carbon-plate racers I could compare the Vaporfly 3 against." The next turn renders a list; the user picks; *then* you compose the comparison.

---

## Per-row affordances in lists are mandatory

A list of 5 items with no per-row buttons is the most common preset failure. The user has to type "show me the second one." That's a missed turn.

Every row in a list gets at least one button — typically "Details" (secondary) and optionally a second domain-appropriate verb ("Compare", "Add to cart", "Mark done", "Open postmortem"). Each row's prompt must **name the specific item** so the prompt is unambiguous when it lands as a typed message: `"Show details for incident INC-99001."`, never `"Details."`.

**The single documented exception:** timeline-style lists (chronological events with no meaningful drill-in per row) get **group-level affordances at the bottom** instead. Each event gets a *type badge*; the *list as a whole* gets 2–3 buttons ("Show full history", "What's the impact?"). The incidents-mcp `user-asked-about-incident-timeline` preset is the canonical example. Use this exception only when *clicking on a single item* genuinely doesn't lead anywhere useful.

---

## Status-aware / state-aware affordances

When the data has a lifecycle (open / mitigated / resolved; pending / processing / shipped / delivered / cancelled), the affordances must enumerate the lifecycle and say which affordances fit each state.

A "Cancel order" button on a shipped order is wrong. A "Page the IC" button on a resolved incident is wrong. A "Open postmortem" button on an open incident is wrong (no postmortem yet). A "Track shipment" link on a pending order is wrong (no tracking number yet).

Your preset's body should include an explicit table or list:

```
- pending or processing (order can still be modified):
  - "Cancel order" → button (variant: ghost, tone: danger)
  - "Update address" → button (variant: secondary)
- shipped (in transit):
  - "Track shipment" → link (variant: standalone)
  - "Contact support" → button (variant: ghost)
- delivered or cancelled (terminal):
  - No state-changing affordances. Optionally a single "Contact support".
```

The agent will follow this map. Without it, the agent will offer the wrong affordances roughly 1 in 5 turns.

---

## Buttons emit prompts, links open URLs

The runtime skill spells this out, but it bears repeating because preset authors get it wrong: **buttons are conversational follow-ups; links are external navigation.**

- **Buttons** (`type: button`) — clicking emits a follow-up prompt the user *could have typed*. The agent processes it. "Cancel order" is a button. "Compare with X" is a button. "What's the impact?" is a button.
- **Links** (`type: link`) — clicking opens an `https://` URL outside the conversation. The agent is not involved. "Track shipment" (carrier URL) is a link. "Open postmortem" (internal docs URL) is a link. "Open invoice PDF" is a link.

If the user could express the action in words, it's a button. If the user just wants to look at something on another page, it's a link. When unsure, prefer button — the agent can always do something useful with a prompt.

---

## Dataset-leakage rule

**Do not use real values from your data.ts in illustrative YAML examples.**

We learned this the hard way: every initial preset across four demos used real fixture values, which let the agent transcribe presets into lens output and look like it was composing when it was copying. The audit caught it; fixing required rewriting every preset.

What counts as a leak:

- Real product / order / record IDs from the dataset (`A-1042`, `gel-resolution-9`, `INC-52790`).
- Real product / record names ("Asics Gel-Resolution 9", "Smoked Salmon Penne").
- Real numeric values from the dataset (specific weights, prices, totals, latency numbers — anything `data.ts` returns for that record).
- Real images / URLs / placeholder URIs that mimic the dataset's patterns.

What is NOT a leak:

- Generic illustrative values that don't match the dataset ("Diadora Speed Blushield 6" when no Diadora is in `data.ts`).
- Placeholder strings explicitly marked as such (`<shoe.imageSrc>`, `{name}`, `{brand}`).
- Field names ("weight", "drop", "stability") — those are schema, not data.
- Real *brand* names paired with fictitious *models* ("Nike Court Lite 4" when no Nike is in `data.ts` — fine, even if Nike is real).

Cross-domain leakage counts too. If your incidents demo's preset uses a customer name from the accounts demo's data.ts, that's a leak even though it's a different file. The audit checked all three datasets across all three preset files.

When in doubt, invent a fictitious-but-plausible name from the same category and pick numbers that aren't in the dataset.

---

## Cross-domain combination

When the user's intent spans two domains, presets compose by **embedding one moment inside another's column**.

The canonical example is the incidents-mcp `user-is-browsing-incidents` preset, which documents a "combined-with-account variant": when the user prompted "top 3 incidents for Globex this quarter," the lens is a `column` containing:

1. A compact account header card on top (with one "Show account details" affordance).
2. The incidents list below (with per-row Details buttons).

This is structurally a `column` of two top-level cards/lists, NOT a single super-card with both inside. It keeps the account context visually separate from the per-incident rows.

Document the combination *in the prose* of one of the two presets. Don't ship a third "combined" preset — that proliferates. The agent reads both presets and composes them per the documentation.

The combination story works for any cross-domain scenario: orders + items, incidents + accounts, contacts + meetings, projects + tasks. Same pattern: the *containing moment* gets a compact header; the *listed moment* keeps its full per-row affordances.

---

## Anti-patterns to actively design against

These are SPA design patterns that don't fit chat surfaces. Your preset's prose should explicitly call out which one(s) you're rejecting and why.

1. **Tabs.** Tabs are the SPA designer's "I have too much for one card" tell. In conversation, a tabbed widget is wrong: the user asked for *one moment*, not three. Split tabs into separate moments — one preset per tab. The summary card's affordances point at them. (incidents-mcp is the canonical example: the dashboard's Timeline / Metrics / Contributors tabs become three separate presets; the summary points at each.)

2. **Six-tile metrics dashboards.** A summary KPI grid with 6+ tiles is fine on a 1440px screen and overwhelming in a chat surface. Reduce to 3–4 of the most decision-relevant KPIs. The incidents-mcp `user-asked-about-incident-impact` preset documents this trade-off explicitly.

3. **Long inline timelines.** A 20-event chronological list overflows the chat surface. Truncate to the 5 newest with a "Show full history" affordance. The remaining events are a separate fetch.

4. **Per-tile drill-down menus.** "Click the metric tile to see breakdown" is a SPA interaction pattern. In chat, the metric tile is read-only; the breakdown is a separate moment driven by a button at the bottom.

5. **Persistent state across turns.** Lenses are turn-by-turn. Don't design presets that require the user to "stay on this card" through multiple agent responses. If the moment requires multi-step input, design it as a sequence of confirmations, each with `closeOnClick: true`.

If your preset's prose doesn't name the anti-pattern it's rejecting, the agent won't know to avoid it.

---

## Per-call descriptions

`show_lens` takes a `description` argument alongside the spec. The runtime agent writes it; *your preset teaches the agent how*. Include guidance in your preset's prose:

> Good descriptions: `"Single-card view of {item} with two follow-ups: 'Compare with X' (primary) and 'See similar' (secondary)."`

> Bad descriptions (vague, or written as user-facing text): `"Here is your information."` `"A view."`

A good description names the **anchor** (what data is shown) and the **affordances** (what the user can click). Both matter — the description is read by the agent on the *next* turn to decide how to narrate, and is the signal stored if the user thumbs-ups the view.

---

## What NOT to ship as a preset

Don't ship presets for moments where the generic `mcp-lens-server` ones already work. The standalone Lens server ships three domain-blind presets:

- `user-asked-about-a-thing`
- `user-is-browsing-things`
- `user-is-choosing-between-things`

If your domain's "user asked about a record" moment is structurally identical to those (same anchor shape, same affordance count, same generic verbs), don't ship a domain-specific version that just renames things. The agent will compose against the generic one and produce a perfectly serviceable lens.

**Ship a domain-specific preset when at least one of these is true:**

- Your domain has *specific affordances* the generic one can't predict. ("Page the IC" is incident-specific. "Cancel order" is order-specific.)
- Your domain has *specific anchors* the generic one can't shape. (A stat-tile row for incident impact. A line-items list for orders. A comparison-table orientation tuned to comparing N items, not 2.)
- Your domain has *lifecycle-aware affordances* the generic one can't enumerate. (Status-dependent buttons; only this preset knows the lifecycle.)

If none of those is true, you're shadowing the generic presets without adding value. Skip the preset.

---

## Validating your presets

Three layers, fail-fast → real-host:

1. **Build validation.** `pnpm --filter @mcp-lens/presets build` reads every `.md` in `presets/`, validates the frontmatter (name present, description present, name matches filename, name unique within domain), and parses every fenced ```yaml block. A broken preset fails the build. If the build passes, the preset is at least syntactically correct.

2. **Smoketest.** Every demo in this repo has `src/smoketest.ts` that exercises every tool plus a representative `show_lens` call. Run yours after a successful build. The smoketest catches integration-level issues (does the demo's `presets.ts` import the new preset, does `get_lens_guide` list it in the preset index). It does not catch "this preset is too rigid" or "the agent ignores it."

3. **Real-host test.** Run your server against ChatGPT, Claude Desktop, or Slack (whichever your audience uses). Ask the prompts that should trigger your presets. Watch what the agent produces. If the lens is consistently off-model from your intent, refine the preset's prose — likely the "Likely next turns" section is too vague, or the "Anchor (prescriptive)" section is missing a structural detail the agent needs.

The build is the floor. The real-host test is the ceiling. Don't skip either.

---

## Worked authoring walkthrough — one moment from zero to finished

To make this concrete, here's how I'd build a preset for a hypothetical *support-ticket* moment in a fictional `tickets-mcp` server.

### Step 1 — Name the moment.

The user just asked "what's the status of ticket #INC-4827?" → they named one specific record and want to know about it.

Naming convention says: `user-asked-about-a-ticket`.

### Step 2 — Identify the lifecycle.

Tickets have status: `new`, `in-progress`, `waiting-on-customer`, `resolved`, `closed`. The affordances differ:

- `new` / `in-progress`: "Assign to me", "Add an update", "Escalate".
- `waiting-on-customer`: "Mark as customer-replied", "Send reminder", "Close".
- `resolved` / `closed`: "Reopen" (only `resolved`), "Open in CRM" (link).

### Step 3 — Identify likely next turns.

For an `in-progress` ticket (the most common state):

1. **Assign to me / acknowledge** — primary; the operator wants to claim ownership.
2. **See related tickets** — secondary; "is this part of a wider issue?"
3. **Customer history** — ghost; "have they had similar problems before?"

Three is the sweet spot — primary + one lateral + one detail.

### Step 4 — Identify the anchor.

A single `card` with:

- `title`: ticket id + short title.
- `subtitle`: `{priority} · {status} · opened {humanized age}`.
- A `text` line summarizing the ticket body in one sentence.
- A `row` of `badge`s for priority (warning/danger if high) and category (neutral).
- A trailing `row` of follow-up buttons.

NOT: a metrics dashboard. NOT: tabs. NOT: a long inline conversation thread (that would be a separate `user-asked-about-ticket-history` preset).

### Step 5 — Write the file.

Create `presets/<domain>/<name>.md` (e.g. `presets/tickets/user-asked-about-a-ticket.md`). The file starts with YAML frontmatter — `name` matches the filename, `description` is the hook. Then the body is markdown.

```markdown
---
name: user-asked-about-a-ticket
description: Use when the user has named one specific support ticket and wants to know its state plus the next-turn actions appropriate to its current status.
---

# Moment: user asked about one specific support ticket

The user named a ticket ID and wants to know its state. Anchor on the ticket; offer affordances that surface what's actionable *for this ticket's current state*.

## Likely next turns — depend on ticket status

- new / in-progress (still actionable):
  - "Assign to me" → primary
  - "Add an update" → secondary
  - "Escalate" → ghost
- waiting-on-customer:
  - "Mark as replied" → primary (only when reply has landed)
  - "Send reminder" → secondary
  - "Close" → ghost
- resolved:
  - "Reopen" → secondary
  - "Open in CRM" → link (external)
- closed:
  - "Open in CRM" → link, that's it

## Anchor (prescriptive)

A single card with title (id + short title), subtitle (priority + status + age), one summary line, a row of badges, a trailing row of affordances.

## Affordances (the point)

End with 2–3 buttons drawn from the lifecycle table above. Never offer "Reopen" on an open ticket.

[…YAML example with FICTITIOUS values, not real ticket IDs from data.ts…]
```

### Step 6 — Write the YAML example with fictitious values.

The example block lives inside a fenced ```yaml block. The build validates it parses; the agent reads it as a layout precedent.

\```yaml
specVersion: "0.1"
root:
  type: card
  title: INC-99432 — Login flow returns 500
  subtitle: high · in-progress · opened 2 hours ago
  children:
    - type: text
      text: Customer reports that signing in returns a 500 error after the recent SSO migration.
      variant: body
    - type: row
      gap: sm
      children:
        - type: badge
          label: High priority
          tone: warning
        - type: badge
          label: Authentication
    - type: row
      gap: sm
      justify: end
      children:
        - type: button
          label: Assign to me
          prompt: Assign ticket INC-99432 to me.
          variant: primary
        - type: button
          label: Add an update
          prompt: I want to add an update to ticket INC-99432.
          variant: secondary
        - type: button
          label: Escalate
          prompt: Escalate ticket INC-99432.
          variant: ghost
\```

INC-99432 is **not** in any data.ts. The values are plausible but fictitious. The agent reads this as precedent and substitutes whatever real ticket the user actually named.

YAML notes worth knowing while authoring:
- Drop quotes whenever possible — strings flow without them. Use double-quotes only when the value would otherwise parse as something else (`"0.1"` to keep it a string, `"5"` when the value should be a string not a number, label values that include `:` or start with `#`).
- Multi-line strings are easy: `text: |` followed by an indented block, or just write them inline if they're short.
- Comments are fine but rarely needed — the surrounding prose already explains the layout.

### Step 7 — Add the closing notes.

After the YAML, a short "Notes" paragraph explaining the structural decisions: "Card structure is prescriptive (text → badges → affordances). Priority tone (`warning` for high, `danger` for critical, `neutral` for low) is prescriptive — don't invent your own. Every button prompt names the specific ticket id."

### Step 8 — Iterate against a real agent.

Once the preset is written, run the server against ChatGPT or Claude Desktop. Ask "what's the status of ticket #X?" using a real ticket id from your data. If the lens the agent composes looks structurally right but says wrong things, the issue is data; if it looks structurally wrong, the issue is the preset's prose.

---

## Quick checklist before you ship a preset

- [ ] Name follows `user-<is/asked/asked-to>-<predicate>` convention.
- [ ] One-line `description` names the moment and is specific enough to differentiate from sibling presets.
- [ ] Body has "Likely next turns", "Anchor (prescriptive)", and "Affordances (the point)" sections.
- [ ] Lifecycle / state-aware affordances enumerated where applicable.
- [ ] Lists have per-row buttons (or fall under the timeline-exception with group-level affordances at the bottom).
- [ ] `closeOnClick: true` on decisive picks; route-to-browse on ambiguous picks.
- [ ] Buttons for conversational actions; links for external navigation.
- [ ] Anti-pattern explicitly named in the prose if you're designing against a known SPA shape.
- [ ] All YAML example values are fictitious — `grep` your example strings against your `data.ts` and confirm no overlap.
- [ ] Cross-domain combination, if relevant, documented in prose.
- [ ] Doesn't shadow a generic `mcp-lens-server` preset without adding domain-specific value.
- [ ] Smoketest passes; real-host test produces sensible lenses.

If any box is unchecked, fix before shipping.
