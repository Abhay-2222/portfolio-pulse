# The book

[`Enterprise_Portfolio_Data.xlsx`](Enterprise_Portfolio_Data.xlsx) is the **master** workbook.

Pulse ships it as the demo briefing and as **Download template** on Book (`/book/template`). Edit this file when you want the product’s default book to change. Pulse never writes it at runtime.

## Edit and put it back

1. Open `Enterprise_Portfolio_Data.xlsx` in Excel (or upload to Google Sheets, edit, export `.xlsx`).
2. Keep sheet names and the header row. IDs should join: `ProjectID`, `EmployeeID`, `ClientID`.
3. `Settings.AutoRefreshMinutes` is **5** in the shipped file. The app re-reads on that interval.
4. Save over this path. Run `npm test` from the repo root. Commit. Vercel deploys the new demo.

## Sheets Pulse expects (template)

`Projects`, `Resources`, `Allocations`, `Estimates`, `Budget`, `Actuals`, `Milestones`, `Invoices`, `RAID`, `ChangeRequests`, `Snapshots`, `Clients`, `Settings`.

Column names: [`../lib/data/schema.ts`](../lib/data/schema.ts).

A cousin export (renamed headers, extra sheets, skinny rows) can still brief via Book mapping. Leftovers go to **More**. Missing metrics show **—**.

## Cousin fixture (messy sample)

```bash
npm run fixture:cousin
```

Writes `fixtures/cousin-portfolio.xlsx` from the master. Upload it on Book to see mapping + More. Tests generate that shape in memory; you do not have to commit the fixture.

## Local only (gitignored)

`overlay.json`, `recipes.json`, `user-source.json`, and `uploads/` stay on your machine. They are not the master book.
