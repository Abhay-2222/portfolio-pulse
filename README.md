# Portfolio Pulse

A phone briefing for an enterprise PMO workbook. Open it on Monday and see what needs attention this week — then drill into the project, person, invoice, or risk behind the number.

**Live:** [https://portfolio-pulse-psi.vercel.app](https://portfolio-pulse-psi.vercel.app)

The book is frozen as of **11 September 2026**, CAD. Pulse reads it. It never writes back.

---

## About me

I’m [Abhay Sharma](https://abhay-sharma.com) — a product designer and educator in Toronto.

I build instruments, not dashboards: glanceable health, then one tap into the thing you actually have to deal with. Portfolio Pulse is a case study of that idea against a real 17-project book — cost, schedule, margin, people, AR, and RAID in one briefing instead of five Excel tabs.

More work: [abhay-sharma.com](https://abhay-sharma.com) · [GitHub](https://github.com/Abhay-2222)

---

## How to use

Best on a phone. Start at the [live app](https://portfolio-pulse-psi.vercel.app).

1. **Home** — Your projects first, then the book. Tap a card to open a brief.
2. **The five tabs** never change: **Home / Projects / People / Money / Risks**.
3. **Open a project** — Health, why it is that number, then **Urgent** moves (reassign, invoice, chase). Loyalty Program Relaunch (`P-1017`) is the worst engagement in the book: health **0**, all three Red, **−14.0%** margin.
4. **Act without touching Excel** — **Hold** parks a finding, **Take it** marks it yours, **Done** clears it. Notes stay in Pulse’s overlay. The workbook is unchanged.
5. **Refresh** (header) re-reads the xlsx. **Sources** shows how files were grouped; the briefing still comes from the master workbook.

Lists filter to attention. Entity pages (project, person, client, invoice, risk) are briefs. Every figure can be traced back to cells in the book.

This is a demo against one frozen export, not a live PMO system. No login. Cost rates stay hidden unless you ask.

---

## Run it locally

```bash
npm install --legacy-peer-deps
npm test
npm run dev             # http://localhost:3000
```

| Variable | Default |
|---|---|
| `DATA_SOURCE` | `local` |
| `DATA_FILE_PATH` | `data/Enterprise_Portfolio_Data.xlsx` |

EAC uses the CPI method. Specs live in [`docs/spec`](docs/spec).
