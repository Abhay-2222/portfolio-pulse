# CURSOR.md — agent instructions for Portfolio Pulse

Start at the repo [README.md](../../README.md) for how a person runs and uses Pulse. This file is for agents.

Read this first. It tells you what the product is, what is currently broken,
what order to fix it in, and the rules you must not break.

## What this app is

A read-only mobile briefing instrument over PMO spreadsheet data. It answers
one question: *what needs attention this week, and where do I drill?*

It is **not** a dashboard, a report viewer, or a project management tool.
Nobody updates status here.

## Non-negotiable rules

1. **Never write to source spreadsheets.** Read-only, always. User actions
   (hold, done, snooze, note) go to a separate overlay store.
2. **No number on screen may come from a model.** All metrics are pure
   functions. See `07-metrics-spec.md` for every formula.
3. **Thresholds come from the workbook's `Settings` sheet.** Never hardcode
   0.10, 0.20, 45, 14, 0.15 etc. in a component.
4. **Every displayed number must be traceable** to the cells it came from.
   Preserve `CellRef` through every layer.
5. **Never state something the user can see is false on the same screen.**
   This is how the current build broke trust. See `10-ui-fixes.md`.
6. **No browser storage APIs** (`localStorage`, `sessionStorage`) if this runs
   in a sandboxed artifact context. Use in-memory state.

## Files in this repo of docs

| File | Use it for |
|---|---|
| `CURSOR.md` | this file — start here |
| `10-ui-fixes.md` | **the four bugs. Fix these first.** Each has a reproduction and an assertion. |
| `11-bento-and-components.md` | the grid system and every component spec |
| `12-copy-and-number-rules.md` | voice, scope labels, formatting, forbidden phrasings |
| `ground-truth.json` | machine-readable expected values for every test |
| `01-product-brief.md` | why the product is shaped this way |
| `02-users-and-stories.md` | 13 scenarios, 13 user stories with acceptance criteria |
| `03-findings-schema.md` | the `Finding` object, treatment tiers, 22 rules, lifecycle |
| `04-architecture.md` | five layers, resolver, failure handling, permissions |
| `05-data-model-and-fixtures.md` | what the workbook holds, what to add |
| `07-metrics-spec.md` | every formula, verified |
| `08-interaction-spec.md` | screens, states, accessibility, notifications |
| `09-validation-and-prior-art.md` | what is still unproven |
| `06-open-questions.md` | ten undecided items with recommendations |

## Order of work

Do not skip ahead. Steps 1–2 are correctness; the design work is worthless on
top of a lying UI.

**Step 1 — Fix the four false claims.** `10-ui-fixes.md`. Each has a test.

**Step 2 — Scope labels and number reconciliation.** Every figure declares
whether it is portfolio-wide, project-scoped, or period-scoped. The uninvoiced
milestone number must be **$445,500** portfolio-wide and **$93,000** on
Loyalty Program Relaunch. Nothing else.

**Step 3 — Implement treatment tiers in the renderer.** The `Finding` schema
has four tiers. The current UI renders every finding identically. This is the
single biggest cause of "overwhelming."

**Step 4 — Add the consequence layer to the finding card.** Every finding needs
consequence, move, and owner. Spec in `11-bento-and-components.md`.

**Step 5 — Rebuild Pulse as a real bento grid.** Unequal cells. Spec in
`11-bento-and-components.md`.

**Step 6 — Surface collisions.** The swap on People, the client roll-up, the
CR post-approval position.

## Testing

`ground-truth.json` holds verified expected values for all 24 projects, 29
non-healthy people, 17 open invoices, portfolio rollups, health contributors,
and expected finding sets per rule.

Every metric function gets a test asserting against it. The health formula in
particular reproduces all 20 active and completed projects exactly — if your
implementation doesn't, your implementation is wrong.

```
Health = max(0, round(100
  − 150 × max(0, burnPct − pctComplete)
  −   0.4 × max(0, slipDays)
  − 150 × max(0, targetMarginPct − forecastMarginPct)))
```

## What "done" looks like for a screen

- Every number has a scope label and a source
- Findings render at their assigned tier, not all the same
- The most important thing on the screen is the biggest thing on the screen
- A user who reads only the top cell still leaves with the right action
- Nothing on screen contradicts anything else on screen
