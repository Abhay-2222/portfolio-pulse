# Portfolio Pulse — complete specification

**Consolidated build, 14 September 2026.**
All nine working documents in one file, in build order.

Every figure in this document has been verified against
`Enterprise_Portfolio_Data.xlsx` (workbook as of 11 September 2026). The
verification run and its three corrections are recorded at the end.

---

## Contents

1. [Product brief — what Portfolio Pulse became](#s1) — `01-product-brief.md`
2. [Users, scenarios, and stories](#s2) — `02-users-and-stories.md`
3. [The Finding schema and rule library](#s3) — `03-findings-schema.md`
4. [Architecture](#s4) — `04-architecture.md`
5. [Data model and fixtures](#s5) — `05-data-model-and-fixtures.md`
6. [Metrics spec](#s6) — `07-metrics-spec.md`
7. [Interaction spec](#s7) — `08-interaction-spec.md`
8. [Validation and prior art](#s8) — `09-validation-and-prior-art.md`
9. [Open questions](#s9) — `06-open-questions.md`

---

## The product in one paragraph

Portfolio Pulse points at a folder of PMO spreadsheets, resolves them into a
canonical portfolio model without changing the source files, computes every
metric deterministically, and renders the result two ways: an exception-led
briefing at portfolio level, and a narrative brief at entity level where
problems are legible inside the story rather than stacked as alerts. The
differentiator is not the dashboard. It is the mapping layer plus cell-level
provenance on every number.

---

<a id="s1"></a>

## 1. Product brief — what Portfolio Pulse became

*Source file: `01-product-brief.md`*

### Audit: how the product changed

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

### Decisions taken

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

### What we cut

Matrix view, Timeline view, search, authentication, multi-currency, write-back,
live Microsoft Graph sync in v1, and any ambition for the People tab beyond
"named bench, not bench hours." The People screen is the weakest in the current
app and is not what makes the product distinctive.

### The unresolved tension, and how it resolves

The original brief asked whether Pulse is the product and the rest are
worklists, or whether every tab should brief. Answer: **both, at different
levels.** Pulse and the four worklists are hunting tools — sorted, filtered,
scannable. Every entity page (project, person, client) is a brief. The same
`Finding` objects feed both; only the renderer differs.

### Build sequence

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

### Recommended shape of the deliverable

If this is a portfolio case study: do phases 1 and 3 beautifully, sketch 2 and
4, and write it up as a case study about **the mapping problem**, not the
dashboard. Everyone has made a dashboard look good. Nobody has made "point at
your messy drive and get a briefing" work.

If this is a real build: phase 2 comes before phase 3, because provenance is
structural.

### The two patterns worth designing around

**The decision queue is a bigger problem than delivery.** Eight change requests
pending, $402,000 of cost impact, averaging around 40 days in review, one at 81
days. Delivery is not what is killing this portfolio; latency on decisions is.

**The fix is almost always in the same dataset as the problem.** The spare PM,
the untouched contingency reserve, the idle Azure engineer. Surfacing the
remedy alongside the exception is what makes the product feel useful rather
than accusatory — and it is what makes a PM willing to open it.

---

<a id="s2"></a>

## 2. Users, scenarios, and stories

*Source file: `02-users-and-stories.md`*

Every scenario below is drawn from real rows in
`Enterprise_Portfolio_Data.xlsx`. None are invented. That matters: if the
product can't deliver these thirteen moments against this book, it doesn't
work.

---

### The users

| # | Who | Frequency | Time budget | Enters via |
|---|---|---|---|---|
| U1 | **Helena Marsh** — Director, Delivery (PMO) | Weekly, Monday | 2 min then a drill-in | Pulse |
| U2 | **Mei Fraser** — Project Manager, overloaded | Before 1:1s, Sunday night | 5 min | Her own person page |
| U3 | **Gordon Achebe** — Finance Director | Weekly AR call, month-end | 15 min, working session | Money worklist |
| U4 | **Arjun Baptiste** — Resource Manager | Every resourcing call | 5 min | People worklist |
| U5 | **Sophie Tremblay** — Client Account Owner | Before QBRs and renewals | 10 min | Client brief |
| U6 | **Marcus Bell** — Exec approver / sponsor | Change board, quarterly | 10 min | Risks → CR queue |
| U7 | **The Managing Director** | Quarterly, pre-board | 2 min, once | Pulse → EBITDA bridge |

U2 is the user the original brief was missing, and the most important one for
data quality: a read-only exec tool has no incentive loop. If the PM also
benefits from opening it, the source files stay current.

---

### The thirteen scenarios

#### S1 — Monday briefing (U1)
Four reds are known. What isn't: the same overloaded PM leads two of them, one
client accounts for both a red project and half the overdue AR, and Loyalty
Program Relaunch now forecasts **negative margin** (−14%) — it stopped being a
delivery problem and became a money problem.
**Value:** the briefing names Mei Fraser, not "6 people are overallocated."
**Fails if:** it shows the same four reds, dressed up nicer.

#### S2 — Building the case for help (U2)
Mei is at 125% across 3 projects, is delivery lead on the worst engagement
(health 0, 55 days slipped), and owns the critical risk on it that blew its
target date in July. She currently builds this argument by hand in a deck.
**Value:** the app makes her argument from the same numbers her director sees.
**Fails if:** it reads as surveillance. She'll never open it again.

#### S3 — Which invoice to chase (U3)
$789,504 overdue across six invoices. Age alone doesn't rank them. The 95-day
Aurora invoice belongs to a client whose delivery is red — pushing hard risks
the relationship. The $194,000 Pinecrest invoice is 3 days over and needs a
nudge.
**Value:** sorted by collectability and consequence, not by days overdue.
**Fails if:** it's an aging report. He already has one.

#### S4 — Staffing the next project (U4)
He needs React capacity in two weeks. "720 bench hours" is useless. Omar Bose
and Leila Nguyen are both React and both already over 100%.
**Value:** named shortlist with the consequence of each pick attached.
**Fails if:** utilization percentages with no blast radius.

#### S5 — The EBITDA question (U7)
Told the portfolio runs at 31.2% against a 36.3% target. She wants the bridge
to what the business actually earns, after bench, PMO overhead, and unrecovered
contingency.
**Value:** one screen, each leak named and sized.
**Fails if:** it repeats the margin number her CFO already emailed.

#### S6 — The client review (U5)
Aurora Retail Group: $702,500 outstanding — highest of twelve clients — on the
longest terms in the book (60 days), across one red and one amber project. She's
about to ask for more work from a client she's failing and under-collecting
from.
**Value:** the client becomes a real dimension, not a subtitle.
**Fails if:** she must assemble it by filtering four tabs.

#### S7 — The change board (U6)
Fraud Detection ML Platform is red: health 22, 66 days slipped, 15.9% margin. In
his queue: a latency target change at −$20,000 margin and a data residency
re-architecture at −$110,000 and +35 days. Approving both takes it to roughly
break-even.
**Value:** the app models the consequence of a decision not yet made.
**Fails if:** CRs are listed with dollar amounts and no context.

#### S8 — The unbilled milestone hunt (U3)
Three billing milestones passed their forecast date and were never invoiced:
$205,500 (Claims Automation), $147,000 (311 Citizen Services), $93,000
(Loyalty). **$445,500 of earned, billable work that never became an invoice** —
so it isn't in AR and nobody is chasing it.
**Value:** the app finds money nobody was looking for. Highest-value moment in
the product.
**Fails if:** it only reports invoices that exist.

#### S9 — The leak has a name (U7)
Noor Sato: cloud engineer, Azure, 0% allocated, 0% billable YTD, $126.90/hr, 40
hours free — roughly $5,076/week of cost no project carries. Meanwhile a CR to
add 40 VMs to a cloud migration has sat in review for 81 days.
**Value:** the abstraction becomes one idle specialist and one stalled decision,
obviously related.
**Fails if:** "720 bench hours" and she does the arithmetic.

#### S10 — Pipeline sanity check (U1)
Municipal Asset Management, $1,090,000, starts January 2027, strategic score 9.
Client is Bluewater — currently owner of a red project at health 30 owing
$220,500. Assigned PM: Mei Fraser, at 125%.
**Value:** checks a future commitment against present reality.
**Fails if:** planned projects are filtered out for having no health score.

#### S11 — The swap is in the same file (U4)
Mei at 125% across three. Noah Rahimi: PM, 50% allocated, 30% billable YTD, at a
*lower* cost rate. The fix is one row from the problem.
**Value:** the app proposes the reassignment with both sides of the trade.
**Fails if:** it flags overallocation without the alternative.

#### S12 — The contingency he forgot (U2-type: Liam Roy)
Claims Automation carries $52,700 of contingency, untouched, status "Reserve."
Meanwhile a $60,000 unfunded rework CR sits 53 days in review and a $47,200
dependency risk is due in nine days. He has been eroding margin instead of
drawing the reserve that exists for exactly this.
**Value:** the app teaches him something about his own project.
**Fails if:** contingency stays one row in a budget breakdown.

#### S13 — "The RAG is a lie" (U1)
Six of seventeen projects report from files nobody has touched in 30+ days.
Their greens aren't green; they're stale.
**Value:** confidence becomes visible. Every number carries an age.
**Fails if:** freshness is a footnote rather than a Pulse-level signal.

---

### User stories

Format: *As [user], when [trigger], I want [capability] so that [outcome].*
Acceptance criteria are testable against the master workbook.

#### Portfolio

**US-01** As Helena, when I open the app on Monday, I want a priority-ordered
briefing sentence naming specific projects and people, so that I arrive at the
review with a decision rather than a list.
- Names at least one project and one person
- Leads with money-and-deadline findings over trend findings
- States what is *fine*, not only what is wrong
- Renders in under 400ms from cached ledger

**US-02** As Helena, when any number is shown, I want to see where it came from,
so that I can defend it when challenged.
- Tap reveals source file, sheet, column, and file last-modified date
- Derived metrics show their inputs, not just the formula name

**US-03** As Helena, when part of the book is stale, I want that stated on the
briefing, so that I know which corners I can't vouch for.
- Freshness threshold configurable; default 30 days
- Stale projects excluded from "all clear" claims

#### Project

**US-04** As Liam, when I open my project, I want a brief that tells the story
with problems inside it, so that I understand cause rather than symptom count.
- Escalated findings appear above the narrative
- Narrative states which RAG legs are healthy
- No finding appears twice in different treatments

**US-05** As Liam, I want to see unused contingency next to open risk exposure,
so that I know whether the project can absorb its own risk.
- Coverage ratio = contingency remaining ÷ weighted open exposure

#### Money

**US-06** As Gordon, when I open Money, I want overdue invoices ranked by
collectability, so that I make the right five calls.
- Rank combines amount, age, client tier, and project RAG
- Ranking rationale visible per row

**US-07** As Gordon, I want billing milestones that passed without an invoice,
so that I can bill work already earned.
- Surfaces milestones where `IsBillingMilestone = Yes`, forecast date passed,
  `Invoiced = No`
- Totals shown as a single figure

#### People

**US-08** As Arjun, when someone is overallocated, I want the available
alternative shown beside them, so that the fix arrives with the problem.
- Match on primary skill and role
- Show cost rate delta and current billable ratio

**US-09** As Arjun, I want bench expressed as named people with skills, not
aggregate hours.

#### Client

**US-10** As Sophie, I want one page per client covering every project,
invoice, and open risk, so that I can prepare for a QBR in one screen.

#### Decisions

**US-11** As Marcus, I want each pending change request shown against its
project's current health, so that I can see the post-approval position.
- Show forecast margin before and after
- Show days-in-review as its own signal

#### Ingest (phase 3+)

**US-12** As Helena, when I point the app at a folder, I want proposed project
groupings I can confirm or correct, so that setup takes minutes not a workshop.
- Groupings proposed with a confidence indicator
- Every proposal reversible
- Confirmed mappings reused automatically on the next file of the same shape

**US-13** As any user, when a file has an unrecognised shape, I want it queued
rather than silently ignored.

---

<a id="s3"></a>

## 3. The Finding schema and rule library

*Source file: `03-findings-schema.md`*

One object powers every surface. Pulse sorts and filters findings. Entity
briefs weave the same findings into prose. One rule library, two renderers, no
duplicated logic.

---

### The `Finding` object

```ts
type Finding = {
  id: string;                    // stable: `${ruleId}:${subjectId}`
  ruleId: string;                // e.g. "money.milestone_passed_unbilled"

  subject: EntityRef;            // what this is about
  related: EntityRef[];          // the collision partners — the whole point

  // Classification
  domain: "delivery" | "money" | "people" | "risk" | "decision" | "data";
  kind: "exception" | "trend" | "collision" | "coverage" | "opportunity";

  // Magnitude — drives tiering, never prose
  amount?: Money;                // dollars at stake
  deadline?: ISODate;            // when it bites
  daysUntil?: number;            // derived from deadline vs asOf
  delta?: number;                // for trends: change over window
  severity: 1 | 2 | 3 | 4 | 5;   // rule-assigned, not model-assigned

  // Presentation
  treatment: 1 | 2 | 3 | 4;      // see tiers below — computed, not authored
  headline: string;              // escalated form, one line
  sentence: string;              // narrative form, fits mid-paragraph
  section: BriefSection;         // where in a brief it belongs

  // Trust
  provenance: CellRef[];         // every input cell behind this finding
  asOf: ISODate;
  staleness: number;             // days since oldest source file touched
  confidence: "high" | "medium" | "low";  // from resolver binding, not math

  // Overlay (phase 4)
  disposition?: "open" | "owned" | "snoozed" | "actioned" | "dismissed";
  owner?: EntityRef;
  snoozeUntil?: ISODate;
  note?: string;
};

type CellRef = {
  fileId: string; sheet: string; cell: string;  // "Projects!R14C38"
  column: string; fileModified: ISODate;
};
```

#### Why `related` matters most

The design rule from the scenario work: **if a finding involves one table it's
a report; if it involves two it's the product.** `related` is where the
collision lives — the risk owner who is also overallocated, the invoice whose
client is also red. A rule that produces an empty `related` array should be
scrutinised.

---

### Treatment tiers

Assigned by rule, never by taste. This is what keeps "subtle" from becoming
"hidden."

| Tier | Name | Rendering | Assigned when |
|---|---|---|---|
| 4 | **Escalated** | Own line, above the narrative, bold figure | `amount ≥ threshold` **AND** (`deadline` exists **OR** `kind = "opportunity"`) |
| 3 | **Ranked** | First sentence of its brief section | `severity ≥ 4`, or `amount ≥ threshold` with no deadline |
| 2 | **Marked** | In prose, with a delta, glyph, or colour on the figure | `kind = "trend"` with meaningful `delta`, or `severity = 3` |
| 1 | **Stated** | Plain prose, normal flow | everything else |

**The escalation rule in one line:** money *and* a deadline escalates.
$205,500 billable and uninvoiced escalates. A margin that drifted 0.6% over
four months gets stated.

Guardrails:
- Maximum two tier-4 findings per brief. Above that, the highest `amount`
  wins and the rest demote to tier 3.
- A finding never appears in two treatments in the same brief.
- Tier 4 headlines must contain a figure. No qualitative escalation.

---

### Brief sections

Sections order a brief. Findings declare which one they belong to.

```
escalation   → above the fold, tier 4 only
verdict      → what kind of problem this is; states what is healthy
pressure     → what is pressing on it now (risks, CRs, deadlines)
resources    → who is on it and whether that is sustainable
money        → billing, collection, margin, reserve
footer       → identity facts, no findings
```

`verdict` is load-bearing: **a brief must be able to say "cost and schedule are
fine, the problem is entirely margin."** An exception list has no grammar for
that, and the absence of that sentence is why alert-led UIs feel untrustworthy.

---

### Rule definition format

```yaml
id: money.milestone_passed_unbilled
domain: money
kind: opportunity
section: escalation
severity: 5
threshold: 50000            # amount floor for tier 4
subject: milestone
when: >
  IsBillingMilestone = Yes
  AND ForecastDate < asOf
  AND Invoiced = No
amount: BillingAmount
deadline: null
related:
  - project via ProjectID
  - client via Project.ClientID
headline: "{amount} is billable now and has not been invoiced."
sentence: >
  The {MilestoneName} milestone passed on {ForecastDate|date} and
  {amount} remains uninvoiced.
provenance: [Milestones.BillingAmount, Milestones.ForecastDate, Milestones.Invoiced]
```

Rules are data, not code. They are unit-testable against the golden master
because the expected output is known.

---

### Seeded rule library

Thirty to fifty rules produce the entire perceived intelligence of the product.
These sixteen are seeded from real collisions in the workbook.

#### Money

| Rule | Fires on | Real instance |
|---|---|---|
| `milestone_passed_unbilled` | Billing milestone past forecast, not invoiced | $445,500 across 3 milestones |
| `overdue_ar_ranked` | Overdue invoice, ranked by amount × age × tier × project RAG | $789,504 across 6 invoices |
| `overbilled_wip` | UnbilledWIP < 0 | P-1003 (−$173,558), P-1008 (−$66,169) |
| `client_concentration` | One client > 25% of total outstanding AR | Aurora: $702,500 of $1.94M |
| `margin_below_floor` | ForecastMarginPct < MarginFloor | P-1017 at −14.0% |

#### Risk and coverage

| Rule | Fires on | Real instance |
|---|---|---|
| `contingency_unused_while_red` | Contingency BurnPct = 0 AND OverallRAG = Red | P-1002: $52,700 in reserve |
| `contingency_coverage_thin` | Contingency remaining ÷ weighted exposure < 1 | portfolio-wide check |
| `critical_risk_past_target` | Severity Critical, Status ≠ Closed, PastTarget = Yes | R-0038, R-0043, R-0047 |
| `risk_owner_overallocated` | RAID owner CurrentAllocationPct > 1.0 | R-0038 → Mei Fraser (125%) |
| `risk_due_imminent` | Critical risk, TargetDate within 14 days | R-0055, due 20 Sep |

#### Decisions

| Rule | Fires on | Real instance |
|---|---|---|
| `cr_stalled_in_review` | IsPending = Yes AND DaysInReview > 45 | CR-006 (81d), CR-008 (67d), CR-003 (53d) |
| `cr_would_break_margin` | Pending CR MarginImpact would push project below floor | CR-009: −$110k on P-1005 |

#### People

| Rule | Fires on | Real instance |
|---|---|---|
| `overallocated_with_swap` | Allocation > 100% AND a same-skill person < 60% exists | Mei (125%) ↔ Noah Rahimi (50%) |
| `idle_specialist_cost` | Allocation = 0 AND BillableRatioYTD = 0 | Noor Sato, ~$5,076/week |
| `concentrated_on_reds` | One person allocated to 2+ Red projects | Victor Chen (150%, 4 assignments) |

#### Data quality

| Rule | Fires on | Real instance |
|---|---|---|
| `stale_source` | Source file untouched > 30 days | phase 3 onward |

---

### Worked output — P-1002, Claims Automation

What the renderer produces from these rules. Four findings, four treatments.

> **$205,500 is billable now and hasn't been invoiced.** The Build Complete
> milestone passed on 4 September, on its forecast date. Crestline pays on
> 30-day terms and currently owes nothing. *(tier 4)*
>
> Claims Automation is red on margin, not on delivery. Forecast margin is 12.8%
> against a 34% target; schedule has slipped 17 days, which is inside
> tolerance, and cost burn is tracking complete. *(verdict — states what is
> healthy)*
>
> Two things are pressing on it. A mainframe interface rework CR asking $60,000
> with no revenue attached has been in review 53 days. *(tier 3, ranked first)*
> And a client-side identity platform dependency, $47,200 exposure, is due on
> 20 September — nine days out, owned by Isabel Gill, who is currently
> allocated at 125% across two projects. *(tier 2, marked)*
>
> The project is carrying $52,700 of contingency that has never been drawn on.
> *(tier 1, stated — deliberately left for the reader to connect)*
>
> *Team of 6 · Liam Roy · Crestline Insurance · Go-live forecast 4 Jan 2027,
> 17 days late* *(footer)*

The last line is the "subtle" the product is after: the reader connecting
"$52,700 unused" to "$60,000 CR in limbo" themselves is worth more than the app
saying it.

---

### Hard constraint on prose

Templates with guards, never generative text. One sentence saying "schedule is
fine" about a project the client thinks is late loses the user permanently.
Every claim in a brief must be traceable to a `CellRef`.

---

### Finding lifecycle

Sixteen rules across seventeen projects produces well over a hundred findings.
Without decay, a finding that fires identically for six weeks stops being
information and becomes wallpaper. The Aurora invoice at 95 days overdue has
been firing since June.

Three additional fields:

```ts
firstSeen: ISODate;      // when this rule first fired for this subject
occurrences: number;     // consecutive computation cycles it has fired
lastChanged: ISODate;    // when amount/deadline/severity last moved
```

#### Decay rules

| Age | Treatment |
|---|---|
| New (`occurrences = 1`) | Assigned tier, plus a "new" marker |
| Unchanged, 2–4 cycles | Assigned tier, unmarked |
| Unchanged, 5+ cycles | Demote one tier, add age to the sentence: "unchanged for six weeks" |
| Worsened (`amount` or `daysUntil` moved > 20%) | Restore full tier, mark as worsening |
| Resolved | Emit a closing finding once, then drop |

**Ageing is itself a signal.** A risk unchanged for six weeks with a named owner
is not a risk being managed — it is a risk being ignored, and the brief should
say so rather than repeat the original alert.

Decay is the system's behaviour. Snooze is the user's. They are independent: a
snoozed finding still ages, and an aged finding can still be snoozed.

#### Resolution detection

A finding is resolved when its `when` clause stops matching. The closing
finding matters — Gordon needs to know the $205,500 got invoiced, and that
confirmation is what makes him trust the next one.

---

### Additional rules — the unmined sheets

Two sheets carried no rules in the first pass.

#### Estimates (165 rows, 9 projects with two versions)

| Rule | Fires on | Real instance |
|---|---|---|
| `estimate_rebaselined` | `EstimateVersion` count > 1 for a project | 9 projects carry a v2 Re-forecast |
| `estimate_drift` | Current estimate total vs v1 baseline, delta > 10% | re-baselining is how bad news gets normalised |
| `low_confidence_concentration` | > 30% of estimated hours at `Confidence = Low` | contingency at 15% signals known unknowns |

Re-baselining is the commonest way a project stops looking late without getting
better. Nine projects carry a v2 Re-forecast, and eight of the nine are red or
amber — including **all four red projects**. The single green exception is
Policy Admin Consolidation at health 96, which is the control case that keeps
this from being a tautology.

#### Actuals (1,400 rows, with a vendor column)

| Rule | Fires on | Real instance |
|---|---|---|
| `vendor_concentration` | One vendor > 25% of a project's non-labour spend | 74 subcontractor rows, 388 AP invoices |
| `spend_acceleration` | Latest closed period > 1.5× trailing 3-period average | early warning ahead of RAG |
| `unbilled_expense` | `Billable = Yes` in Actuals with no matching invoice line | direct cash finding |

`spend_acceleration` is worth building early: it fires *before* cost RAG turns,
which makes it the only genuinely predictive rule in the library.

---

<a id="s4"></a>

## 4. Architecture

*Source file: `04-architecture.md`*

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

### Layer 1 — Sources

Watches a folder. Emits file events with content hash, last-modified, and a
version guess.

- **Version detection:** filename regex (`v2`, `FINAL`, `_Sep`, `2026-08`) plus
  header fingerprint. Same fingerprint + different as-of = a snapshot, not a new
  project.
- **Freshness** is computed here and rides all the way up as `staleness`.
- **Order:** OneDrive/SharePoint via Graph first (where enterprise PMO files
  actually live), Google Drive second, local watcher third.
- Never writes. Never moves. Never renames.

### Layer 2 — Resolver

Three sequential problems, each with its own confidence ladder.

#### 2a. Table detection
A sheet is not a table. Find dense rectangles, skip title and logo rows, detect
the header row by type discontinuity, handle merged two-row headers, split
multiple tables on one sheet. Deterministic.

#### 2b. Column binding — the confidence ladder

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

#### 2c. Entity resolution
"Acme Migr." and "ACME Migration" and `PRJ-1042` are one project. Signals:
token-normalised name distance, folder path, client name, date-range overlap,
shared people. Proposed to the user in a merge UI shaped like deduping
contacts. Always visible, always reversible — silent wrong merges poison every
number downstream.

#### 2d. Mapping recipes
A confirmed binding is saved as a recipe keyed on **header fingerprint, not
filename**. Next month's file with the same signature binds silently. A new
shape lands in the unmapped queue. This is the difference between an import
tool and something used every Monday for two years.

**The dictionary is an asset.** There are perhaps 300 column names in the entire
PM world. Ship a seeded dictionary; grow it from confirmations. After a few
hundred drives it beats a model at this task and runs in microseconds.

### Layer 3 — Ledger

Canonical entities: `Project, Person, Allocation, Client, Invoice, Milestone,
RAID, ChangeRequest, BudgetLine, Actual, Snapshot, Estimate`. Target shape is
the master workbook's schema — it's already a well-designed model.

Every fact carries a `CellRef`. This is what makes tap-to-source free at every
layer above. Bolted on later, it's a rewrite — which is why phase 2 precedes
phase 3 in a real build.

Also holds the **overlay store**: disposition, owner, snooze, note. Ours, not
the file's. The only data we own.

### Layer 4 — Engine

Two halves, both deterministic.

**Metrics** — pure functions over the Ledger. EAC, ETC, VAC, CPI, SPI, burn,
RAG legs, health score, aging buckets, allocation, contingency coverage, the
EBITDA bridge. Thresholds come from Settings, never hardcoded in components.
No inference ever runs here. Same inputs, same outputs, always.

**Rule library** — YAML rules producing `Finding` objects. See
`03-findings-schema.md`.

### Layer 5 — Surfaces

- **Pulse** — exception-led. Sorts and filters Findings.
- **Four worklists** — Projects, People, Money, Risks. Hunting tools: sorted,
  filtered, scannable. Gordon working twelve clients needs a list, not twelve
  narratives.
- **Entity briefs** — Project, Person, Client. Brief-led. Same Findings, woven
  into narrative sections.
- **Overlay actions** — own, snooze, note, export.

---

### What this composition buys

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

### Where a model genuinely helps

Only three places, all optional, all off by default:

1. Rung 5 of column binding — unrecognised headers
2. Summarising free-text RAID mitigation notes
3. Natural-language questions ("why did Acme go red in June")

None of them produce a number.

---

### Technical notes

- Local-first compute. Data never needs to leave the device for any metric.
  This is what makes the enterprise security review survivable.
- Parse to a columnar store (Arrow/Parquet or SQLite) once; recompute is cheap.
- Recompute on file change, not on view. Pulse must render from cache.
- Mapping recipes and the dictionary sync; **portfolio data does not have to.**
- `Settings` sheet values (RAG thresholds, margin floor, as-of) are config, read
  from the book, not compiled in.

---

### Resolver failure handling

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

### Permission model

The role table lives in `08-interaction-spec.md`. Architecturally:

- Roles filter at the **Surface** layer, not the Ledger. Findings compute once
  for everyone; rendering decides what is shown.
- Rate-bearing fields carry a `sensitivity` flag on their `CellRef`.
- The overlay store is per-user for `snooze` and `note`, shared for `owner` and
  `disposition` — two people snoozing the same invoice independently is
  correct; two people disagreeing about who owns it is not.

---

<a id="s5"></a>

## 5. Data model and fixtures

*Source file: `05-data-model-and-fixtures.md`*

### What `Enterprise_Portfolio_Data.xlsx` actually contains

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

#### Verified portfolio figures

17 active of 24 · 4 red / 4 amber / 9 green · active contract value $16.2M ·
portfolio margin 31.2% against a value-weighted target of 36.3% · average
health 74 · overdue AR $789,504 across 6 invoices · outstanding AR $1.94M ·
**unbilled WIP $2,117,514 net, which is $2,357,242 positive less $239,727 of
over-billing** · 6 critical open RAID · weighted open exposure $1.63M · 8
pending CRs totalling $402,000 of cost impact · 4 overdue milestones, 3 of them
billing milestones worth $445,500 uninvoiced · 6 overallocated, 23
under-utilised, 720 bench hours/week · all contingency lines at 0% burn.

---

### What to add — v2 of the master

#### A. Risk management (the data is 80% there)

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

#### B. The EBITDA bridge

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

#### C. Small additions

- `Projects.LastSourceUpdate` — feeds freshness once ingest is real
- `Milestones.InvoiceID` — closes the milestone→invoice loop that S8 depends on
- `RAID.LinkedCRID` — risks that became change requests

---

### The shredder — fixtures for the Resolver

**Keep the master as the golden answer key.** Generate messy files *from* it, so
you know the correct output and can measure recovery. That's an evaluation
harness, and it's the thing that makes the case study credible.

For the binder product, the clean master is the *wrong* test fixture: it's a
relational database wearing a spreadsheet costume. Nobody's SharePoint looks
like this. Design against it and the mapping layer will look easy, then die on
first contact.

#### Fixture set

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

#### Scoring

Run the resolver over the fixture set, compare to the master:

- **Grouping accuracy** — % of files assigned to the correct project
- **Binding accuracy** — % of columns bound to the correct canonical field
- **Metric fidelity** — recomputed portfolio figures vs known truth
- **Confirmation cost** — how many questions the user had to answer

Target for a credible demo: grouping ≥ 90%, binding ≥ 85%, metric fidelity
within 1%, under 10 confirmations for 10 files.

---

<a id="s6"></a>

## 6. Metrics spec

*Source file: `07-metrics-spec.md`*

Every formula the Engine computes. All verified against
`Enterprise_Portfolio_Data.xlsx` to zero error across 20 active and completed
projects — these are the workbook's actual methods, not a reconstruction.

Thresholds come from the `Settings` sheet. Never hardcode them.

---

### Settings (the book's own config)

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

### Earned value

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

### RAG legs

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

### Health score — verified exactly

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

### The teaching layer

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

### Action language

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

### Portfolio rollups

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

### Contingency coverage

Not in the workbook. Derived, and the strongest unshown metric in it.

```
ContingencyRemaining = Σ Budget.Remaining where CostCategory = "Contingency"
Coverage             = ContingencyRemaining / WeightedOpenExposure
```

Below 1.0 means the project cannot absorb its own risk. Every contingency line
in the book currently sits at 0% burn with status "Reserve" — including $52,700
on a red project that has been eroding margin instead of drawing it.

---

### EBITDA bridge

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

---

<a id="s7"></a>

## 7. Interaction spec

*Source file: `08-interaction-spec.md`*

The gap the audit found: six documents, no UI. This covers screen inventory,
states, density, accessibility, and the two things that only existed in
conversation — progressive unlock and the spectrum resolution.

---

### Density model

The original brief flagged a split visual language (bento + expand on Pulse and
Projects; iOS grouped lists everywhere else) as something to unify. The
resolution is principled rather than cosmetic:

| Surface | Density | Why |
|---|---|---|
| **Briefs** (project, person, client, portfolio) | Mobile-first, generous, prose-led | Read and forwarded. Helena on a train, Sophie pasting into an email. |
| **Worklists** (Projects, People, Money, Risks) | Desk-first, dense, scannable rows | Worked, not read. Gordon across twelve clients, Arjun on a resourcing call. |

Don't force one density on both. Two modes, each with a reason.

**Disclosure:** worklists navigate, briefs expand. Expand-in-place is for
teaching a number (health contributors, RAG legs); it is never for navigation.
This settles the ExpandableTile inconsistency.

---

### Screen inventory

```
/                    Pulse — briefing, exception-led
/projects            worklist · chips: Active / Attention / Off track / All
/projects/[id]       brief
/people              worklist · chips: All / Over / Under / Healthy
/people/[id]         brief
/clients             worklist                          NEW
/clients/[id]        brief                             NEW (scenario S6)
/money               worklist · Overview / Overdue / Unbilled / Uninvoiced-milestones
/risks               worklist · All / Critical / Risks / Issues / Dependencies / Assumptions
/decisions           CR queue with post-approval position  NEW (scenario S7)
/sources             files, mappings, freshness, unmapped queue   NEW (phase 3)
```

Four additions, all justified by scenarios that are currently invisible. The
Risks chips gain Dependency and Assumption — both exist in the data (7 and 5
rows) and neither has a filter today.

---

### States

Every screen needs five. The audit found these missing entirely, and two of
them carry product logic that only existed in chat.

#### 1. Empty — progressive unlock

This *is* the onboarding. Instead of a setup wizard, capability is tied to
coverage, and the empty state names what's missing and what it would unlock.

> **Schedule health unavailable**
> No baseline end dates are mapped yet. Map one column to unlock schedule RAG
> and slip tracking for 14 projects. *About 2 minutes.* → [Map it]

Rules: name the unlocked capability, quantify the affected entities, estimate
effort, offer the action inline. Never a generic "no data."

#### 2. Partial
Some entities bound, some not. Show what you have and state the gap once: "17
projects · 3 not yet mapped." Never silently exclude.

#### 3. Stale
Per the freshness decision. A card whose source file is older than the
threshold renders with an age stamp and is excluded from any "all clear" claim.
Portfolio-level: "6 of 17 projects report from files not updated in 30+ days."

#### 4. Conflicting
Two files disagree. Show the winning value, a conflict glyph, and both sources
on tap. This is a finding (`data.conflicting_sources`), not an error.

#### 5. Loading
Cached ledger renders immediately; recompute happens on file change, not on
view. Pulse must never show a spinner on open — that breaks the two-minute
promise.

---

### The spectrum — resolved

The audit caught this silently dropped. It's the brand element and was flagged
as the weakest control: unlabelled dots, collisions, no size legend, hard on a
phone.

**Decision: keep it, fix it, demote it.**

- Moves below the briefing sentence and the RAG counts. It is an orientation
  device, not the primary control.
- X = health, size = contract value, colour = RAG — unchanged, it's the right
  encoding.
- Add: a size legend, always-on labels for the four worst dots, collision
  resolution by vertical jitter with deterministic ordering.
- Tap a dot → a peek card (name, client, health, worst leg), not a navigation.
  Second tap opens the project.
- Below ~44px touch targets, cluster and show a count.

If it can't be made legible on a 380px viewport within a day of work, cut it
and say so. A beautiful control nobody can operate is decoration.

---

### Accessibility

Non-negotiable, and conspicuous by its absence in the first six documents.
Target WCAG 2.1 AA.

**RAG must never be colour alone.** Roughly 8% of male users can't
differentiate the current palette. Triple-encode:

| RAG | Colour | Glyph | Text |
|---|---|---|---|
| Red | #C8372D | ▲ filled | "Off track" |
| Amber | #C77700 | ◆ half | "Watch" |
| Green | #2E7D4F | ● open | "On track" |
| N/A | neutral | ○ | "Not started" |

Also:
- Contrast ≥ 4.5:1 for body, ≥ 3:1 for large text and UI glyphs. The accent
  #2E6DB4 passes on white, fails on mid-grey fills — check every placement.
- Health scores need a text label alongside the number, not a colour ring alone.
- The spectrum needs a table equivalent reachable by keyboard and screen reader.
- Findings carry semantic severity, so escalated findings can be announced
  first regardless of visual order.
- Every tap target ≥ 44×44px. The current dot spectrum violates this.
- Respect `prefers-reduced-motion` on expand animations.
- Currency and dates: locale-aware, never hardcoded. The book says CAD.

---

### Notifications

The audit was right that Monday 7:40am is a push, not an app open.

| Trigger | Channel | Rule |
|---|---|---|
| Weekly brief | Push, Monday 07:30 local | Always. Contains the briefing sentence. |
| New tier-4 finding | Push | Money + deadline only. Max one per day. |
| Snoozed finding worsens by 20% | Push | Returns early per Q6. |
| Source file changed materially | In-app badge | Never push. |
| New unmapped file | In-app badge | Never push. |

Hard cap: two pushes per week outside the Monday brief. This product dies if it
becomes noisy — the entire premise is that it's worth opening because it's
rare and specific.

---

### Export

Claimed as the distribution mechanism in conversation; never specified.

- **Copy brief as text** — plain markdown, pastes into email and Slack intact.
  Primary action on every brief.
- **PDF** — a single brief, with provenance footnotes.
- **CSV** — any worklist, current filter applied.
- Export carries the as-of date and the freshness caveat. A forwarded brief
  that loses its staleness warning is worse than no brief.

No write-back to source files, ever. Decision D1.

---

### Roles

Q3 and Q4 both need a model that didn't exist.

| Role | Sees rates | Sees all projects | Sees people briefs |
|---|---|---|---|
| Exec / portfolio | aggregate only | all | yes |
| Finance | full | all | no |
| PM | none | own projects | own team |
| Account owner | none | own clients | no |
| Resource manager | cost rates only | all | yes |

Default to hiding cost rates. The EBITDA bridge shows aggregates regardless of
role — that's the point of a bridge.

**Person briefs are not performance views.** Per Q4: lead with the constraint
("125% across three projects"), not the outcome ("health 0"), and always
surface the available swap. A PM who feels audited stops maintaining the source
files, and the whole product depends on those files staying current.

---

<a id="s8"></a>

## 8. Validation and prior art

*Source file: `09-validation-and-prior-art.md`*

The audit's most important finding: the thirteen scenarios are internally
consistent, derived from real rows, and **entirely unvalidated by any human
user.** They are hypotheses. Nothing in the other documents says so, and a
reader could reasonably assume they came from research.

This document marks that boundary and says how to close it.

---

### Status of the evidence

| Claim | Basis | Confidence |
|---|---|---|
| The thirteen collisions exist in the data | Verified against the workbook | High — but the workbook is synthetic |
| PMO leads want a Monday briefing | Assumed | **Unvalidated** |
| Two-minute time budget | Assumed | **Unvalidated** |
| Uninvoiced billing milestones are a real blind spot | Plausible, unverified | **Unvalidated — and it's the product's best moment** |
| Incumbent PPM tools have poor usability | Public review evidence | Medium-high |
| Spreadsheets are the actual system of record in many PMOs | Widely held, easy to confirm | Medium-high |

S8 (the $445,500 uninvoiced) is the single highest-value scenario in the
product and the one most worth testing first. If PMOs already catch this in
month-end close, the product loses its best moment and needs a new one.

---

### Validation plan

Three methods, ascending cost.

#### 1. Review mining (a weekend, citable)

The incumbents your users are escaping have thousands of public complaints.
Recurring themes across G2, Gartner Peer Insights and PeerSpot: usability is the
most consistent criticism of both Clarity and Planview, because both were built
around executive reporting and financial oversight; building reports and pulling
insights takes heavy manual effort or custom development; interfaces are
described as clunky with rough navigation; and **resource capacity visibility is
poor — users struggle to compare actual against demand hours for a person.**

That last theme is the People tab's entire reason to exist, arriving from real
users rather than from us.

Method: pull 40–60 one- and three-star reviews from PMO-titled reviewers across
Planview, Clarity, Smartsheet and Monday. Tag by pain. Output: a pain inventory
with real quotes, mapped to the thirteen scenarios — which ones are confirmed,
which aren't mentioned by anyone, which pains we have no answer for.

#### 2. Artifact study (five emails, one week)

Ask three to five PMO leads for **the actual thing they send on Monday** — the
status deck, the exec email, the hand-coloured RAG sheet.

That artifact is what the product competes with. It tells you what they
actually track, what they leave out, what they say in words versus numbers, and
where the manual effort goes. Redesigning a real Monday email is a far stronger
premise than redesigning a hypothetical dashboard.

#### 3. Five interviews (two weeks)

Channels: PMI Toronto chapter, the delivery and PMO layer of current
professional contacts, r/projectmanagement.

One opening question: *walk me through last Monday morning, screen by screen.*

Then test the scenarios directly, without leading:
- "How would you find out that work you've delivered hasn't been invoiced?"
- "When a PM is overloaded, how do you find that out, and how fast?"
- "What do you do with a project that's on schedule but losing money?"
- "When was the last time a number in a status report turned out to be stale?"

Success criterion: at least four of the thirteen scenarios are recognised
unprompted as real problems, and at least one scenario we didn't write emerges.

---

### Prior art

Why this product's shape is what it is. The audit correctly flagged that none of
this was written down, and for a case study it's the section that proves the
problem is real.

#### Direct competitors — and their structural constraint

| Tool | Approach | Why it leaves room |
|---|---|---|
| **Power Query** | Combines a folder of files into one table | Requires each file to have the same columns with matching headings. One PM renaming "Baseline End" to "Planned Finish" breaks it. Also a developer-grade UI inside Excel. |
| **Sheetgo** | Connections that flow source spreadsheets into a master file | Creates a second artifact to maintain. Source files stay intact, but you now own a master too. |
| **Datarails / Cube** | Excel-native FP&A consolidation | Finance-shaped, not delivery-shaped. No RAID, milestones, or allocation model. |
| **Planview / Clarity** | Full enterprise PPM | Requires abandoning the spreadsheets. Six-month implementations, documented usability problems, and a steep curve for non-financial users. |
| **Smartsheet / Monday** | Replace the spreadsheet | Same requirement: change how everyone works first. |

**The gap:** every one of these requires either normalising the files or
abandoning them. Nothing reads a heterogeneous drive as-is. That's the wedge,
and it's why the mapping layer is the product rather than the dashboard.

#### Interaction precedents — what each contributes

| Product | The move stolen | Where it lands |
|---|---|---|
| **Oura / Whoop** | Composite score made trustworthy by showing contributors with size and direction | The teaching layer, `07-metrics-spec.md` |
| **Flighty** | Causality over status — not "delayed," but "the inbound aircraft is still in Denver" | Brief verdict sections: not "red," but "red on margin, not delivery" |
| **Stripe mobile** | Disputes and payouts as first-class objects with their own pages | Exception identity: an overdue invoice deserves its own sheet |
| **Linear Triage / PagerDuty** | A queue where every item carries a verdict | The overlay store — disposition without write-back |
| **SLO error budgets** | Budget-and-burn framing beats variance framing | Margin as a budget: 36.3% to spend, burned to 31.2% |
| **Epic Haiku / clinical early-warning scores** | A census with acuity flags, composite deterioration score, and rounds | The governing metaphor: seventeen projects is a ward round |
| **Copilot Money / Monarch** | Narrative that names the specific transaction causing the anomaly | Why the original "key decisions" tiles failed — no names, no amounts, no verbs |
| **Bloomberg mobile** | Dense instrument that assumes expertise, pairs with a desk product | The two-density model in `08-interaction-spec.md` |

#### What nobody does

- Reads a messy drive without asking you to fix it first
- Puts cell-level provenance on every displayed number
- Treats data freshness as a first-class portfolio signal
- Shows contingency coverage against weighted risk exposure
- Bridges project margin to EBITDA in the same tool

Those five are the case study.

---

<a id="s9"></a>

## 9. Open questions

*Source file: `06-open-questions.md`*

Genuinely undecided, with a recommendation on each. Ordered by how much
downstream work each one blocks.

#### Q1 — Case study or real build?
Blocks the phase order. A case study wants phases 1 and 3 done beautifully with
2 and 4 sketched. A real build wants phase 2 (provenance) before 3, because
retrofitting cell refs is a rewrite.

*Recommendation:* decide now, before any refactor. If uncertain, build as if
it's a real build — a case study made from working infrastructure is stronger
than the reverse, and the cost is one extra phase of invisible work.

#### Q2 — Whose drive?
One team's folder, or scattered across an organisation? This changes the ingest
story significantly: one folder means a watcher and a flat scan; scattered means
permissions, partial visibility, and "you can see 60% of the portfolio."

*Recommendation:* design for one folder in v1, but never assume completeness in
the copy. Findings should be able to say "of the files I can see."

#### Q3 — Rates visibility
Cost and bill rates currently sit on the person page, visible to anyone who can
open the app. For a shared exec briefing that may be intended. For a wider
audience it's a privacy decision, not a layout one.

*Recommendation:* one role flag, two rendering modes. Default to hiding cost
rates; the EBITDA bridge shows aggregates only.

#### Q4 — Does Mei see what Helena sees?
The overloaded PM is the user who keeps source files fresh, and also the
subject of unflattering findings. If the app only tells her she's failing, she
stops cooperating.

*Recommendation:* same findings, different framing. Her page leads with the
constraint (125% across three projects) rather than the outcome (health 0), and
surfaces the available swap. Never a "performance" view of a person.

#### Q5 — How much does the brief say out loud?
The worked P-1002 example deliberately leaves the reader to connect "$52,700
unused" to "$60,000 CR in limbo." That restraint is the product's voice — but
it risks the user missing the point entirely.

*Recommendation:* test both on two readers. The treatment-tier system supports
either; it's one threshold change.

#### Q6 — Snooze semantics
If Gordon snoozes an overdue invoice for a week and it worsens, does it return
early? Does a snooze survive the underlying file changing?

*Recommendation:* snooze until date OR until magnitude worsens by 20%,
whichever first. A snooze on a finding whose source cells changed returns
immediately.

#### Q7 — What happens when two files disagree?
Two spreadsheets both claim to know a project's forecast end date, with
different answers. This *will* happen — it's the normal state of a real drive.

*Recommendation:* the Ledger stores both with their cell refs, and precedence
goes to the more recently modified file. Disagreement is itself a finding
(`data.conflicting_sources`) and appears on the brief. This turns the product's
hardest problem into a feature nobody else offers.

#### Q8 — Planned projects
They have null health scores and are currently filtered out of most views —
which is exactly why scenario S10 (the $1.09M pipeline sanity check) is
invisible today.

*Recommendation:* planned projects get findings but no health score. Rules that
depend on health skip them; rules about commitment and capacity don't.

#### Q9 — Does the client become a first-class entity?
Scenario S6 needs a client brief. Clients are currently a subtitle. Twelve
clients is a small enough dimension that this is cheap.

*Recommendation:* yes, in phase 1. Same brief renderer, different entity. Near
zero marginal cost.

#### Q10 — Mobile-first still?
The original framing was a phone instrument. Gordon's AR working session and
Arjun's resourcing call are both desk jobs.

*Recommendation:* briefs are mobile-first (they're read and forwarded);
worklists are desk-first (they're worked). Don't force one density on both —
that inconsistency was already flagged in the original brief and this gives it
a principled resolution.

---

<a id="verification"></a>

## Verification record

Fifty-three assertions were checked programmatically against the workbook on
14 September 2026. Fifty passed on the first run. Three failed and have been
corrected in this document.

### Corrections applied

**1. Unbilled WIP was stated as a single net figure.**
The headline $2.12M is $2,117,514 net — comprising $2,357,242 of genuinely
unbilled work *less* $239,727 of over-billing on two projects. Netting them
hides a quarter of a million dollars of deferred-revenue exposure inside a
number that reads as an opportunity. The metrics spec now requires both sides
to be reported, and generalises the rule to any sign-netting metric.

**2. Re-baselined project count was wrong (stated 5, actual 9).**
An earlier query was truncated to five rows and the number propagated into two
documents. Nine projects carry a v2 Re-forecast (120 current estimate lines, 45
superseded).

**3. The claim that every re-baselined project is red or amber was false.**
Eight of nine are. The exception is Policy Admin Consolidation at health 96.
The corrected and stronger claim: **all four red projects have been
re-baselined.** Keeping the green exception visible is what stops the finding
from being a tautology.

### Verified as stated

Portfolio counts (17 active / 24 total, 4/4/9 RAG split), active contract value
$16.2M, portfolio margin 31.2% against a value-weighted target of 36.3%,
average health 74, overdue AR $789,504 across 6 invoices, outstanding AR
$1.94M, 6 critical open RAID, weighted exposure $1.63M, 8 pending CRs at
$402,000 cost impact, 4 overdue milestones with $445,500 uninvoiced across 3
billing milestones, 6 overallocated and 23 under-utilised people, 720 bench
hours per week, all table row counts, all client and project-level figures cited
in scenarios, and every formula in the metrics spec.

**The health score formula reproduces all 20 active and completed projects
exactly**, with zero error:

```
Health = max(0, round(100 − 150×max(0, burn − complete)
                          − 0.4×max(0, slip days)
                          − 150×max(0, target margin − forecast margin)))
```

### What verification could not establish

Every figure above is internally consistent and correctly computed. None of it
is evidence that the *product* is right — the workbook is synthetic, and all
thirteen scenarios remain untested with a real PMO lead. Section 8 covers that
gap and how to close it. Correct arithmetic on invented data is not validation.
