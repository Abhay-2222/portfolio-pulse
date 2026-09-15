# Portfolio Pulse — working docs

Nine documents, in reading order. Written 14 September 2026, against
`Enterprise_Portfolio_Data.xlsx` (workbook as of 11 September 2026).

| File | What it holds | Read it when |
|---|---|---|
| `01-product-brief.md` | What the product became over this conversation, the decisions taken, what we cut, and the build sequence | First. It's the spine. |
| `02-users-and-stories.md` | Five users, thirteen grounded scenarios, user stories with acceptance criteria | Designing any screen |
| `03-findings-schema.md` | The `Finding` object, treatment tiers, the rule library, seeded rules with real data | Building the engine |
| `04-architecture.md` | Five layers, the resolver confidence ladder, what runs where | Building anything |
| `05-data-model-and-fixtures.md` | What the workbook holds, what to add (EBITDA bridge, risk response), the shredder plan | Extending the data |
| `06-open-questions.md` | What is genuinely undecided, with a recommendation on each | Before committing to phase 2 |
| `07-metrics-spec.md` | Every formula, verified against the workbook, plus the teaching layer | Building the engine |
| `08-interaction-spec.md` | Screens, states, density, accessibility, notifications, export, roles | Building any screen |
| `09-validation-and-prior-art.md` | What is still unvalidated, how to test it, and why the product's shape is what it is | Before claiming the scenarios are research |

## One-paragraph version

Portfolio Pulse points at a folder of PMO spreadsheets, resolves them into a
canonical portfolio model without changing the source files, computes every
metric deterministically, and renders the result two ways: an exception-led
briefing at portfolio level, and a narrative brief at entity level where the
problems are legible inside the story rather than stacked as alerts. The
differentiator is not the dashboard. It is the mapping layer plus cell-level
provenance on every number.

## Status

**Specified:** product shape, users and scenarios, finding schema and lifecycle,
rule library (22 rules), five-layer architecture, resolver ladder and failure
handling, data model and fixture plan, all metrics formulas, the teaching layer,
screens and states, accessibility, roles, notifications, export.

**Not yet specified:** visual design system (colour, type, spacing beyond
accessibility minimums), the resolver's table-detection algorithm in detail,
sync and conflict behaviour for the overlay store across devices.

**Unvalidated:** all thirteen scenarios. They are derived from real rows in a
synthetic workbook and have not been tested with a single PMO lead. See
`09-validation-and-prior-art.md`.

**Blocking decision:** Q1 — case study or real build. It sets whether
provenance (phase 2) comes before the resolver (phase 3).
