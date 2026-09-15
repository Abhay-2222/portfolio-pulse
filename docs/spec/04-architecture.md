# Architecture

Five layers. Each idea lives in exactly one. No layer knows about the ones
above it. Otherwise it's four products sharing a codebase.

```
┌─────────────────────────────────────────────────────────────┐
│  5. SURFACES     Pulse · worklists · entity briefs · overlay │
├─────────────────────────────────────────────────────────────┤
│  4. ENGINE       metrics (pure fns) · rule library → Findings│
├─────────────────────────────────────────────────────────────┤
│  3. LEDGER       canonical entities + facts + CellRef        │  ← the contract
├─────────────────────────────────────────────────────────────┤
│  2. RESOLVER     tables → columns → entities → mappings      │  ← the product
├─────────────────────────────────────────────────────────────┤
│  1. SOURCES      drive watcher · versions · freshness        │
└─────────────────────────────────────────────────────────────┘
```

**The Ledger is the contract.** The Resolver's only job is to fill it; the
Engine's only job is to read it; the Surfaces never touch a file. The current
app already assumes something close to this, because the master workbook is
already normalised — phase 3 replaces a single Excel reader with a resolver
that produces the same structures.

---

## Layer 1 — Sources

Watches a folder. Emits file events with content hash, last-modified, and a
version guess.

- **Version detection:** filename regex (`v2`, `FINAL`, `_Sep`, `2026-08`) plus
  header fingerprint. Same fingerprint + different as-of = a snapshot, not a new
  project.
- **Freshness** is computed here and rides all the way up as `staleness`.
- **Order:** OneDrive/SharePoint via Graph first (where enterprise PMO files
  actually live), Google Drive second, local watcher third.
- Never writes. Never moves. Never renames.

## Layer 2 — Resolver

Three sequential problems, each with its own confidence ladder.

### 2a. Table detection
A sheet is not a table. Find dense rectangles, skip title and logo rows, detect
the header row by type discontinuity, handle merged two-row headers, split
multiple tables on one sheet. Deterministic.

### 2b. Column binding — the confidence ladder

| Rung | Method | Confidence |
|---|---|---|
| 1 | Exact match to canonical name | high |
| 2 | Synonym dictionary hit (`Planned Finish` → `BaselineEnd`) | high |
| 3 | Normalised fuzzy match above threshold (Jaro-Winkler) | medium |
| 4 | Value-shape heuristic (all dates, all 0–1 floats, ID pattern) | medium |
| 5 | **Optional model call** — header + 5 sample values → concept | low |
| 6 | Ask the user | — |

The model sits at rung 5 and is switchable off; the app still works, with more
confirmations. Critically, **its output is a mapping, not a number.** It runs
once per new file shape, a human confirms, and the result is cached forever
against the header fingerprint. Inference cost per user trends to zero.

### 2c. Entity resolution
"Acme Migr." and "ACME Migration" and `PRJ-1042` are one project. Signals:
token-normalised name distance, folder path, client name, date-range overlap,
shared people. Proposed to the user in a merge UI shaped like deduping
contacts. Always visible, always reversible — silent wrong merges poison every
number downstream.

### 2d. Mapping recipes
A confirmed binding is saved as a recipe keyed on **header fingerprint, not
filename**. Next month's file with the same signature binds silently. A new
shape lands in the unmapped queue. This is the difference between an import
tool and something used every Monday for two years.

**The dictionary is an asset.** There are perhaps 300 column names in the entire
PM world. Ship a seeded dictionary; grow it from confirmations. After a few
hundred drives it beats a model at this task and runs in microseconds.

## Layer 3 — Ledger

Canonical entities: `Project, Person, Allocation, Client, Invoice, Milestone,
RAID, ChangeRequest, BudgetLine, Actual, Snapshot, Estimate`. Target shape is
the master workbook's schema — it's already a well-designed model.

