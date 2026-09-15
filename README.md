# Portfolio Pulse

A phone briefing for an enterprise PMO workbook. Open it on Monday and see what needs attention this week, then drill into the project, person, invoice, or risk behind the number.

**Live:** [https://portfolio-pulse-psi.vercel.app](https://portfolio-pulse-psi.vercel.app)

Pulse **reads** one workbook. It never writes back. The shipped book is frozen as of **11 September 2026**, CAD. The briefing re-reads it every **5 minutes** (and when you tap Refresh).

---

## Run it

```bash
git clone <this-repo>
cd portfolio-pulse
npm install --legacy-peer-deps
npm test
npm run dev             # http://localhost:3000
```

You should land on Home with **Loyalty Program Relaunch** at health **0** and **−14.0%** margin. That is the demo book in [`data/Enterprise_Portfolio_Data.xlsx`](data/Enterprise_Portfolio_Data.xlsx).

| Variable | Default |
|---|---|
| `DATA_SOURCE` | `local` |
| `DATA_FILE_PATH` | (unset: Book picker + demo file) |

Setting `DATA_FILE_PATH` locks Book to that path and ignores uploads.

---

## How to use

Best on a phone. Same steps on the [live app](https://portfolio-pulse-psi.vercel.app) or `/guide`.

1. **Home**: your projects first, then the book. Tap a card to open a brief.
2. Five tabs never change: **Home / Projects / People / Money / Risks**.
3. Open a project for health, why it is that number, then **Urgent** moves.
4. **Hold** parks a finding, **Take it** marks it yours, **Done** clears it. Notes stay in Pulse. Excel is unchanged.
5. Header **Refresh** re-reads now. Auto-refresh is every 5 minutes (`Settings.AutoRefreshMinutes`).
6. Gear → **Book** is your file. **Guide** (side nav) is this walkthrough. **Sources** is a mapping demo. It does not replace the book.

Lists filter to attention. Missing inputs show **n/a**, never a fake 0. No login. Cost rates stay hidden in briefing copy.

---

## Your own Excel

Two doors on Book.

**Start from our template** if you can. Download template (the same file as the demo), replace the rows, keep sheet names and headers, re-upload or paste a public Google Sheet link. **Copy demo into My books** if you want to brief immediately, then overwrite after you edit.

**Bring your own file** if the export is close but named differently. Pulse maps what it can. Uneven rows brief on what they have. Extra sheets, colour-only RAG, and orphan invoices land in **More**, not a sixth tab.

- Google Sheets must be shared with **anyone with the link**. Private Drive: download `.xlsx` and upload.
- IDs should join across sheets (`ProjectID`, `EmployeeID`, `ClientID`) when you have them.
- Word, PDF, and CSV are not read. Export those tables into the template.
- On Vercel, uploads last until the server restarts. Run locally or use a public Sheet if you need the book to stay. The live demo always briefs the shipped master until you add a Sheet link.

Required sheets (template): `Projects`, `Resources`, `Allocations`, `Estimates`, `Budget`, `Actuals`, `Milestones`, `Invoices`, `RAID`, `ChangeRequests`, `Snapshots`, `Clients`, `Settings`. Columns: [`lib/data/schema.ts`](lib/data/schema.ts).

---

## Update the master book in this repo

[`data/Enterprise_Portfolio_Data.xlsx`](data/Enterprise_Portfolio_Data.xlsx) is both the demo and **Download template**.

1. Open that file in Excel (or Sheets, then export `.xlsx`).
2. Edit rows. Keep sheet names and the header row. Set `Settings.AutoRefreshMinutes` if you want a different interval (shipped as **5**).
3. Save over the same path.
4. `npm test` then commit. The live site picks it up on the next Vercel deploy.

Do not regenerate a synthetic workbook. More detail: [`data/README.md`](data/README.md).

---

## About me

I'm [Abhay Sharma](https://abhay-sharma.com), a product designer and educator in Toronto.

I build instruments, not dashboards: glanceable health, then one tap into the thing you actually have to deal with. Portfolio Pulse is a case study of that idea against a real 17-project book: cost, schedule, margin, people, AR, and RAID in one briefing instead of five Excel tabs.

More work: [abhay-sharma.com](https://abhay-sharma.com) · [GitHub](https://github.com/Abhay-2222)

---

EAC uses the CPI method. Specs: [`docs/spec`](docs/spec).
