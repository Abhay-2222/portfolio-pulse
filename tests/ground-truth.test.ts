import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "@/lib/data/parse";
import { computeAllProjectMetrics, computeAllResourceMetrics } from "@/lib/metrics";
import {
  healthContributors,
  healthWhyLine,
  uninvoicedBillingMilestones,
  uninvoicedBillingTotal,
} from "@/lib/metrics/derived";
import { evaluateFindings } from "@/lib/findings";
import { money, pct } from "@/lib/format";

const DATA_PATH = path.join(
  process.cwd(),
  "data",
  "Enterprise_Portfolio_Data.xlsx",
);
const TRUTH_PATH = path.join(
  process.cwd(),
  "docs",
  "spec",
  "ground-truth.json",
);

describe("ground-truth.json", () => {
  const buf = readFileSync(DATA_PATH);
  const { dataset } = parseWorkbook(buf, "test");
  const asOf = dataset.settings.AsOfDate;
  const projects = computeAllProjectMetrics(dataset, asOf);
  const resources = computeAllResourceMetrics(dataset, asOf);
  const truth = JSON.parse(readFileSync(TRUTH_PATH, "utf8")) as {
    portfolio: {
      uninvoicedBillingMilestones: number;
      uninvoicedBillingMilestoneCount: number;
      overdueARCount: number;
      outstandingAR: number;
    };
    projects: Record<
      string,
      { uninvoicedMilestones: number; health: number | null }
    >;
  };

  it("portfolio uninvoiced billing milestones is $445,500 across 3", () => {
    const total = uninvoicedBillingTotal(dataset, projects, "portfolio", asOf);
    expect(total.count).toBe(truth.portfolio.uninvoicedBillingMilestoneCount);
    expect(Math.round(total.amount)).toBe(
      truth.portfolio.uninvoicedBillingMilestones,
    );
    const rows = uninvoicedBillingMilestones(dataset, projects, asOf);
    expect(rows.map((r) => r.MilestoneID).sort()).toEqual(
      ["M-0008", "M-0049", "M-0084"].sort(),
    );
    expect(rows.some((r) => Math.abs(r.amount - 231_000) < 1)).toBe(false);
  });

  it("Loyalty P-1017 uninvoiced is $93,000", () => {
    const total = uninvoicedBillingTotal(dataset, projects, "P-1017", asOf);
    expect(Math.round(total.amount)).toBe(
      truth.projects["P-1017"]!.uninvoicedMilestones,
    );
  });

  it("P-1017 health explainer names all three", () => {
    const project = dataset.projects.find((p) => p.ProjectID === "P-1017")!;
    const metrics = projects.find((m) => m.ProjectID === "P-1017")!;
    const line = healthWhyLine(
      metrics,
      healthContributors(project, metrics, dataset),
    );
    expect(line.toLowerCase()).toContain("all three");
    expect(line.toLowerCase()).not.toContain("not everything");
    expect(metrics.HealthScore).toBe(truth.projects["P-1017"]!.health);
  });

  it("P-1015 explainer contains on track", () => {
    const project = dataset.projects.find((p) => p.ProjectID === "P-1015")!;
    const metrics = projects.find((m) => m.ProjectID === "P-1015")!;
    const line = healthWhyLine(
      metrics,
      healthContributors(project, metrics, dataset),
    );
    expect(line.toLowerCase()).toContain("on track");
  });

  it("formats outstanding AR as $1.94M and margin to one decimal", () => {
    expect(money(truth.portfolio.outstandingAR)).toBe("$1.94M");
    const loyalty = projects.find((m) => m.ProjectID === "P-1017")!;
    expect(pct(loyalty.ForecastMarginPct)).toBe("-14.0%");
  });

  it("overdue AR set is 6 and chase copy does not invent 17", () => {
    const findings = evaluateFindings(dataset, projects, resources, asOf);
    const overdue = findings.filter((f) => f.ruleId === "money.overdue_ar_ranked");
    expect(overdue).toHaveLength(truth.portfolio.overdueARCount);
    expect(overdue[0]!.move).toMatch(/of 6/);
    expect(overdue.some((f) => /of 17/.test(f.move ?? ""))).toBe(false);
  });
});
