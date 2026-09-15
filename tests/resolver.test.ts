import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "@/lib/data/parse";
import { shredMaster } from "@/lib/resolver/shred";
import { resolveInbox, scoreGroupings } from "@/lib/resolver/resolve";
import { bindHeader } from "@/lib/resolver/bind";
import { guessVersion } from "@/lib/resolver/version";

const DATA_PATH = path.join(
  process.cwd(),
  "data",
  "Enterprise_Portfolio_Data.xlsx",
);

describe("resolver against shredded fixtures", () => {
  const buf = readFileSync(DATA_PATH);
  const { dataset } = parseWorkbook(buf, "test");
  const fixtures = shredMaster(dataset);
  const catalog = dataset.projects.map((p) => ({
    ProjectID: p.ProjectID,
    ProjectName: p.ProjectName,
    ClientID: p.ClientID,
    ClientName: dataset.clients.find((c) => c.ClientID === p.ClientID)
      ?.ClientName,
  }));
  const report = resolveInbox(
    "memory",
    fixtures.map((f) => ({
      name: f.name,
      buffer: f.buffer,
      modified: new Date().toISOString(),
    })),
    catalog,
  );

  it("rejects the irrelevant expense file", () => {
    const row = report.files.find((f) => f.name.startsWith("Q3_expenses"));
    expect(row?.disposition).toBe("rejected");
  });

  it("dedups the byte-identical status copy", () => {
    const row = report.files.find((f) => f.name.startsWith("Copy of"));
    expect(row?.disposition).toBe("duplicate");
  });

  it("treats Aug/Sep status as snapshots, not new entities", () => {
    expect(guessVersion("Portfolio_Status_Sep.xlsx").kind).toBe("snapshot");
    expect(guessVersion("Portfolio_Status_Aug.xlsx").kind).toBe("snapshot");
    expect(guessVersion("Copy of Portfolio_Status_Sep (1).xlsx").kind).toBe(
      "copy",
    );
  });

  it("binds Planned Finish to BaselineEnd", () => {
    expect(bindHeader("Planned Finish").canonical).toBe("BaselineEnd");
    expect(bindHeader("Planned Finish").rung).toBe(2);
    const binds = report.bindings["Fraud_Detection_plan.xlsx"] ?? [];
    expect(
      binds.some(
        (b) => b.sourceHeader === "Planned Finish" && b.canonical === "BaselineEnd",
      ),
    ).toBe(true);
  });

  it("groups Loyalty, Claims, Crestline, and Fraud to the right projects", () => {
    const acc = scoreGroupings(report.groupings, {
      "Loyalty_Budget_v4_FINAL.xlsx": ["P-1017"],
      "RAID Log - Claims.xlsx": ["P-1002"],
      "crestline tracker.xlsx": ["P-1002", "P-1015"],
      "Fraud_Detection_plan.xlsx": ["P-1005"],
    });
    expect(acc).toBeGreaterThanOrEqual(0.9);
  });

  it("needs a handful of confirmations, not a wizard", () => {
    expect(report.scores.confirmationsNeeded).toBeGreaterThanOrEqual(3);
    expect(report.scores.confirmationsNeeded).toBeLessThan(10);
    expect(report.scores.bindingAccuracy).toBeGreaterThanOrEqual(0.85);
  });

  it("does not force-map Jonah expenses into a project", () => {
    expect(
      report.groupings.some((g) => g.fileId.startsWith("Q3_expenses")),
    ).toBe(false);
  });
});
