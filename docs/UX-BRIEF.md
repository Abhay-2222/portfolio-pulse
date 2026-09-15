# Portfolio Pulse — product and UX brief

Product brief for a mindful UI redesign. Mapped from the expandable-bento branch running locally, plus live `GET /api/portfolio` against `data/Enterprise_Portfolio_Data.xlsx`. Workbook as of **11 September 2026**.

This app is a **briefing instrument, not a spreadsheet**. It takes an enterprise PMO workbook (projects, people, money, RAID) and answers one question on a phone: **what needs attention this week, and where do I drill?**

It is built for a portfolio director, PMO lead, or delivery exec who already lives in Excel. It should feel like an Apple-style Instrument: glanceable health, then one tap into the project, person, invoice, or risk behind the number. It is **read-only**. Nobody updates status here.

---

## Live snapshot (design against this book)

| Signal | Value |
|---|---|
| Active projects | 17 (24 total) |
| Active contract value | $16.2M |
| Forecast margin | 31.2% vs 36.3% target |
| Average health | 74 (0–100) |
| Off track / watch / on track | 4 / 4 / 9 |
| Overdue AR | ~$790k (of $1.94M outstanding) |
| Unbilled WIP | $2.12M |
| Overallocated people | 6 |
| Under-utilized | 23 |
| Bench capacity | 720 hours/week free |
| Critical open RAID | 6 |
| Weighted open risk exposure | $1.63M |
| Pending change requests | 8 ($402k) |
| Overdue milestones | 4 |

Source: local `/api/portfolio`.

---

## The job, in five questions

Every screen exists to answer one of these. If a UI idea does not make one of them faster, it is decoration.

| Question | Tab | What success feels like |
|---|---|---|
| Is the book healthy, and what should I do first? | Pulse | A sentence, not a dashboard wall. Then 3–4 concrete next moves. |
| Which engagements are in trouble, and why? | Projects | Filter to red/amber, see cost vs schedule vs margin, open one project. |
| Who is overloaded or sitting idle? | People | Spot over/under allocation, jump to a person, see current projects. |
| Where is cash stuck? | Money | Overdue invoices to chase, earned work not billed, thinnest margins. |
| What will blow the plan next? | Risks | Critical RAID, overdue milestones, pending change requests with $ and days. |

---

## Who uses it

**Primary: portfolio / PMO lead.** Opens Pulse on Monday. Wants the briefing sentence, the red projects, overdue cash, and overloaded names. Rarely needs WBS lines or timesheet history. Time budget: two minutes, then a drill-in.

**Secondary: PM, finance, resource manager.** Enters from a filtered list (red projects, overdue AR, overallocated). Needs enough detail to act in another system: who is on the team, which invoice, which RAID owner, which milestone slipped. They do not file time or approve CRs here.

---

## How the app is structured

Sticky header (title + as-of date) and a five-tab bar that never changes: **Pulse / Projects / People / Money / Risks**. Two detail routes sit under Projects and People. There is no search, no login, no settings screen, no timeline, and no matrix view yet.

| Route | Role in the product | Main interactions |
|---|---|---|
| `/` | Briefing home | Read sentence → tap spectrum dot, RAG count, or expandable tile → leave to a list or detail |
| `/projects` | Filterable engagement list | Chips: Active / Attention / Off track / All. Tap tile to expand, then Open project |
| `/projects/[id]` | Engagement dossier | Health + money + current team + milestones + open RAID + invoices. Team rows go to people |
| `/people` | Capacity list | Chips: All / Overallocated / Under-utilized / Healthy. Row opens person |
| `/people/[id]` | Person dossier | Allocation %, rates, current vs historical assignments with project RAG |
| `/money` | Cash and margin worklist | Chips: Overview / Overdue / Unbilled. Rows open the related project |
| `/risks` | Threat worklist | Chips: All open / Critical / Risks / Issues. RAID, overdue milestones, pending CRs → project |

**Drill-down always lands on a project.** Invoices, RAID items, milestones, and change requests have no pages of their own. Every exception is a row that opens `/projects/[id]`. A better UX can keep that (one destination) or give exceptions their own identity (invoice, RAID, CR) so the user is not dumped onto a long project page.

---

## What each screen actually does

### Pulse — the briefing

This is the product. It is built as stacked bento cards in the visual language of abhay-sharma.com: uppercase mono labels, accent `#2E6DB4`, tap-to-expand tiles.

