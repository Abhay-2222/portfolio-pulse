# Interaction spec

The gap the audit found: six documents, no UI. This covers screen inventory,
states, density, accessibility, and the two things that only existed in
conversation — progressive unlock and the spectrum resolution.

---

## Density model

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

## Screen inventory

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

## States

Every screen needs five. The audit found these missing entirely, and two of
them carry product logic that only existed in chat.

### 1. Empty — progressive unlock

This *is* the onboarding. Instead of a setup wizard, capability is tied to
coverage, and the empty state names what's missing and what it would unlock.

> **Schedule health unavailable**
> No baseline end dates are mapped yet. Map one column to unlock schedule RAG
> and slip tracking for 14 projects. *About 2 minutes.* → [Map it]

Rules: name the unlocked capability, quantify the affected entities, estimate
effort, offer the action inline. Never a generic "no data."

### 2. Partial
Some entities bound, some not. Show what you have and state the gap once: "17
projects · 3 not yet mapped." Never silently exclude.

### 3. Stale
Per the freshness decision. A card whose source file is older than the
threshold renders with an age stamp and is excluded from any "all clear" claim.
Portfolio-level: "6 of 17 projects report from files not updated in 30+ days."

### 4. Conflicting
Two files disagree. Show the winning value, a conflict glyph, and both sources
on tap. This is a finding (`data.conflicting_sources`), not an error.

### 5. Loading
Cached ledger renders immediately; recompute happens on file change, not on
view. Pulse must never show a spinner on open — that breaks the two-minute
promise.

---

## The spectrum — resolved

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

## Accessibility

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

## Notifications

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

## Export

Claimed as the distribution mechanism in conversation; never specified.

- **Copy brief as text** — plain markdown, pastes into email and Slack intact.
  Primary action on every brief.
- **PDF** — a single brief, with provenance footnotes.
- **CSV** — any worklist, current filter applied.
- Export carries the as-of date and the freshness caveat. A forwarded brief
  that loses its staleness warning is worse than no brief.

No write-back to source files, ever. Decision D1.

---

## Roles

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
