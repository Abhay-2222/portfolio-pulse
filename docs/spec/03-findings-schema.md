# The Finding schema and rule library

One object powers every surface. Pulse sorts and filters findings. Entity
briefs weave the same findings into prose. One rule library, two renderers, no
duplicated logic.

---

## The `Finding` object

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

### Why `related` matters most

The design rule from the scenario work: **if a finding involves one table it's
a report; if it involves two it's the product.** `related` is where the
collision lives — the risk owner who is also overallocated, the invoice whose
client is also red. A rule that produces an empty `related` array should be
scrutinised.

---

## Treatment tiers

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

## Brief sections

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

## Rule definition format

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

## Seeded rule library

Thirty to fifty rules produce the entire perceived intelligence of the product.
These sixteen are seeded from real collisions in the workbook.

### Money

| Rule | Fires on | Real instance |
|---|---|---|
| `milestone_passed_unbilled` | Billing milestone past forecast, not invoiced | $445,500 across 3 milestones |
| `overdue_ar_ranked` | Overdue invoice, ranked by amount × age × tier × project RAG | $789,504 across 6 invoices |
| `overbilled_wip` | UnbilledWIP < 0 | P-1003 (−$173,558), P-1008 (−$66,169) |
| `client_concentration` | One client > 25% of total outstanding AR | Aurora: $702,500 of $1.94M |
| `margin_below_floor` | ForecastMarginPct < MarginFloor | P-1017 at −14.0% |

### Risk and coverage

| Rule | Fires on | Real instance |
|---|---|---|
| `contingency_unused_while_red` | Contingency BurnPct = 0 AND OverallRAG = Red | P-1002: $52,700 in reserve |
| `contingency_coverage_thin` | Contingency remaining ÷ weighted exposure < 1 | portfolio-wide check |
| `critical_risk_past_target` | Severity Critical, Status ≠ Closed, PastTarget = Yes | R-0038, R-0043, R-0047 |
| `risk_owner_overallocated` | RAID owner CurrentAllocationPct > 1.0 | R-0038 → Mei Fraser (125%) |
| `risk_due_imminent` | Critical risk, TargetDate within 14 days | R-0055, due 20 Sep |

### Decisions

| Rule | Fires on | Real instance |
|---|---|---|
| `cr_stalled_in_review` | IsPending = Yes AND DaysInReview > 45 | CR-006 (81d), CR-008 (67d), CR-003 (53d) |
| `cr_would_break_margin` | Pending CR MarginImpact would push project below floor | CR-009: −$110k on P-1005 |

### People

| Rule | Fires on | Real instance |
|---|---|---|
| `overallocated_with_swap` | Allocation > 100% AND a same-skill person < 60% exists | Mei (125%) ↔ Noah Rahimi (50%) |
| `idle_specialist_cost` | Allocation = 0 AND BillableRatioYTD = 0 | Noor Sato, ~$5,076/week |
| `concentrated_on_reds` | One person allocated to 2+ Red projects | Victor Chen (150%, 4 assignments) |

### Data quality

| Rule | Fires on | Real instance |
|---|---|---|
| `stale_source` | Source file untouched > 30 days | phase 3 onward |

---

## Worked output — P-1002, Claims Automation

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

## Hard constraint on prose

Templates with guards, never generative text. One sentence saying "schedule is
fine" about a project the client thinks is late loses the user permanently.
Every claim in a brief must be traceable to a `CellRef`.

---

## Finding lifecycle

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

### Decay rules

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

### Resolution detection

A finding is resolved when its `when` clause stops matching. The closing
finding matters — Gordon needs to know the $205,500 got invoiced, and that
confirmation is what makes him trust the next one.

---

## Additional rules — the unmined sheets

Two sheets carried no rules in the first pass.

### Estimates (165 rows, 9 projects with two versions)

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

### Actuals (1,400 rows, with a vendor column)

| Rule | Fires on | Real instance |
|---|---|---|
| `vendor_concentration` | One vendor > 25% of a project's non-labour spend | 74 subcontractor rows, 388 AP invoices |
| `spend_acceleration` | Latest closed period > 1.5× trailing 3-period average | early warning ahead of RAG |
| `unbilled_expense` | `Billable = Yes` in Actuals with no matching invoice line | direct cash finding |

`spend_acceleration` is worth building early: it fires *before* cost RAG turns,
which makes it the only genuinely predictive rule in the library.
