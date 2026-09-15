# Users, scenarios, and stories

Every scenario below is drawn from real rows in
`Enterprise_Portfolio_Data.xlsx`. None are invented. That matters: if the
product can't deliver these thirteen moments against this book, it doesn't
work.

---

## The users

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

## The thirteen scenarios

### S1 — Monday briefing (U1)
Four reds are known. What isn't: the same overloaded PM leads two of them, one
client accounts for both a red project and half the overdue AR, and Loyalty
Program Relaunch now forecasts **negative margin** (−14%) — it stopped being a
delivery problem and became a money problem.
**Value:** the briefing names Mei Fraser, not "6 people are overallocated."
**Fails if:** it shows the same four reds, dressed up nicer.

### S2 — Building the case for help (U2)
Mei is at 125% across 3 projects, is delivery lead on the worst engagement
(health 0, 55 days slipped), and owns the critical risk on it that blew its
target date in July. She currently builds this argument by hand in a deck.
**Value:** the app makes her argument from the same numbers her director sees.
**Fails if:** it reads as surveillance. She'll never open it again.

### S3 — Which invoice to chase (U3)
$789,504 overdue across six invoices. Age alone doesn't rank them. The 95-day
Aurora invoice belongs to a client whose delivery is red — pushing hard risks
the relationship. The $194,000 Pinecrest invoice is 3 days over and needs a
nudge.
**Value:** sorted by collectability and consequence, not by days overdue.
**Fails if:** it's an aging report. He already has one.

### S4 — Staffing the next project (U4)
He needs React capacity in two weeks. "720 bench hours" is useless. Omar Bose
and Leila Nguyen are both React and both already over 100%.
**Value:** named shortlist with the consequence of each pick attached.
**Fails if:** utilization percentages with no blast radius.

### S5 — The EBITDA question (U7)
Told the portfolio runs at 31.2% against a 36.3% target. She wants the bridge
to what the business actually earns, after bench, PMO overhead, and unrecovered
contingency.
**Value:** one screen, each leak named and sized.
**Fails if:** it repeats the margin number her CFO already emailed.

### S6 — The client review (U5)
Aurora Retail Group: $702,500 outstanding — highest of twelve clients — on the
longest terms in the book (60 days), across one red and one amber project. She's
about to ask for more work from a client she's failing and under-collecting
from.
**Value:** the client becomes a real dimension, not a subtitle.
**Fails if:** she must assemble it by filtering four tabs.

### S7 — The change board (U6)
Fraud Detection ML Platform is red: health 22, 66 days slipped, 15.9% margin. In
his queue: a latency target change at −$20,000 margin and a data residency
re-architecture at −$110,000 and +35 days. Approving both takes it to roughly
break-even.
**Value:** the app models the consequence of a decision not yet made.
**Fails if:** CRs are listed with dollar amounts and no context.

### S8 — The unbilled milestone hunt (U3)
Three billing milestones passed their forecast date and were never invoiced:
$205,500 (Claims Automation), $147,000 (311 Citizen Services), $93,000
(Loyalty). **$445,500 of earned, billable work that never became an invoice** —
so it isn't in AR and nobody is chasing it.
**Value:** the app finds money nobody was looking for. Highest-value moment in
the product.
**Fails if:** it only reports invoices that exist.

### S9 — The leak has a name (U7)
Noor Sato: cloud engineer, Azure, 0% allocated, 0% billable YTD, $126.90/hr, 40
hours free — roughly $5,076/week of cost no project carries. Meanwhile a CR to
add 40 VMs to a cloud migration has sat in review for 81 days.
**Value:** the abstraction becomes one idle specialist and one stalled decision,
obviously related.
**Fails if:** "720 bench hours" and she does the arithmetic.

### S10 — Pipeline sanity check (U1)
Municipal Asset Management, $1,090,000, starts January 2027, strategic score 9.
Client is Bluewater — currently owner of a red project at health 30 owing
$220,500. Assigned PM: Mei Fraser, at 125%.
**Value:** checks a future commitment against present reality.
**Fails if:** planned projects are filtered out for having no health score.

### S11 — The swap is in the same file (U4)
Mei at 125% across three. Noah Rahimi: PM, 50% allocated, 30% billable YTD, at a
*lower* cost rate. The fix is one row from the problem.
**Value:** the app proposes the reassignment with both sides of the trade.
**Fails if:** it flags overallocation without the alternative.

### S12 — The contingency he forgot (U2-type: Liam Roy)
Claims Automation carries $52,700 of contingency, untouched, status "Reserve."
Meanwhile a $60,000 unfunded rework CR sits 53 days in review and a $47,200
dependency risk is due in nine days. He has been eroding margin instead of
drawing the reserve that exists for exactly this.
**Value:** the app teaches him something about his own project.
**Fails if:** contingency stays one row in a budget breakdown.

### S13 — "The RAG is a lie" (U1)
Six of seventeen projects report from files nobody has touched in 30+ days.
Their greens aren't green; they're stale.
**Value:** confidence becomes visible. Every number carries an age.
**Fails if:** freshness is a footnote rather than a Pulse-level signal.

---

## User stories

Format: *As [user], when [trigger], I want [capability] so that [outcome].*
Acceptance criteria are testable against the master workbook.

### Portfolio

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

### Project

**US-04** As Liam, when I open my project, I want a brief that tells the story
with problems inside it, so that I understand cause rather than symptom count.
- Escalated findings appear above the narrative
- Narrative states which RAG legs are healthy
- No finding appears twice in different treatments

**US-05** As Liam, I want to see unused contingency next to open risk exposure,
so that I know whether the project can absorb its own risk.
- Coverage ratio = contingency remaining ÷ weighted open exposure

### Money

**US-06** As Gordon, when I open Money, I want overdue invoices ranked by
collectability, so that I make the right five calls.
- Rank combines amount, age, client tier, and project RAG
- Ranking rationale visible per row

**US-07** As Gordon, I want billing milestones that passed without an invoice,
so that I can bill work already earned.
- Surfaces milestones where `IsBillingMilestone = Yes`, forecast date passed,
  `Invoiced = No`
- Totals shown as a single figure

### People

**US-08** As Arjun, when someone is overallocated, I want the available
alternative shown beside them, so that the fix arrives with the problem.
- Match on primary skill and role
- Show cost rate delta and current billable ratio

**US-09** As Arjun, I want bench expressed as named people with skills, not
aggregate hours.

### Client

**US-10** As Sophie, I want one page per client covering every project,
invoice, and open risk, so that I can prepare for a QBR in one screen.

### Decisions

**US-11** As Marcus, I want each pending change request shown against its
project's current health, so that I can see the post-approval position.
- Show forecast margin before and after
- Show days-in-review as its own signal

### Ingest (phase 3+)

**US-12** As Helena, when I point the app at a folder, I want proposed project
groupings I can confirm or correct, so that setup takes minutes not a workshop.
- Groupings proposed with a confidence indicator
- Every proposal reversible
- Confirmed mappings reused automatically on the next file of the same shape

**US-13** As any user, when a file has an unrecognised shape, I want it queued
rather than silently ignored.
