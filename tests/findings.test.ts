import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "@/lib/data/parse";
import { computeAllProjectMetrics, computeAllResourceMetrics } from "@/lib/metrics";
import {
  uninvoicedBillingMilestones,
  wipSplit,
  activeMetricsOf,
  snapshotSpark,
} from "@/lib/metrics/derived";
import { composeBriefing, evaluateFindings } from "@/lib/findings";

const DATA_PATH = path.join(
  process.cwd(),
  "data",
  "Enterprise_Portfolio_Data.xlsx",
);

describe("findings against golden workbook", () => {
  const buf = readFileSync(DATA_PATH);
  const { dataset } = parseWorkbook(buf, "test");
  const asOf = dataset.settings.AsOfDate;
  const projects = computeAllProjectMetrics(dataset, asOf);
  const resources = computeAllResourceMetrics(dataset, asOf);
  const findings = evaluateFindings(dataset, projects, resources, asOf);

  it("finds uninvoiced billing milestones totaling about $445,500", () => {
    const rows = uninvoicedBillingMilestones(dataset, projects, asOf);
    const sum = rows.reduce((s, r) => s + r.amount, 0);
    expect(rows).toHaveLength(3);
    expect(sum).toBeGreaterThan(440_000);
    expect(sum).toBeLessThan(450_000);
    expect(rows.some((r) => Math.abs(r.amount - 231_000) < 1)).toBe(false);
    expect(
      findings.some((f) => f.ruleId === "money.milestone_passed_unbilled"),
    ).toBe(true);
  });

  it("splits WIP into gross unbilled vs over-billed", () => {
    const split = wipSplit(activeMetricsOf(dataset, projects));
    expect(split.gross).toBeGreaterThan(2_000_000);
    expect(split.overbilled).toBeLessThan(0);
    expect(Math.abs(split.overbilled)).toBeGreaterThan(200_000);
  });

  it("names a below-floor / negative-margin project", () => {
    const hit = findings.find((f) => f.ruleId === "money.margin_below_floor");
    expect(hit).toBeTruthy();
    expect(hit!.headline.length).toBeGreaterThan(10);
  });

  it("pairs an overallocated person with a swap and a project", () => {
    const hit = findings.find(
      (f) => f.ruleId === "people.overallocated_with_swap",
    );
    expect(hit).toBeTruthy();
    expect(hit!.related.some((r) => r.type === "person")).toBe(true);
    expect(hit!.related.some((r) => r.type === "project")).toBe(true);
    expect(hit!.move?.toLowerCase()).toContain("reassign");
    expect(`${hit!.headline} ${hit!.sentence} ${hit!.move}`.toLowerCase()).not.toContain(
      "cost rate",
    );
  });

  it("flags idle specialist cost", () => {
    const hit = findings.find((f) => f.ruleId === "people.idle_specialist_cost");
    expect(hit).toBeTruthy();
    expect(hit!.amount).toBeGreaterThan(0);
  });

  it("flags unused contingency on a red project", () => {
    const hit = findings.find(
      (f) => f.ruleId === "risk.contingency_unused_while_red",
    );
    expect(hit).toBeTruthy();
    expect(hit!.amount).toBeGreaterThan(10_000);
  });

  it("composes a briefing that names a project or person", () => {
    const text = composeBriefing(findings, 4);
    expect(text.toLowerCase()).not.toBe("everything is on track.");
    expect(text.length).toBeGreaterThan(40);
  });

  it("ranks overdue AR with a project attached", () => {
    const hit = findings.find((f) => f.ruleId === "money.overdue_ar_ranked");
    expect(hit).toBeTruthy();
    expect(hit!.related.some((r) => r.type === "project")).toBe(true);
    expect(hit!.href).toMatch(/^\/money\//);
  });

  it("routes RAID owner collisions to the RAID landing", () => {
    const hit = findings.find(
      (f) => f.ruleId === "risk.risk_owner_overallocated",
    );
    expect(hit).toBeTruthy();
    expect(hit!.href).toMatch(/^\/risks\//);
  });

  it("plots snapshot spark as forecast margin, not health", () => {
    const red = projects.find((m) => m.OverallRAG === "Red");
    expect(red).toBeTruthy();
    const spark = snapshotSpark(dataset, red!.ProjectID);
    const snaps = dataset.snapshots
      .filter((s) => s.ProjectID === red!.ProjectID)
      .sort((a, b) => a.SnapshotDate.getTime() - b.SnapshotDate.getTime());
    expect(spark.length).toBe(snaps.length);
    spark.forEach((pt, i) => {
      expect(pt.margin).toBe(snaps[i]!.ForecastMarginPct);
      expect(pt).not.toHaveProperty("health");
    });
  });
});
