import * as XLSX from "xlsx";
import type { Dataset } from "@/lib/data/types";

export type FixtureFile = {
  name: string;
  buffer: Buffer;
  expected: {
    disposition: "mapped" | "rejected" | "duplicate";
    projectIds?: string[];
    binds?: Record<string, string>;
  };
};

function book(sheets: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name.slice(0, 31));
  }
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function csv(aoa: unknown[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  return Buffer.from(XLSX.utils.sheet_to_csv(sheet), "utf8");
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function shredMaster(dataset: Dataset): FixtureFile[] {
  const loyalty = dataset.projects.find((p) => p.ProjectID === "P-1017")!;
  const fraud = dataset.projects.find((p) => p.ProjectID === "P-1005")!;
  const claims = dataset.projects.find((p) => p.ProjectID === "P-1002")!;
  const policy = dataset.projects.find((p) => p.ProjectID === "P-1015")!;
  const clients = new Map(dataset.clients.map((c) => [c.ClientID, c.ClientName]));
  const people = new Map(dataset.resources.map((r) => [r.EmployeeID, r]));

  const loyaltySheets: Record<string, unknown[][]> = {};
  for (const line of dataset.budget.filter((b) => b.ProjectID === "P-1017")) {
    loyaltySheets[line.CostCategory.slice(0, 31)] = [
      ["CONFIDENTIAL — do not circulate"],
      [`${loyalty.ProjectName} — Budget v4 FINAL`],
      [],
      ["Description", "Amount"],
      [line.Notes ?? line.CostCategory, line.BudgetAmount],
    ];
  }

  const statusHeader = [
    "Project",
    "Client",
    "Status",
    "% Complete",
    "Forecast End",
    "Contract Value",
  ];
  const statusRows = dataset.projects
    .filter((p) => p.Status === "Active")
    .map((p) => [
      p.ProjectName,
      clients.get(p.ClientID) ?? p.ClientID,
      p.Status,
      `${Math.round(p.PctComplete * 100)}%`,
      ymd(p.ForecastEnd),
      p.OriginalContractValue,
    ]);
  const sep = book({
    Status: [["Portfolio status — September 2026"], [], statusHeader, ...statusRows],
  });

  const augSnap = dataset.snapshots.filter(
    (s) => s.SnapshotDate.toISOString().slice(0, 7) === "2026-08",
  );
  const augRows = augSnap.map((s) => {
    const p = dataset.projects.find((x) => x.ProjectID === s.ProjectID);
    return [
      p?.ProjectName ?? s.ProjectID,
      p ? clients.get(p.ClientID) : "",
      s.Status,
      `${Math.round(s.PctComplete * 100)}%`,
      p ? ymd(p.ForecastEnd) : "",
      p?.OriginalContractValue ?? "",
    ];
  });

  const raidRows = dataset.raid
    .filter((r) => r.ProjectID === "P-1002")
    .map((r) => [
      r.Title,
      r.Type,
      r.Probability,
      r.Impact,
      people.get(r.OwnerID)?.FullName ?? r.OwnerID,
      r.Status,
      r.TargetDate ? ymd(r.TargetDate) : "",
    ]);

  const asOf = dataset.settings.AsOfDate;
  const allocRows = dataset.allocations
    .filter(
      (a) =>
        a.StartDate.getTime() <= asOf.getTime() &&
        asOf.getTime() <= a.EndDate.getTime(),
    )
    .slice(0, 40)
    .map((a) => {
      const person = people.get(a.EmployeeID);
      const project = dataset.projects.find((p) => p.ProjectID === a.ProjectID);
      return [
        person?.FullName ?? a.EmployeeID,
        person?.Role ?? "",
        project?.ProjectName ?? a.ProjectID,
        `${Math.round(a.AllocationPct * 100)}%`,
      ];
    });

  const ms = dataset.milestones
    .filter((m) => ["P-1002", "P-1017", "P-1010"].includes(m.ProjectID))
    .map((m) => {
      const p = dataset.projects.find((x) => x.ProjectID === m.ProjectID);
      return [
        m.MilestoneName,
        p?.ProjectName ?? m.ProjectID,
        ymd(m.ForecastDate),
        m.IsBillingMilestone,
        m.BillingPct,
      ];
    });

  const files: FixtureFile[] = [
    {
      name: "Loyalty_Budget_v4_FINAL.xlsx",
      buffer: book(loyaltySheets),
      expected: {
        disposition: "mapped",
        projectIds: ["P-1017"],
        binds: { Amount: "BudgetAmount" },
      },
    },
    {
      name: "Portfolio_Status_Sep.xlsx",
      buffer: sep,
      expected: {
        disposition: "mapped",
        binds: { Project: "ProjectName", "% Complete": "PctComplete" },
      },
    },
    {
      name: "Portfolio_Status_Aug.xlsx",
      buffer: book({
        Status: [
          ["Portfolio status — August 2026"],
          [],
          statusHeader,
          ...augRows,
        ],
      }),
      expected: { disposition: "mapped" },
    },
    {
      name: "RAID Log - Claims.xlsx",
      buffer: book({
        RAID: [
          [`${claims.ProjectName} — RAID log`],
          [],
          ["Title", "Type", "Probability", "Impact", "Owner", "Status", "Target Date"],
          ...raidRows,
        ],
      }),
      expected: { disposition: "mapped", projectIds: ["P-1002"] },
    },
    {
      name: "Resourcing Q3.xlsx",
      buffer: book({
        Plan: [
          ["Resource", "", "Assignment", ""],
          ["Full name", "Role", "Project", "Allocation"],
          ...allocRows,
        ],
      }),
      expected: {
        disposition: "mapped",
        binds: { Allocation: "AllocationPct" },
      },
    },
    {
      name: "crestline tracker.xlsx",
      buffer: book({
        Tracker: [
          ["Crestline delivery tracker"],
          [],
          ["Project", "Status", "% Complete"],
          ["Claims Automation", "Active", "57%"],
          ["Policy Admin", "Active", "40%"],
        ],
      }),
      expected: {
        disposition: "mapped",
        projectIds: ["P-1002", "P-1015"],
      },
    },
    {
      name: "Fraud_Detection_plan.xlsx",
      buffer: book({
        Plan: [
          [fraud.ProjectName],
          [],
          ["Project", "Planned Start", "Planned Finish", "% Complete"],
          [
            fraud.ProjectName,
            ymd(fraud.BaselineStart),
            ymd(fraud.BaselineEnd),
            `${Math.round(fraud.PctComplete * 100)}%`,
          ],
        ],
      }),
      expected: {
        disposition: "mapped",
        projectIds: ["P-1005"],
        binds: { "Planned Finish": "BaselineEnd" },
      },
    },
    {
      name: "milestones_export.csv",
      buffer: csv([
        ["Milestone", "Project", "Forecast Date", "Billing", "Billing %"],
        ...ms,
      ]),
      expected: {
        disposition: "mapped",
        binds: { Milestone: "MilestoneName" },
      },
    },
    {
      name: "Q3_expenses_Jonah.xlsx",
      buffer: book({
        Expenses: [
          ["Jonah Lee — Q3 expenses"],
          [],
          ["Date", "Merchant", "Amount", "Category"],
          ["2026-07-12", "Uber", 48.2, "Travel"],
          ["2026-07-13", "Starbucks", 7.65, "Meals"],
          ["2026-08-02", "DoorDash", 32.1, "Meals"],
        ],
      }),
      expected: { disposition: "rejected" },
    },
    {
      name: "Copy of Portfolio_Status_Sep (1).xlsx",
      buffer: Buffer.from(sep),
      expected: { disposition: "duplicate" },
    },
  ];

  void policy;
  return files;
}
