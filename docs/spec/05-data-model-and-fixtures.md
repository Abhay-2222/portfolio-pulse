# Data model and fixtures

## What `Enterprise_Portfolio_Data.xlsx` actually contains

14 sheets, normalised, with a `DataDictionary` (227 column definitions) and a
`Settings` sheet holding every threshold. As of 11 September 2026.

| Sheet | Rows | Notes |
|---|---|---|
| Projects | 24 | 56 columns. CPI, SPI, EV, PV, VAC, EAC, ETC all computed and all hidden by the current UI |
| Resources | 63 | Cost/bill rates, capacity, skill, billable ratio YTD |
| Allocations | 145 | Date-ranged, billable flag, planned vs actual hours |
| Estimates | 165 | WBS, confidence, contingency % — 9 projects carry a v2 Re-forecast (120 current lines, 45 superseded) |
| Budget | 134 | 8 cost categories including a **Contingency** line per project |
| Actuals | 1,400 | By period, category, vendor; sources: Timesheet / AP Invoice / Expense Claim |
| Milestones | 120 | Baseline vs forecast vs actual, billing flag, billing amount, invoiced flag |
| Invoices | 97 | Payment terms, due date, days overdue, aging bucket |
| RAID | 72 | Probability, Impact, RiskScore, Severity, ExposureExpected, Mitigation, Owner, TargetDate |
| ChangeRequests | 23 | Revenue/cost/margin impact, schedule days, days in review |
| Snapshots | 132 | 8 month-ends, Jan–Aug 2026. **The time dimension already exists.** |
| Clients | 12 | Industry, region, tier, terms, outstanding AR |
| Settings | 20 | Every threshold the engine needs |
| DataDictionary | 226 | Column-level documentation |

**Fix:** `Settings.Currency` says CAD; the brief says USD. Pick one.

### Verified portfolio figures

17 active of 24 · 4 red / 4 amber / 9 green · active contract value $16.2M ·
portfolio margin 31.2% against a value-weighted target of 36.3% · average
health 74 · overdue AR $789,504 across 6 invoices · outstanding AR $1.94M ·
**unbilled WIP $2,117,514 net, which is $2,357,242 positive less $239,727 of
over-billing** · 6 critical open RAID · weighted open exposure $1.63M · 8
pending CRs totalling $402,000 of cost impact · 4 overdue milestones, 3 of them
billing milestones worth $445,500 uninvoiced · 6 overallocated, 23
under-utilised, 720 bench hours/week · all contingency lines at 0% burn.

---

## What to add — v2 of the master

### A. Risk management (the data is 80% there)

RAID already has probability, impact, score, severity, exposure, mitigation
text, owner and target date. What's missing to make it a risk *product*:

| Column | Values | Why |
|---|---|---|
| `ResponseStrategy` | Avoid / Transfer / Mitigate / Accept | Lets you ask "how much exposure are we just accepting?" |
| `ResidualProbability` | 1–5 | Post-mitigation |
| `ResidualImpact` | 1–5 | Post-mitigation |
| `ResidualExposure` | computed | Inherent minus residual = whether mitigation is working |
| `Proximity` | Imminent / Near / Far | A $400k risk 18 months out ≠ a $40k risk Tuesday |
| `ClosedDate` | date | Risk velocity, burn-down |

Derived, no new columns needed: **contingency coverage** = contingency
remaining ÷ weighted open exposure. Best insight in the file and no PMO tool
shows it. A 5×5 heat map is buildable today from Probability × Impact, sized by
CostExposure.

### B. The EBITDA bridge

The workbook gives **project gross margin**, not EBITDA — direct costs only.
Calling it EBITDA would be wrong and a finance person catches it in ten seconds.
But the bridge is mostly derivable:

| Line | Source |
|---|---|
| Revenue (recognised) | `PctComplete × CurrentContractValue` — percentage-of-completion, **not** InvoicedToDate |
| Direct cost | Actuals by period |
| **Gross margin** | already computed |
| Bench cost | unallocated hours × `CostRateHr` from Resources |
| PMO / SG&A | Resources where `BillRateHr = 0` and `UtilizationStatus = Non-assignable` |
| Unrecovered contingency | Contingency budget not drawn, not released |
| **EBITDA** | remainder |
| D&A | new assumption in `Settings` |

New sheet: `EBITDABridge`. New Settings rows: `DA_MonthlyAmount`,
`OverheadAllocationMethod`.

This is the screen that reframes the app from PM tool to something a CFO opens.

### C. Small additions

- `Projects.LastSourceUpdate` — feeds freshness once ingest is real
- `Milestones.InvoiceID` — closes the milestone→invoice loop that S8 depends on
- `RAID.LinkedCRID` — risks that became change requests

---

## The shredder — fixtures for the Resolver

**Keep the master as the golden answer key.** Generate messy files *from* it, so
you know the correct output and can measure recovery. That's an evaluation
harness, and it's the thing that makes the case study credible.

For the binder product, the clean master is the *wrong* test fixture: it's a
relational database wearing a spreadsheet costume. Nobody's SharePoint looks
like this. Design against it and the mapping layer will look easy, then die on
first contact.

### Fixture set

| File | Damage | Tests |
|---|---|---|
| `Loyalty_Budget_v4_FINAL.xlsx` | One project, tab per cost category, logo + title rows above header | Table detection, multi-sheet single entity |
| `Portfolio_Status_Sep.xlsx` | Roll-up, one row per project | Many projects per file |
| `Portfolio_Status_Aug.xlsx` | Same shape, prior as-of | Version detection, snapshot vs new data |
| `RAID Log - Claims.xlsx` | Severity as **cell fill colour**, not a value | Formatting-as-data |
| `Resourcing Q3.xlsx` | Merged two-row header, allocation as `"50%"` text | Header reconstruction, type coercion |
| `crestline tracker.xlsx` | No `ProjectID` anywhere, names only, one abbreviated | Entity resolution |
| `Fraud_Detection_plan.xlsx` | `Planned Finish` instead of `BaselineEnd` | Synonym dictionary |
| `milestones_export.csv` | Flat CSV export | Non-xlsx path |
| `Q3_expenses_Jonah.xlsx` | Genuinely irrelevant | Rejection — must not be force-mapped |
| `Copy of Portfolio_Status_Sep (1).xlsx` | Byte-identical duplicate | Dedup |

### Scoring

Run the resolver over the fixture set, compare to the master:

- **Grouping accuracy** — % of files assigned to the correct project
- **Binding accuracy** — % of columns bound to the correct canonical field
- **Metric fidelity** — recomputed portfolio figures vs known truth
- **Confirmation cost** — how many questions the user had to answer

Target for a credible demo: grouping ≥ 90%, binding ≥ 85%, metric fidelity
within 1%, under 10 confirmations for 10 files.