Every fact carries a `CellRef`. This is what makes tap-to-source free at every
layer above. Bolted on later, it's a rewrite — which is why phase 2 precedes
phase 3 in a real build.

Also holds the **overlay store**: disposition, owner, snooze, note. Ours, not
the file's. The only data we own.

## Layer 4 — Engine

Two halves, both deterministic.

**Metrics** — pure functions over the Ledger. EAC, ETC, VAC, CPI, SPI, burn,
RAG legs, health score, aging buckets, allocation, contingency coverage, the
EBITDA bridge. Thresholds come from Settings, never hardcoded in components.
No inference ever runs here. Same inputs, same outputs, always.

**Rule library** — YAML rules producing `Finding` objects. See
`03-findings-schema.md`.

## Layer 5 — Surfaces

- **Pulse** — exception-led. Sorts and filters Findings.
- **Four worklists** — Projects, People, Money, Risks. Hunting tools: sorted,
  filtered, scannable. Gordon working twelve clients needs a list, not twelve
  narratives.
- **Entity briefs** — Project, Person, Client. Brief-led. Same Findings, woven
  into narrative sections.
- **Overlay actions** — own, snooze, note, export.

---

## What this composition buys

- Adding the EBITDA bridge is an **Engine change only** — no new ingest, no UI
  rework. Same for risk response fields and contingency coverage.
- Provenance rides all the way up **for free**, because facts carry cell refs
  from layer 3.
- One rule serves two surfaces: the same "margin down three months" rule writes
  the Pulse sentence *and* stamps the Projects row.
- The golden master tests two layers with one fixture: shred it to test the
  Resolver, feed it clean to test the Engine.
- AI, if present at all, sits on **one rung of one ladder**.

---

## Where a model genuinely helps

Only three places, all optional, all off by default:

1. Rung 5 of column binding — unrecognised headers
2. Summarising free-text RAID mitigation notes
3. Natural-language questions ("why did Acme go red in June")

None of them produce a number.

---

## Technical notes

- Local-first compute. Data never needs to leave the device for any metric.
  This is what makes the enterprise security review survivable.
- Parse to a columnar store (Arrow/Parquet or SQLite) once; recompute is cheap.
- Recompute on file change, not on view. Pulse must render from cache.
- Mapping recipes and the dictionary sync; **portfolio data does not have to.**
- `Settings` sheet values (RAG thresholds, margin floor, as-of) are config, read
  from the book, not compiled in.

---

## Resolver failure handling

The unmapped queue covers "I don't understand this shape." It does not cover
"I can't open this." Every one of these will occur on a real drive.

| Failure | Behaviour |
|---|---|
| Password-protected | Queue with a prompt for the password. Never store it. |
| Corrupt / unreadable | Queue as failed with the parse error. Retry on file change. |
| Very large (> 50MB, > 100k rows) | Stream-parse; sample first 5k rows for binding, full parse for metrics. Warn if it exceeds the budget. |
| Many sheets (> 30) | Bind on demand rather than eagerly. Most will be scratch tabs. |
| External links to missing files | Use cached values; flag confidence as low. Never attempt to resolve. |
| Macro-enabled (.xlsm) | Read data only. Never execute. |
| Circular references | Use cached values; emit a data-quality finding. |
| Entirely empty or non-tabular | Reject silently after one queue appearance. Don't nag. |

**Rejection must be possible.** A resolver that force-maps someone's expense
claim into the portfolio is worse than one that admits defeat. The fixture set
includes an irrelevant file specifically to test this.

## Permission model

The role table lives in `08-interaction-spec.md`. Architecturally:

- Roles filter at the **Surface** layer, not the Ledger. Findings compute once
  for everyone; rendering decides what is shown.
- Rate-bearing fields carry a `sensitivity` flag on their `CellRef`.
- The overlay store is per-user for `snooze` and `note`, shared for `owner` and
  `disposition` — two people snoozing the same invoice independently is
  correct; two people disagreeing about who owns it is not.