| Block | Function | UX note |
|---|---|---|
| Briefing sentence | Priority-ordered one-liner: off-track count first, else watch, else all-clear. Always mentions forecast margin vs target. | This is the only narrative in the app. Worth owning in a redesign. |
| Spectrum | Each active project is a colored dot. X = health 0–100. Size = contract value. Color = overall RAG. Tap → project. | Beautiful but unlabeled. Dots collide. No legend for size. Hard on a phone. |
| RAG counts | Off track / watch / on track chips → `/projects?rag=Red\|Amber\|Green` | The clearest way onto the projects list. |
| Situation / Outcome | Active count + contract $ vs forecast margin, gap to target, average health. | Situation is inventory. Outcome is the number leadership cares about. |
| Key decisions | Four canned plays: stabilize reds, collect AR, rebalance people, protect margin from RAID/CRs. | Titles are live KPIs. Body copy is templated advice, not real decisions from the workbook. |
| Needs attention | Top 6 active Red/Amber projects, worst RAG then lowest health. Expand for slip, $, cost/schedule/margin RAG. | Capped at 6. “Show all” goes to a filtered list. |
| Money + People & risks | Preview tiles: thinnest margins, unbilled WIP, overallocated names, sample open RAID. | Duplicates Money and Risks tabs. Useful as teasers if they stay short. |

### Projects — the engagement list

Default filter is Active. Sort is always RAG then health (red first). Each row shows name, client, portfolio, overall RAG glyph, forecast margin. Expand reveals health, slip days, contract $, and the three RAG legs (cost / schedule / margin).

Filters exist as URL chips but most chips do not look selected. There is no search, no sort control, no grouping by portfolio/client, and no Planned vs On Hold vs Completed except via All.

### Project detail — the dossier

Header: client, portfolio, PM, status, phase, overall RAG, health score. Stats: contract, forecast margin, % complete, slip days, plus the three RAG pills.

| Section | Shows | Does not show (but data exists) |
|---|---|---|
| Money | BAC, spent, EAC, ETC, invoiced, unbilled WIP | CPI/SPI, earned vs planned value, VAC, budget-by-category, actuals by period |
| Team | People allocated as-of today, role, % → person page | Billable flag, planned hours/cost, historical team, skill |
| Milestones | Name, forecast date, status (Completed / Overdue / At Risk / On Track) | Baseline vs actual date, billing milestone flag, % billable |
| Open RAID | Top 8 by risk score: title, type, severity, $ exposure → `/risks` | Mitigation, probability × impact, owner, target date |
| Invoices | Top 8: id, date, paid/overdue/outstanding, amount | Aging bucket, due date, linked milestone, description |

### People — capacity

Portfolio strip: N overallocated · N under-utilized · bench hours/week free. List is every resource, sorted overallocated → under-utilized → healthy, then highest allocation %. Row: name, role, department, utilization status, current allocation %.

Status color is the only signal. No sparkline of load, no “on which red projects,” no skill filter. Bench hours are summed available hours, not named people on the bench.

### Person detail

Role, level, location, department, manager. Stats: allocation %, utilization status, free hours this week, billable hours YTD. Then cost rate, bill rate, weekly capacity, start date. Current allocations (as-of) with project RAG; then last 12 assignments historically.

**Rates are on the person page.** Cost and bill rates are visible to anyone who can open the app. For a shared exec briefing that may be intended; for a wider audience it is a privacy/UX decision, not just a layout one.

### Money — cash worklist

Hero stats: forecast margin vs target, active contract, overdue AR of outstanding AR, unbilled WIP; then budget / spent / EAC. Three modes:

| Mode | List | Sorted by |
|---|---|---|
| Overview | Open invoices (not paid) + unbilled projects + 8 thinnest active margins | Overdue first, then amount; unbilled by WIP desc; margins lowest first |
| Overdue | Overdue invoices only | Same invoice sort |
| Unbilled | Active projects with Unbilled WIP > 0 (max 8) | WIP descending |

Invoice due date uses the client’s payment terms. Aging buckets (Current / 1–30 / 31–60 / 60+) are computed and never shown.

### Risks — threat worklist

Hero: critical open count, weighted exposure $, pending CR count and $, overdue milestone count. Then three independent lists: open RAID (max 20), overdue milestones (max 10), pending CRs (Draft or Submitted, max 10). RAID can be filtered by severity or type (Risk / Issue only — Dependency and Assumption have no chip).

---

## Signals the product is built around

RAG is not a PM opinion. Overall RAG is the **worst of three computed legs**. Planned projects are N/A with a null health score.

- **Red** = off track
- **Amber** = watch
- **Green** = on track
- **N/A** = planned / not started

**Cost RAG.** Budget burn minus % complete. If spend is running ahead of earned work past amber/red thresholds → Amber then Red.

**Schedule RAG.** Slip days = forecast end minus baseline end. Thresholds from workbook settings (amber days / red days).

**Margin RAG.** Forecast margin = (contract − EAC) / contract. Red below floor, Amber below target minus tolerance.

**Health score** (active/completed only) starts at 100 and is penalized for over-burn vs complete, schedule slip, and margin below target. Floor is 0. Users see a number; they do not see the formula. That is a teaching opportunity in the UI.

---

## What the engine knows that the UI hides

