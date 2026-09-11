# Portfolio Pulse

Responsive portfolio briefing app (Phase 1: data foundation).

## Phase 1 scope

- Excel workbook parser (SheetJS + Zod) against the real Google Sheet export
- Local file data source (`DATA_FILE_PATH`)
- Pure metric engine (`lib/metrics`) matching workbook calculated columns
- `GET /api/portfolio` and `?force=1`
- Vitest suite against the Summary KPI oracle
- Debug JSON page at `/`

UI (Pulse, Spectrum, shell) starts in Phase 2.

## Assumptions

- Phase 1 uses the provided Google Sheet export at [`data/Enterprise_Portfolio_Data.xlsx`](data/Enterprise_Portfolio_Data.xlsx) (source: Drive `sheet.xlsx`).
- Zod schemas list **INPUT** columns only (from DataDictionary `Kind=Input`); extra calculated columns on sheets are ignored.
- The **Summary** sheet is the portfolio KPI oracle (parse with `header:1`, start at the `KPI`/`Value` row).
- Spot checks: P-1017 all-Red / health 0 / negative margin; P-1002 Amber cost+schedule / Red margin; P-1022–P-1024 Planned (`OverallRAG` N/A, `HealthScore` null).

## Scripts

```bash
npm install
npm test
npm run build
npm run dev             # http://localhost:3000
```

## Environment

| Variable | Default |
|---|---|
| `DATA_SOURCE` | `local` |
| `DATA_FILE_PATH` | `data/Enterprise_Portfolio_Data.xlsx` |
