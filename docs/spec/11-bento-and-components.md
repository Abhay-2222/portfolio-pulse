# Bento grid and component specs

The current build is a vertical stack of equal-width cards. That is a list with
rounded corners, not a bento. Bento's mechanic is **unequal cells, where size
encodes importance**, so the eye lands before it reads.

---

## Grid system

12-column grid, 8px base unit, 12px gutter.

| Breakpoint | Columns | Notes |
|---|---|---|
| ≤ 400px (phone) | 4 | the design target |
| 401–767px | 6 | |
| ≥ 768px (desk) | 12 | worklists gain density here |

Cell sizes at phone width, expressed as `col × row` where one row unit = 88px:

| Size | Span | Holds |
|---|---|---|
| `hero` | 4 × 3 | one decision, with its evidence. Max one per screen. |
| `tall` | 2 × 3 | a worklist teaser with an action |
| `wide` | 4 × 1 | navigation strip, RAG counts |
| `half` | 2 × 1.5 | a single stat with its delta |
| `quarter` | 1 × 1 | a glyph-and-number chip |

**Rule:** a screen has exactly one `hero`. If two things compete for it, the one
with money *and* a deadline wins — same tie-break as treatment tier 4.

---

## Pulse layout

```
┌───────────────────────────────────────┐
│  HERO 4×3                             │  the move, not the fact
│  "Move Loyalty to Noah Rahimi"        │
│  −14% margin · 55d late · Mei 125%    │
│  [ Take it ]  [ Hold ]                │
├───────────────────┬───────────────────┤
│ TALL 2×3          │ HALF 2×1.5        │
│ $445,500          │ 31.2% margin      │
│ billable, never   │ −5.1 pts vs target│
│ invoiced          ├───────────────────┤
│ 3 milestones      │ HALF 2×1.5        │
│ [ Review ]        │ 6 stale projects  │
│                   │ files 30d+ old    │
├───────────────────┴───────────────────┤
│  WIDE 4×1   ▲ 4 off track  ◆ 4 watch  │  primary navigation
│             ○ 9 on track              │
├───────────────────────────────────────┤
│  Everything else, below the fold      │
└───────────────────────────────────────┘
```

What moved and why:

- **Situation card deleted.** "17 active projects · $16.2M contract" answers
  none of the five questions. Inventory is not a briefing.
- **Outcome card demoted** to a `half`. Margin vs target matters, but it does
  not need a full-bleed card in brand blue.
- **RAG counts promoted** to a full-width strip. They are the most-used
  navigation in the app and were styled as a footnote.
- **Freshness promoted** to a `half`. Per the spec it is a first-class signal;
  it did not appear in the build at all.
- **Spectrum removed from the first screen.** Below the fold, per
  `08-interaction-spec.md`.

If the director reads only the hero cell, she still leaves with the right move.
That is the test for this screen.

---

## Project brief layout

```
┌───────────────────────────────────────┐
│  HEADER — name, client, PM, RAG        │
├───────────────────────────────────────┤
│  HERO 4×3 — the verdict                │
│  "Red on all three. Margin is the      │
│   biggest hit — 66 of 100 points."     │
│  [contributor bars: margin / cost / slip]
├───────────────┬───────────────────────┤
│ HALF Contract │ HALF Forecast margin  │
│ $465,000      │ −14.0%  ▼             │
├───────────────┼───────────────────────┤
│ HALF Complete │ HALF Slip             │
│ 70.0%         │ 55d ▲                 │
├───────────────────────────────────────┤
│  FINDINGS — tiered, see below          │
├───────────────────────────────────────┤
│  Money · Team · Milestones · Risks     │
└───────────────────────────────────────┘
```

The existing 2×2 stat block is the one part of the current build that already
works. Keep it. Put the verdict above it, not a bare "Health 0" on an
unlabelled track.

---

## FindingCard — the biggest upgrade

The current card shows a fact and a Done button. The user is being asked to
dispose of a statement. Three things are missing.

