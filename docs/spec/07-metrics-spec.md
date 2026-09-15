# Metrics spec

Every formula the Engine computes. All verified against
`Enterprise_Portfolio_Data.xlsx` to zero error across 20 active and completed
projects — these are the workbook's actual methods, not a reconstruction.

Thresholds come from the `Settings` sheet. Never hardcode them.

---

## Settings (the book's own config)

| Key | Value | Used by |
|---|---|---|
| `AsOfDate` | 2026-09-11 | everything |
| `ActualsCutoff` | 2026-08-31 | last closed period |
| `RAG_CostAmber` / `RAG_CostRed` | 0.10 / 0.20 | cost leg |
| `RAG_ScheduleAmberDays` / `RedDays` | 14 / 45 | schedule leg |
| `MarginFloor` | 0.15 | margin leg |
| `MarginTolerance` | 0.05 | margin leg |
| `OverallocationThreshold` | 1.00 | people |
| `UnderutilizationThreshold` | 0.60 | people |
| `RiskCriticalScore` / `High` / `Medium` | 15 / 10 / 5 | RAID severity |
| `MilestoneAtRiskDays` | 14 | milestone status |
| `BudgetNearLimit` | 0.90 | budget lines |
| `Contingency_High/Medium/Low` | 0.05 / 0.10 / 0.15 | estimates |

---

## Earned value

```
EV  = CurrentBudget × PctComplete
PV  = CurrentBudget × ElapsedPct
CPI = EV / ActualCost
SPI = EV / PV
```

**EAC uses the CPI-based method** — this was the open ambiguity, and the
workbook settles it:

```
EAC = ActualCost + (CurrentBudget − EV) / CPI
ETC = EAC − ActualCost
VAC = CurrentBudget − EAC
```

This matters. The alternative (`ActualCost + ETC` with an independently
estimated ETC) assumes remaining work runs at plan. The CPI method assumes
today's efficiency persists, which is more pessimistic and more honest. On
Fraud Detection ML Platform the two diverge by six figures. **Document the
method wherever EAC is displayed** — a finance user will ask.

```
BudgetBurnPct     = ActualCost / CurrentBudget
ForecastMarginAmt = CurrentContractValue − EAC
ForecastMarginPct = ForecastMarginAmt / CurrentContractValue
MarginVsTarget    = ForecastMarginPct − TargetMarginPct
UnbilledWIP       = (PctComplete × CurrentContractValue) − InvoicedToDate
```

`UnbilledWIP` goes **negative** when a project has been billed ahead of work
delivered — P-1003 at −$173,558 and P-1008 at −$66,169. That is a deferred
revenue exposure, not a rounding artifact, and it needs different language from
positive WIP.

**Never report WIP as a single net figure.** The book's headline $2,117,514 is
$2,357,242 of genuinely unbilled work *less* $239,727 of over-billing. Netting
them hides a quarter of a million dollars of exposure inside a number that
looks like an opportunity. Report both:

```
UnbilledWIP_gross = Σ UnbilledWIP where UnbilledWIP > 0    // billable, unbilled
OverbilledWIP     = Σ UnbilledWIP where UnbilledWIP < 0    // deferred revenue risk
UnbilledWIP_net   = UnbilledWIP_gross + OverbilledWIP      // headline only
```

This is a general rule for the Engine: **any metric that can net opposing signs
must expose both sides.** It applies to margin variance and CR margin impact
as well.

---

## RAG legs

Overall RAG is the **worst of three**, never a judgement. Planned projects are
N/A with a null health score.

```
CostRAG:      overburn = BudgetBurnPct − PctComplete
              Red   if overburn > RAG_CostRed      (0.20)
              Amber if overburn > RAG_CostAmber    (0.10)
              else Green

ScheduleRAG:  slip = ForecastEnd − BaselineEnd (days)
              Red   if slip > RAG_ScheduleRedDays   (45)
              Amber if slip > RAG_ScheduleAmberDays (14)
              else Green

MarginRAG:    Red   if ForecastMarginPct < MarginFloor                        (0.15)
              Amber if ForecastMarginPct < TargetMarginPct − MarginTolerance
              else Green
```

---

## Health score — verified exactly

```
Health = max(0, round(
    100
  − 150 × max(0, BudgetBurnPct − PctComplete)      // over-burn vs earned
  −   0.4 × max(0, ScheduleSlipDays)               // schedule slip
  − 150 × max(0, TargetMarginPct − ForecastMarginPct)  // margin shortfall
))
```