This is the richest seam for a better experience: the workbook is a full PMO system. The app currently surfaces exception lists, not the underlying story.

| In the data | Used for metrics? | Shown in UI? |
|---|---|---|
| Estimates / WBS / confidence | No | Never |
| Budget lines by category | Rolled into BAC | Never as a breakdown |
| Actuals by period, vendor, hours | Rolled into cost & YTD hours | Never as a ledger |
| Monthly snapshots (RAG, EAC, slip over time) | Parsed | Never — no sparkline or timeline |
| CPI, SPI, EV, PV, VAC | Computed per project | Never shown |
| Strategic score, priority, contract type, sponsor | On the project record | Never shown |
| Client industry, region, tier, payment terms | Terms → invoice due date | Name only |
| RAID mitigation, probability, impact, owner dates | Score + $ exposure | Type, severity, $ only |
| Invoice aging buckets | Computed | Status + days overdue only |
| Milestone billing % / is-billing | WIP uses % complete × contract | Name + forecast + status |
| Person skill, employment type, hours logged YTD | Billable YTD shown | Skill unused |

---

## Interaction patterns already in the product

**Expand in place.** Pulse and Projects use ExpandableTile: tap the row, detail unfolds under it, then a link leaves the page. People / Money / Risks skip expand and go straight to a project or person. A redesign should pick one pattern (or a clear reason for both).

**Filter via URL chips.** Lists are filtered with query params (`rag`, `status`, `focus`, `type`, `severity`). Money chips show active state; Projects / People / Risks chips do not. Deep links from Pulse already depend on these URLs.

**As-of is a stamp, not a control.** Header shows “As of 11 Sep 2026”. Allocations, overdue, and utilization all use that date. The user cannot scrub it. Snapshots exist if you later want a time slider.

**Lists are truncated.** Attention 6, RAID 8 on a project / 20 on Risks, invoices 8 / 12, assignments 12, unbilled 8, CRs 10. There is no pagination and often no “showing N of M”. Easy to miss the rest of the book.

---

## Live book, so you design against reality

| Slice | Count / amount | Why it matters for layout |
|---|---|---|
| Projects | 24 total (17 active, 3 planned, 3 completed, 1 on hold) | A phone list of 17 is fine; 200 would not be |
| Portfolios | 5 named books (CX, Ops, Data & AI, Cloud, Digital) | Grouping is unused but available |
| People | 63 resources, 145 allocations, 6 over / 23 under / 720h bench | People tab will feel long; needs grouping or search |
| Money | $1.94M outstanding AR, $790k overdue, $2.12M unbilled WIP | Cash is a first-class emergency, not a footnote |
| Threats | 72 RAID, 120 milestones (4 overdue), 23 CRs (8 pending, $402k) | Risks tab is three products in one |
| Clients | 12 | Could be a dimension; currently just a subtitle |

---

## UX tensions to resolve in a better UI

1. **Briefing vs archive.** Pulse already tries to be a Monday instrument. The other tabs are closer to a database. Decide whether Pulse is the product and the rest are worklists, or whether every tab should brief.

2. **Explain the number.** Health, RAG legs, EAC, unbilled WIP, and “bench hours” are expert terms. The current UI assumes the user already speaks PMO. A better UI either teaches in place (expand, footnote, formula) or rewrites into action language (“4 weeks late”, “we have billed less than we have earned”).

3. **One destination vs exception identity.** Everything drills to a project. That is simple. It also means an overdue invoice and a critical risk look the same at the end of the tap. Consider a project page that opens scrolled to the right section, or lightweight sheets for invoice / RAID / person-on-project.

4. **Spectrum is the brand and the weakest control.** Size-by-value and color-by-RAG is the right idea (where is the money at risk). On mobile it needs names, a legend, and a way to read overlapping dots.

5. **Key decisions are fake decisions.** They are KPI tiles with stock coaching. Either generate real next actions from the data (named project, named person, named invoice) or stop calling them decisions.

6. **Time is missing.** Snapshots, actuals-by-period, and allocation date ranges are in the file. The UI is a single as-of still. Matrix/Timeline were the planned next views for a reason.

7. **Visual language is split.** Pulse/Projects = bento + expand. Detail/People/Money/Risks = iOS grouped lists. Filter chips are inconsistent. A redesign should unify density, selected states, and how a row discloses vs navigates.

---

## Design constraint from the data layer

Runtime field names are the source of truth (`CurrentContractValue`, `ForecastMarginPct`, `OverallRAG`, `HealthScore`, `UnbilledWIP`, `UtilizationStatus`). The UI should not invent aliases that fight the workbook. Currency is in settings (USD in this book). As-of and RAG thresholds are workbook settings, not hardcoded in components — good. Keep presentation logic in the view, keep formulas in `lib/metrics`.

**Not in this product yet:** Matrix, Timeline, PWA refresh, Microsoft Graph / live sheet, auth, write-back.
