# Copy and number rules

Templates with hard guards. Never generative prose. One sentence that is wrong
about something the user can see loses them permanently — that is how BUG-1
happened.

---

## Scope labels

Every figure declares its scope, in the copy, not in a tooltip.

| Scope | Phrasing |
|---|---|
| Portfolio | "across the book" / "portfolio-wide" |
| Project | "on this project" / "on {ProjectName}" |
| Person | "for {Name}" |
| Client | "with {ClientName}" |
| Period | "this week" / "since {date}" |

Never render a bare figure whose scope is ambiguous. The $477k / $231k / $93k
failure was three renderings of one concept with no scope anywhere.

---

## Number formatting

| Type | Rule | Example |
|---|---|---|
| Currency ≥ $1M | 1 decimal, abbreviated | `$16.2M` |
| Currency $10k–$1M | abbreviated, no decimal, in headlines | `$445k` |
| Currency, exact, in detail | full, comma-grouped | `$445,500` |
| Currency < $10k | full | `$5,076` |
| Percent | 1 decimal | `31.2%` |
| Percentage-point delta | "pts", signed | `−5.1 pts` |
| Days | integer + "d" in chips, words in prose | `55d` / "55 days late" |
| Score, unbounded internal | **never rendered** | see BUG-4 |

One concept keeps one abbreviation level within a screen. Don't show `$445k` in
the hero and `$445,500` two cells down.

Currency symbol and locale come from `Settings.Currency` (this book: CAD).
Never hardcode `$`.

---

## Action language

Headline uses action language; the expansion teaches the metric.

| Don't say | Say |
|---|---|
| "Health 43" | "Losing money faster than it's delivering" |
| "Schedule slip 17d" | "About three weeks behind" |
| "Unbilled WIP $233,400" | "We've delivered $233,400 more than we've billed" |
| "Unbilled WIP −$173,558" | "We've billed $173,558 more than we've delivered" |
| "CPI 0.81" | "Every dollar spent buys 81 cents of progress" |
| "Bench 720 hrs/week" | "18 people's worth of unsold capacity" |
| "Overallocated 125%" | "Carrying a quarter more than a full load" |

---

## The briefing sentence

The current build concatenates four unrelated headlines into one paragraph. A
briefing is not a concatenation.

**Structure:** one lead finding, stated as a move. Then at most two supporting
clauses that bear on that move. Then, separately, the all-clear.

Bad (shipped):
> 4 projects are off track. Loyalty Program Relaunch forecasts -14.0% margin.
> $477k of earned work was never invoiced. Mei Fraser is at 125%; Noah Rahimi
> is at 50%.

Four topics, no verbs, and Noah appears with no stated reason — the swap is the
whole point and the sentence never makes it.

Good:
> **Move Loyalty Program Relaunch to Noah Rahimi.** It forecasts −14% margin at
> 55 days late, and Mei Fraser is carrying it at 125% across three projects.
> Noah is at 50% on the same skill.
>
> Separately, $445,500 is billable across the book and has never been invoiced.
>
> Nine active projects are clean on cost, schedule and margin.

**Rule:** if a name appears, its reason for appearing must appear in the same
sentence.

---

## Stating what is fine

A brief must be able to say a thing is healthy. An exception list has no grammar
for this, and its absence is why alert-led UIs feel untrustworthy — the reader
cannot distinguish "nothing else is wrong" from "nothing else was checked."

- Always state the clean legs by name: "Cost and schedule are inside tolerance."
- Never claim all-clear over stale sources. "Nine projects are clean; six report
  from files over 30 days old and are not counted here."

---

## Forbidden constructions

| Never write | Why |
|---|---|
| "red on margin, not everything" (or any exclusion) unless exactly one leg is non-green | BUG-1 |
| a status belonging to a different entity in an entity's status slot | BUG-3 |
| an unbounded internal score as a displayed figure | BUG-4 |
| a bare figure with no scope | BUG-2 |
| "No data" as an empty state | use progressive unlock copy |
| "N items" where N is 1 and the noun is plural | BUG-5 |
| a chart labelled with a metric other than the finding's own | BUG-6 |

---

## Empty states — progressive unlock

Name the capability, quantify the gap, estimate the effort, offer the action.

```
Schedule health unavailable
No baseline end dates are mapped yet. Map one column to unlock schedule
RAG and slip tracking for 14 projects. About 2 minutes.
[ Map it ]
```

Never a generic "no data" or an empty card.

---

## Staleness copy

| Context | Copy |
|---|---|
| Single entity | "Reporting from a file last updated 34 days ago." |
| Portfolio | "6 of 17 projects report from files not updated in 30+ days." |
| Export footer | "As of 11 Sep 2026. 6 projects reporting from files over 30 days old." |

A forwarded brief that loses its staleness caveat is worse than no brief.

---

## Finding lifecycle copy

| State | Copy addition |
|---|---|
| New | "New this week" |
| Unchanged 5+ cycles | "Unchanged for six weeks" — and demote one tier |
| Worsened >20% | "Up from $64,000 three weeks ago" — restore full tier |
| Resolved | "Invoiced 12 Sep. Closed." — emit once, then drop |

A risk unchanged for six weeks with a named owner is not being managed. Say the
age rather than repeating the original alert.

---

## Person copy — the one place tone is load-bearing

Person briefs are not performance reviews. The PM whose files feed this app
stops maintaining them if it reads as surveillance.

- **Lead with the constraint, not the outcome.** "Carrying three projects at
  125%" — not "owns the worst project in the book."
- **Always surface the relief.** If a swap exists, it appears on the same card
  as the overload.
- **Never aggregate a person's projects into a judgement about the person.**
  Health scores belong to projects.