Active and completed projects only. Verified against all 20: P-1002 → 43,
P-1013 → 74, P-1017 → 0 (floored from −26).

Read plainly: **1 point per 2.5 days of slip; 1.5 points per percentage point
of over-burn or margin shortfall.** Money is treated as roughly four times more
serious than time, which is a defensible stance for a services business and
worth saying out loud in the UI.

---

## The teaching layer

This is the "explain the number" requirement from the original brief, and the
thing the current app most conspicuously lacks. The health formula decomposes
cleanly into three contributors, so the interaction is the Oura model: show the
score, then show the deductions with direction and size.

`healthContributors(project)` returns:

```ts
[
  { label: "Schedule slip",    deduction: 6.8,  detail: "17 days late" },
  { label: "Margin shortfall", deduction: 28.7, detail: "12.8% vs 32% target" },
  { label: "Cost over-burn",   deduction: 21.5, detail: "71% spent, 57% complete" }
]
```

Rendering rules:

- Sorted by deduction descending. The biggest problem is named first.
- Never show the formula. Show the deductions.
- Zero-deduction contributors render as "no penalty," not omitted — absence of
  a line is indistinguishable from a bug.
- Every contributor carries the `CellRef`s of its inputs.

The same pattern applies to every composite in the app:

| Number | Decomposes into |
|---|---|
| Health score | three contributors above |
| Overall RAG | the three legs, with which one is worst |
| EAC | actual cost + remaining work at current efficiency |
| Unbilled WIP | earned value minus invoiced, with the milestone that should have billed |
| Forecast margin | contract minus EAC, both shown |
| Bench cost | named people × free hours × cost rate |

**Rule:** any number that is a composite of others must be tappable to its
components. If a number can't decompose, it's a raw fact and should look like
one.

---

## Action language

The original brief asked whether to teach the number or rewrite it into action
language. Both, at different treatments: the headline uses action language, the
expansion teaches.

| Instead of | Say |
|---|---|
| "Health 43" | "Losing money faster than it's delivering" |
| "Schedule slip 17d" | "About three weeks behind" |
| "Unbilled WIP $233,400" | "We've delivered $233,400 more than we've billed" |
| "Unbilled WIP −$173,558" | "We've billed $173,558 more than we've delivered" |
| "CPI 0.81" | "Every dollar spent is buying 81 cents of progress" |
| "Bench 720 hrs/week" | "18 people's worth of unsold capacity" |

---

## Portfolio rollups

```
ActiveContractValue = Σ CurrentContractValue where Status = Active
PortfolioMargin     = (Σ Contract − Σ EAC) / Σ Contract      // value-weighted, not a mean
AverageHealth       = mean(HealthScore) where Status = Active
OverdueAR           = Σ Invoice.Amount where Status = Overdue
WeightedExposure    = Σ ExpectedExposure where RAID.Status ≠ Closed
BenchHours          = Σ AvailableHrsPerWeek where UtilizationStatus ≠ Non-assignable
```

Portfolio margin is **value-weighted**. Averaging seventeen percentages would
let a $150k project offset a $1.5m one.

---

## Contingency coverage

Not in the workbook. Derived, and the strongest unshown metric in it.

```
ContingencyRemaining = Σ Budget.Remaining where CostCategory = "Contingency"
Coverage             = ContingencyRemaining / WeightedOpenExposure
```

Below 1.0 means the project cannot absorb its own risk. Every contingency line
in the book currently sits at 0% burn with status "Reserve" — including $52,700
on a red project that has been eroding margin instead of drawing it.

---

## EBITDA bridge

Project gross margin is not EBITDA. The bridge:

```
Revenue(recognised) = Σ PctComplete × CurrentContractValue     // POC, not invoiced
DirectCost          = Σ Actuals.Amount
GrossMargin         = Revenue − DirectCost
  − BenchCost       = Σ AvailableHrsPerWeek × CostRateHr × weeks in period
  − SG&A            = Σ CostRateHr × WeeklyCapacityHrs for BillRateHr = 0
  − UnrecoveredCont = contingency neither drawn nor released on closed projects
  − D&A             = Settings.DA_MonthlyAmount × months
= EBITDA
```

Revenue recognition uses percentage-of-completion, **not** `InvoicedToDate`.
Invoicing timing is a cash question, not an earnings one, and conflating them
is the commonest error in PMO-built dashboards.