```ts
type FindingCardProps = {
  finding: Finding;
  tier: 1 | 2 | 3 | 4;
  scope: "portfolio" | "project" | "person" | "client";
};
```

Every card renders four parts:

| Part | Content | Required |
|---|---|---|
| **Claim** | what is true, with a scoped figure | always |
| **Consequence** | what it costs if nothing happens | tier ≥ 2 |
| **Move** | the named next action, with the specific object | tier ≥ 3 |
| **Owner** | who does it | tier ≥ 3 |

Example, tier 4:

```
$93,000 is billable now and has not been invoiced        ← claim
Build Complete passed 4 Sep. Aurora pays on 60-day
terms, so this lands in November if it goes out today.   ← consequence
→ Raise invoice against milestone M-0021                 ← move
   Gordon Achebe · Finance                               ← owner
[ Take it ]  [ Hold ]  [ ⋯ ]
```

Example, tier 1 (same component, less exposed):

```
The project is carrying $52,700 of contingency that has
never been drawn on.
```

### Rendering by tier

| Tier | Type scale | Position | Chrome |
|---|---|---|---|
| 4 | 24/28 semibold, figure in accent | own cell, above the narrative | full card, actions |
| 3 | 17/24 medium | first item in its section | card, actions |
| 2 | 15/22 regular, figure marked with delta glyph | in flow | no card |
| 1 | 15/22 regular | in flow | no card |

Guardrails already in the schema: max two tier-4 per screen, no finding renders
twice, tier-4 headlines must contain a figure.

### Charts inside a finding

A finding's chart plots **that finding's own metric**. The build currently shows
a margin sparkline on an unbilled-milestone card, which teaches users to ignore
charts. If the metric has no meaningful series, render no chart.

---

## StatCell

```
LABEL (11/16 uppercase mono, 60% opacity)
VALUE (28/32 semibold)
DELTA (13/18, glyph + text, never colour alone)
```

Tappable when the value is a composite. Tap opens the contributor breakdown,
never a navigation. Composites: health, overall RAG, EAC, unbilled WIP,
forecast margin, bench cost.

---

## ContributorBreakdown — the teaching layer

Missing entirely from the build. This is "explain the number."

```
Health 0
├ Margin shortfall   −66   44.0% below a 30% target
├ Cost over-burn     −38   95% spent, 70% complete
└ Schedule slip      −22   55 days late
Floored at 0 (raw −26).
```

Rules: sorted by deduction descending; zero-deduction contributors render as
"no penalty" rather than being omitted; every row carries its source cells;
never show the formula, show the deductions.

---

## RAGBadge

Triple-encoded, never colour alone.

| RAG | Colour | Glyph | Text |
|---|---|---|---|
| Red | `#C8372D` | ▲ | Off track |
| Amber | `#C77700` | ◆ | Watch |
| Green | `#2E7D4F` | ● | On track |
| N/A | `#8A8A8E` | ○ | Not started |

Minimum 44×44px tap target when interactive.

---

## SourceLink

```
Source · 6 cells
```

Tap opens a sheet listing file, sheet, column, cell and file-modified date for
every input. Present on every brief. Already in the build on two screens — put
it on all of them.

---

## Typography and spacing

| Role | Size/line | Weight |
|---|---|---|
| Screen title | 34/40 | 700 |
| Hero claim | 24/28 | 600 |
| Section head | 20/26 | 600 |
| Body | 15/22 | 400 |
| Label (uppercase mono) | 11/16 | 500, +0.08em |
| Figure in a stat cell | 28/32 | 600 |

Accent `#2E6DB4`. Reserve it for **actionable** elements and positive figures
only — never for decoration. The current build uses it on the Outcome card
background, which spends the strongest colour in the system on an inert number.

Card padding 16px, cell gap 12px, section gap 32px. Sections need more air than
cards; the current build gives them the same, which is why everything reads as
one undifferentiated stream.
