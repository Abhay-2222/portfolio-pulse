# Portfolio Pulse

Responsive portfolio briefing app (Phase 1: data foundation).

## Phase 1 scope

- Excel workbook parser (SheetJS + Zod)
- Local file data source (`DATA_FILE_PATH`)
- Pure metric engine (`lib/metrics`) matching workbook calculated columns
- `GET /api/portfolio` and `?force=1`
- Vitest suite against the Summary KPI oracle
- Debug JSON page at `/`

UI (Pulse, Spectrum, shell) starts in Phase 2.

## Assumptions

- The original proprietary `Enterprise_Portfolio_Data.xlsx` was not available for upload.
- A synthetic workbook is generated at [`data/Enterprise_Portfolio_Data.xlsx`](data/Enterprise_Portfolio_Data.xlsx) with the same schemas and formulas. The **Summary** sheet is the KPI oracle.
- Spot checks included: P-1017 all-Red / health 0 / negative margin; P-1002 Amber cost+schedule / Red margin; P-1022–P-1024 Planned.

## Scripts

```bash
npm install
npm run generate:data   # rebuild synthetic workbook
npm test
npm run dev             # http://localhost:3000
```

## Environment

| Variable | Default |
|---|---|
| `DATA_SOURCE` | `local` |
| `DATA_FILE_PATH` | `data/Enterprise_Portfolio_Data.xlsx` |
