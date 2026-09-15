import { readFileSync, statSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "@/lib/data/parse";
import { computeAllProjectMetrics, computeAllResourceMetrics } from "@/lib/metrics";
import { evaluateFindings } from "@/lib/findings";
import { cellRef } from "@/lib/ledger/cells";

const DATA_PATH = path.join(
  process.cwd(),
  "data",
  "Enterprise_Portfolio_Data.xlsx",
);

describe("cell-level provenance", () => {
  const buf = readFileSync(DATA_PATH);
  const fileId = path.basename(DATA_PATH);
  const fileModified = statSync(DATA_PATH).mtime.toISOString();
  const { dataset } = parseWorkbook(buf, "test", new Date(), {
    fileId,
    fileModified,
  });
  const asOf = dataset.settings.AsOfDate;
  const projects = computeAllProjectMetrics(dataset, asOf);
  const resources = computeAllResourceMetrics(dataset, asOf);
  const findings = evaluateFindings(dataset, projects, resources, asOf);
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });

  function excelValue(cell: string): unknown {
    const bang = cell.indexOf("!");
    const sheet = cell.slice(0, bang);
    const addr = cell.slice(bang + 1);
    return wb.Sheets[sheet]?.[addr]?.v;
  }

  it("indexes P-1017 TargetMarginPct to a real workbook cell", () => {
    const ref = cellRef(dataset, "Projects", "P-1017", "TargetMarginPct");
    expect(ref.cell).toMatch(/^Projects![A-Z]+\d+$/);
    expect(excelValue(ref.cell)).toBe(0.3);
    expect(ref.fileId).toBe(fileId);
  });

  it("puts A1 addresses on uninvoiced milestone findings", () => {
    const hit = findings.find(
      (f) => f.ruleId === "money.milestone_passed_unbilled",
    );
    expect(hit).toBeTruthy();
    expect(hit!.provenance.length).toBeGreaterThan(1);
    expect(hit!.provenance.every((p) => p.cell.includes("!"))).toBe(true);
    const billing = hit!.provenance.find((p) => p.column === "BillingPct");
    expect(billing).toBeTruthy();
    expect(excelValue(billing!.cell)).toBeGreaterThan(0);
  });

  it("marks cost rates as sensitive", () => {
    const hit = findings.find((f) => f.ruleId === "people.idle_specialist_cost");
    expect(hit).toBeTruthy();
    const rate = hit!.provenance.find((p) => p.column === "CostRateHr");
    expect(rate?.sensitive).toBe(true);
    expect(rate?.cell).toMatch(/^Resources![A-Z]+\d+$/);
  });

  it("round-trips Loyalty project name from the indexed cell", () => {
    const ref = cellRef(dataset, "Projects", "P-1017", "ProjectName");
    expect(excelValue(ref.cell)).toBe("Loyalty Program Relaunch");
  });
});
