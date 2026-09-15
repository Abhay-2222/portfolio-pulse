# Product brief — what Portfolio Pulse became

## Audit: how the product changed

It started as a mobile dashboard over one known enterprise workbook. Four
things changed it.

**1. Real users, not a designed-for persona.** The original brief had a
"portfolio director who lives in Excel." That's a guess. Scenarios now come
from actual rows in the workbook — collisions between tables that no single
tab shows. See `02-users-and-stories.md`.

**2. Many messy files, not one clean workbook.** The product is no longer a
reader of a known schema. It points at a drive where one file may hold one
project, one file may hold twenty, one project may span six files, and the
same file may exist eight times as monthly versions. The mapping layer is
the product; the dashboard is the payoff.

**3. Deterministic by default.** Every number is a formula, never a model
output. Models, if used at all, produce *mappings* (which column means what),
never *values*. Reasons: repeatability, enterprise security review, latency,
offline.

**4. Brief-led at entity level, exception-led at portfolio level.** A
seventeen-project portfolio must triage. A single project must tell its
story, with problems legible inside the prose rather than stacked as alerts.

## Decisions taken

| # | Decision | Rationale |
|---|---|---|
| D1 | Read-only against source files. Never write back. | The moment we write, every support ticket is "your app broke my budget." |
| D2 | Management happens in an overlay store we own (owner, disposition, snooze, note), attached to resolved entities. | Gives real triage behaviour without touching spreadsheets. It is also the only data we own. |
| D3 | Every displayed number carries a cell-level source reference. | Trust. This is the wedge against Power BI, where provenance sits behind an analyst-built model. |
| D4 | Freshness is a first-class signal, not a footnote. | Stale inputs are the actual failure mode of every PMO. A green from a 40-day-old file is a lie. |
| D5 | Metrics are pure functions. No inference in the Engine layer. | Same answer Monday as Friday, or executives stop trusting it. |
| D6 | Portfolio surfaces are exception-led; entity surfaces are brief-led. | Different jobs. Triage vs. decide. |
| D7 | A finding carries a *treatment tier*, assigned by rule, not by taste. | Stops "subtle" from becoming "hidden." Money + deadline always escalates. |
| D8 | Keep `Enterprise_Portfolio_Data.xlsx` as the golden master; generate messy fixtures from it. | Gives an answer key, therefore an evaluation harness for the resolver. |
| D9 | The synonym dictionary is a shipped asset that grows from user confirmations. | After a few hundred drives it beats a model at this task, and runs in microseconds. |

## What we cut

Matrix view, Timeline view, search, authentication, multi-currency, write-back,
live Microsoft Graph sync in v1, and any ambition for the People tab beyond
"named bench, not bench hours." The People screen is the weakest in the current
app and is not what makes the product distinctive.

## The unresolved tension, and how it resolves

The original brief asked whether Pulse is the product and the rest are
worklists, or whether every tab should brief. Answer: **both, at different
levels.** Pulse and the four worklists are hunting tools — sorted, filtered,
scannable. Every entity page (project, person, client) is a brief. The same
`Finding` objects feed both; only the renderer differs.

## Build sequence

Each phase ships something demonstrable.

**Phase 1 — Engine on the clean file.**
Extend the current app against the known workbook. EBITDA bridge, risk response
and residual fields, contingency coverage, sparklines from the eight monthly
snapshots, and real named actions replacing the templated "key decisions."
*Demo: a briefing that says something a CFO would repeat out loud.*

**Phase 2 — Ledger and provenance.**
Refactor so every fact carries a cell reference. Add tap-to-source. Invisible
work, but retrofitting it later is a rewrite.

**Phase 3 — Resolver against shredded fixtures.**
Point it at 8–10 deliberately damaged files derived from the master and recover
the portfolio. *Demo: drop a folder, confirm three groupings, get the same
briefing.* This is the moment the product stops being a dashboard.

**Phase 4 — Overlay.**
Disposition, owner, snooze, note, export. Now "manages" is true.

## Recommended shape of the deliverable

If this is a portfolio case study: do phases 1 and 3 beautifully, sketch 2 and
4, and write it up as a case study about **the mapping problem**, not the
dashboard. Everyone has made a dashboard look good. Nobody has made "point at
your messy drive and get a briefing" work.

If this is a real build: phase 2 comes before phase 3, because provenance is
structural.

## The two patterns worth designing around

**The decision queue is a bigger problem than delivery.** Eight change requests
pending, $402,000 of cost impact, averaging around 40 days in review, one at 81
days. Delivery is not what is killing this portfolio; latency on decisions is.

**The fix is almost always in the same dataset as the problem.** The spare PM,
the untouched contingency reserve, the idle Azure engineer. Surfacing the
remedy alongside the exception is what makes the product feel useful rather
than accusatory — and it is what makes a PM willing to open it.
