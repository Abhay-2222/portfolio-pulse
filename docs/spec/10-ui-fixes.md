# UI fixes — the four false claims

Found by auditing the built UI against the workbook. Each one is visible to a
user and checkable by them. Fix all four before any design work.

---

## BUG-1 — The health explainer states the opposite of the truth

**Where:** project detail, the "Why {score}" disclosure.

**Observed:** Loyalty Program Relaunch shows *"Why 0: red on margin, not
everything"* — with `Cost Red`, `Schedule Red`, `Margin Red` rendered as three
pills immediately below it.

**Truth:** all three legs are Red. Health contributors are margin shortfall
−66.1, cost over-burn −38.1, schedule slip −22.0.

**Cause:** the explainer assumes exactly one leg is worst and phrases it as an
exclusion. It never checks how many legs are non-green.

**Correct behaviour:**

```ts
function healthExplainer(p: Project): string {
  const bad = legs(p).filter(l => l.rag !== "Green");
  const top = contributors(p).sort((a,b) => b.deduction - a.deduction)[0];
  if (bad.length === 0) return `Health ${p.health}: on track on all three.`;
  if (bad.length === 1) return `Health ${p.health}: ${bad[0].name} only. Everything else is clean.`;
  if (bad.length === 3) return `Health ${p.health}: red on all three. ${top.label} is the biggest hit — ${Math.round(top.deduction)} of 100 points.`;
  return `Health ${p.health}: ${bad.map(b=>b.name).join(" and ")}. ${top.label} costs the most — ${Math.round(top.deduction)} points.`;
}
```

**Tests:**
- `P-1017` → contains "all three", does not contain "not everything"
- `P-1015` (Green, health 96) → contains "on track"
- any project → explainer never claims a leg is clean when `legs[x] !== "Green"`

---

## BUG-2 — One concept, three different numbers

**Where:** Pulse briefing says `$477k`. Triage queue says `$231k`. Project
detail says `$93k`.

**Truth:** uninvoiced billing milestones, portfolio-wide, is **$445,500** across
**3** milestones. Loyalty's share is **$93,000**. Neither $477k nor $231k is
derivable from any defensible filter.

**Correct behaviour:** one function, one definition, scope as a parameter.

```ts
uninvoicedBillingMilestones(scope: "portfolio" | ProjectId): Money
// IsBillingMilestone = "Yes" AND Invoiced = "No" AND ForecastDate < asOf
```

Every rendering of the figure carries its scope in the copy: *"$445,500 across
the book"* / *"$93,000 on this project."*

**Tests** (from `ground-truth.json`):
- `portfolio.uninvoicedBillingMilestones === 445500`
- `portfolio.uninvoicedBillingMilestoneCount === 3`
- `projects["P-1017"].uninvoicedMilestones === 93000`
- no screen renders a value for this concept not produced by this function

---

## BUG-3 — Green "On track" pill on a 53-day overdue invoice

**Where:** invoice detail, INV-00068.

**Observed:** `Harbourview Logistics · 31-60 · 53d overdue` and directly below,
a green `○ On track` badge.

**Truth:** the invoice status is **Overdue**. The green is project P-1016's RAG,
rendered in the invoice's status position.

**Correct behaviour:** an entity's status slot shows *that entity's* status. The
related project's RAG belongs in the related-project row, labelled as the
project's.

```
INV-00068          ▲ Overdue · 53 days
...
Project   Warehouse Robotics Integration   ● On track   → Open
```

**Tests:**
- every invoice with `Status === "Overdue"` renders an overdue badge in the
  header slot
- no entity header renders a RAG belonging to a different entity

---

## BUG-4 — An internal ranking score displayed as currency

**Where:** invoice detail, `Collectability 53,354` in a 2×2 grid beside
`Amount $43,539`, same typeface, comma-grouped.

**Truth:** collectability is an unbounded internal rank combining amount, age,
client tier and project RAG. It has no unit and is meaningless in isolation.

**Correct behaviour:** never render the raw score. Use it to order the list, and
express position in words.

```
Chase order: 3rd of 17
Why: $43,539 · 53 days · key client · project on track
```

**Tests:**
- the string `collectability` does not appear in any rendered numeric slot
- invoice lists are ordered by the score descending
- the "why" line names the four inputs

---

## Smaller defects

| ID | Where | Problem | Fix |
|---|---|---|---|
| BUG-5 | Pulse | "1 overdue milestones" | pluralise on count |
| BUG-6 | Triage queue | "$231k is billable now" card shows a sparkline labelled "Margin, 8 months" | a finding's chart must plot the finding's own metric, or show none |
| BUG-7 | Risk detail | FX exposure shows `Target Feb 15, 2026` neutrally; `PastTarget = Yes`, ~7 months late | past-target dates render in the overdue treatment with elapsed days |
| BUG-8 | Projects list | unlabelled red/grey bar under each row — unclear whether it is health, complete, or burn | label it or remove it |
| BUG-9 | Project detail | Health 0 renders as a dot at the far left of an unlabelled track | the track needs 0 and 100 anchors, or replace with the contributor breakdown |
| BUG-10 | Money | two stacked bars with no legend; colours carry all meaning | label both; add non-colour encoding per accessibility rules |

---

## Regression guard

Add a single test that walks every rendered figure in a snapshot and asserts:

1. it appears in `ground-truth.json` or is derived by a function under test
2. it carries a scope label
3. its accompanying prose contains no claim contradicted by a sibling element

Point 3 is the one that would have caught BUG-1 and BUG-3.
