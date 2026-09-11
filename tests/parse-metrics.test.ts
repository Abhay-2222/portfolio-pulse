import { readFileSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "@/lib/data/parse";
import {
  computeAllProjectMetrics,
  computePortfolioKPIs,
} from "@/lib/metrics";

const DATA_PATH = path.join(
  process.cwd(),
  "data",
  "Enterprise_Portfolio_Data.xlsx",
);

function loadSummary(): Map<string, number> {
  const buf = readFileSync(DATA_PATH);
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const rows = XLSX.utils.sheet_to_json<{ KPI: string; Value: number }>(
    wb.Sheets.Summary,
  );
  return new Map(rows.map((r) => [r.KPI, Number(r.Value)]));
}

describe("workbook parse + metrics oracle", () => {
  const buf = readFileSync(DATA_PATH);
  const { dataset, issues } = parseWorkbook(buf, "test");
  const asOf = dataset.settings.AsOfDate;
  const projects = computeAllProjectMetrics(dataset, asOf);
  const kpis = computePortfolioKPIs(dataset, asOf, projects);
  const byId = new Map(projects.map((p) => [p.ProjectID, p]));
  const summary = loadSummary();

  it("parses 24 projects with no issues", () => {
    expect(dataset.projects).toHaveLength(24);
    expect(issues).toHaveLength(0);
    expect(asOf.toISOString().startsWith("2026-09-11")).toBe(true);
  });

  it("matches Summary sheet KPI oracle", () => {
    const entries = Object.entries(kpis) as [string, number][];
    for (const [key, actual] of entries) {
      const expected = summary.get(key);
      expect(expected, `Summary missing ${key}`).toBeDefined();
      if (Number.isInteger(expected) && Number.isInteger(actual)) {
        expect(actual).toBe(expected);
      } else {
        expect(actual).toBeCloseTo(expected as number, 6);
      }
    }
  });

  it("spot-checks P-1017 / P-1002 / planned projects", () => {
    const p1017 = byId.get("P-1017")!;
    expect(p1017.CostRAG).toBe("Red");
    expect(p1017.ScheduleRAG).toBe("Red");
    expect(p1017.MarginRAG).toBe("Red");
    expect(p1017.OverallRAG).toBe("Red");
    expect(p1017.HealthScore).toBe(0);
    expect(p1017.ForecastMarginPct).toBeLessThan(0);

    const p1002 = byId.get("P-1002")!;
    expect(p1002.CostRAG).toBe("Amber");
    expect(p1002.ScheduleRAG).toBe("Amber");
    expect(p1002.MarginRAG).toBe("Red");

    for (const id of ["P-1022", "P-1023", "P-1024"]) {
      const m = byId.get(id)!;
      expect(m.OverallRAG).toBe("N/A");
      expect(m.HealthScore).toBeNull();
      expect(dataset.projects.find((p) => p.ProjectID === id)?.Status).toBe(
        "Planned",
      );
    }
  });

  it("recomputes calculated project columns from the workbook", () => {
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets.Projects,
    );
    expect(rows).toHaveLength(24);
    for (const row of rows) {
      const m = byId.get(String(row.ProjectID))!;
      expect(m.CurrentContractValue).toBeCloseTo(
        Number(row.CurrentContractValue),
        2,
      );
      expect(m.EAC).toBeCloseTo(Number(row.EAC), 2);
      expect(m.OverallRAG).toBe(row.OverallRAG);
      if (row.Status === "Planned") {
        expect(m.HealthScore).toBeNull();
      } else {
        expect(m.HealthScore).toBe(Number(row.HealthScore));
      }
    }
  });
});
