# Open questions

Genuinely undecided, with a recommendation on each. Ordered by how much
downstream work each one blocks.

### Q1 — Case study or real build?
Blocks the phase order. A case study wants phases 1 and 3 done beautifully with
2 and 4 sketched. A real build wants phase 2 (provenance) before 3, because
retrofitting cell refs is a rewrite.

*Recommendation:* decide now, before any refactor. If uncertain, build as if
it's a real build — a case study made from working infrastructure is stronger
than the reverse, and the cost is one extra phase of invisible work.

### Q2 — Whose drive?
One team's folder, or scattered across an organisation? This changes the ingest
story significantly: one folder means a watcher and a flat scan; scattered means
permissions, partial visibility, and "you can see 60% of the portfolio."

*Recommendation:* design for one folder in v1, but never assume completeness in
the copy. Findings should be able to say "of the files I can see."

### Q3 — Rates visibility
Cost and bill rates currently sit on the person page, visible to anyone who can
open the app. For a shared exec briefing that may be intended. For a wider
audience it's a privacy decision, not a layout one.

*Recommendation:* one role flag, two rendering modes. Default to hiding cost
rates; the EBITDA bridge shows aggregates only.

### Q4 — Does Mei see what Helena sees?
The overloaded PM is the user who keeps source files fresh, and also the
subject of unflattering findings. If the app only tells her she's failing, she
stops cooperating.

*Recommendation:* same findings, different framing. Her page leads with the
constraint (125% across three projects) rather than the outcome (health 0), and
surfaces the available swap. Never a "performance" view of a person.

### Q5 — How much does the brief say out loud?
The worked P-1002 example deliberately leaves the reader to connect "$52,700
unused" to "$60,000 CR in limbo." That restraint is the product's voice — but
it risks the user missing the point entirely.

*Recommendation:* test both on two readers. The treatment-tier system supports
either; it's one threshold change.

### Q6 — Snooze semantics
If Gordon snoozes an overdue invoice for a week and it worsens, does it return
early? Does a snooze survive the underlying file changing?

*Recommendation:* snooze until date OR until magnitude worsens by 20%,
whichever first. A snooze on a finding whose source cells changed returns
immediately.

### Q7 — What happens when two files disagree?
Two spreadsheets both claim to know a project's forecast end date, with
different answers. This *will* happen — it's the normal state of a real drive.

*Recommendation:* the Ledger stores both with their cell refs, and precedence
goes to the more recently modified file. Disagreement is itself a finding
(`data.conflicting_sources`) and appears on the brief. This turns the product's
hardest problem into a feature nobody else offers.

### Q8 — Planned projects
They have null health scores and are currently filtered out of most views —
which is exactly why scenario S10 (the $1.09M pipeline sanity check) is
invisible today.

*Recommendation:* planned projects get findings but no health score. Rules that
depend on health skip them; rules about commitment and capacity don't.

### Q9 — Does the client become a first-class entity?
Scenario S6 needs a client brief. Clients are currently a subtitle. Twelve
clients is a small enough dimension that this is cheap.

*Recommendation:* yes, in phase 1. Same brief renderer, different entity. Near
zero marginal cost.

### Q10 — Mobile-first still?
The original framing was a phone instrument. Gordon's AR working session and
Arjun's resourcing call are both desk jobs.

*Recommendation:* briefs are mobile-first (they're read and forwarded);
worklists are desk-first (they're worked). Don't force one density on both —
that inconsistency was already flagged in the original brief and this gives it
a principled resolution.
