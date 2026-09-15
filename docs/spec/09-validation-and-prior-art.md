# Validation and prior art

The audit's most important finding: the thirteen scenarios are internally
consistent, derived from real rows, and **entirely unvalidated by any human
user.** They are hypotheses. Nothing in the other documents says so, and a
reader could reasonably assume they came from research.

This document marks that boundary and says how to close it.

---

## Status of the evidence

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

## Validation plan

Three methods, ascending cost.

### 1. Review mining (a weekend, citable)

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

### 2. Artifact study (five emails, one week)

Ask three to five PMO leads for **the actual thing they send on Monday** — the
status deck, the exec email, the hand-coloured RAG sheet.

That artifact is what the product competes with. It tells you what they
actually track, what they leave out, what they say in words versus numbers, and
where the manual effort goes. Redesigning a real Monday email is a far stronger
premise than redesigning a hypothetical dashboard.

### 3. Five interviews (two weeks)

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

## Prior art

Why this product's shape is what it is. The audit correctly flagged that none of
this was written down, and for a case study it's the section that proves the
problem is real.

### Direct competitors — and their structural constraint

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

### Interaction precedents — what each contributes

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

### What nobody does

- Reads a messy drive without asking you to fix it first
- Puts cell-level provenance on every displayed number
- Treats data freshness as a first-class portfolio signal
- Shows contingency coverage against weighted risk exposure
- Bridges project margin to EBITDA in the same tool

Those five are the case study.
