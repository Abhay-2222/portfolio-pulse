import type { Dataset, Project } from "@/lib/data/types";
import { calendarDays } from "@/lib/metrics/dates";
import { computeInvoiceMetrics } from "@/lib/metrics/finance";
import type { ProjectMetrics } from "@/lib/metrics/project";
import type { ResourceMetrics } from "@/lib/metrics/resource";
import type { HealthContributor } from "@/lib/findings/types";
import { cells } from "@/lib/ledger/cells";
import { EMPTY_FIGURE } from "@/lib/format";

export type UninvoicedMilestone = {
  MilestoneID: string;
  ProjectID: string;
  MilestoneName: string;
  ForecastDate: Date;
  amount: number;
};

export function billingAmount(
  milestone: { BillingPct: number | null },
  contractValue: number,
): number {
  const pct = milestone.BillingPct ?? 0;
  const ratio = pct > 1 ? pct / 100 : pct;
  return ratio * contractValue;
}

export function uninvoicedBillingMilestones(
  dataset: Dataset,
  _projectMetrics: ProjectMetrics[],
  asOf: Date = dataset.settings.AsOfDate,
  scope: "portfolio" | string = "portfolio",
): UninvoicedMilestone[] {
  const invoiced = new Set(
    dataset.invoices
      .map((i) => i.MilestoneID)
      .filter((id): id is string => id != null && id !== ""),
  );
  return dataset.milestones
    .filter(
      (m) =>
        m.IsBillingMilestone === "Yes" &&
        m.ForecastDate.getTime() < asOf.getTime() &&
        m.ActualDate == null &&
        !invoiced.has(m.MilestoneID),
    )
    .map((m) => ({
      MilestoneID: m.MilestoneID,
      ProjectID: m.ProjectID,
      MilestoneName: m.MilestoneName,
      ForecastDate: m.ForecastDate,
      amount: billingAmount(
        m,
        dataset.projects.find((p) => p.ProjectID === m.ProjectID)
          ?.OriginalContractValue ?? 0,
      ),
    }))
    .filter((m) => scope === "portfolio" || m.ProjectID === scope)
    .sort((a, b) => b.amount - a.amount);
}

export function uninvoicedBillingTotal(
  dataset: Dataset,
  projectMetrics: ProjectMetrics[],
  scope: "portfolio" | string = "portfolio",
  asOf: Date = dataset.settings.AsOfDate,
): { amount: number; count: number } {
  const rows = uninvoicedBillingMilestones(dataset, projectMetrics, asOf, scope);
  return {
    amount: rows.reduce((s, r) => s + r.amount, 0),
    count: rows.length,
  };
}

export function wipSplit(activeMetrics: ProjectMetrics[]): {
  gross: number;
  overbilled: number;
  net: number;
} {
  let gross = 0;
  let overbilled = 0;
  for (const m of activeMetrics) {
    if (!m.marginReady) continue;
    if (m.UnbilledWIP > 0) gross += m.UnbilledWIP;
    else overbilled += m.UnbilledWIP;
  }
  return { gross, overbilled, net: gross + overbilled };
}

export function contingencyRemaining(
  dataset: Dataset,
  projectId?: string,
): number {
  return dataset.budget
    .filter(
      (b) =>
        b.CostCategory.toLowerCase() === "contingency" &&
        (projectId == null || b.ProjectID === projectId),
    )
    .reduce((sum, line) => {
      const spent = dataset.actuals
        .filter(
          (a) =>
            a.ProjectID === line.ProjectID &&
            a.CostCategory === line.CostCategory,
        )
        .reduce((s, a) => s + a.Amount, 0);
      return sum + Math.max(0, line.BudgetAmount - spent);
    }, 0);
}

export function healthContributors(
  project: Project,
  metrics: ProjectMetrics,
  dataset?: Dataset,
): HealthContributor[] {
  const costDeduction =
    150 * Math.max(0, metrics.BudgetBurnPct - project.PctComplete);
  const scheduleDeduction = 0.4 * Math.max(0, metrics.ScheduleSlipDays);
  const marginDeduction =
    150 * Math.max(0, project.TargetMarginPct - metrics.ForecastMarginPct);
  const id = project.ProjectID;
  const src = (entries: Array<[string, string, string]>) =>
    dataset ? cells(dataset, entries) : [];
  return [
    {
      label: "Margin shortfall",
      deduction: marginDeduction,
      detail: `${(metrics.ForecastMarginPct * 100).toFixed(1)}% vs ${(project.TargetMarginPct * 100).toFixed(0)}% target`,
      provenance: src([
        ["Projects", id, "TargetMarginPct"],
        ["Projects", id, "OriginalContractValue"],
        ["Settings", "MarginFloor", "Value"],
      ]),
    },
    {
      label: "Cost over-burn",
      deduction: costDeduction,
      detail: `${(metrics.BudgetBurnPct * 100).toFixed(0)}% spent, ${(project.PctComplete * 100).toFixed(0)}% complete`,
      provenance: src([
        ["Projects", id, "PctComplete"],
        ...dataset
          ? dataset.budget
              .filter((b) => b.ProjectID === id)
              .slice(0, 4)
              .map(
                (b) =>
                  ["Budget", b.BudgetLineID, "BudgetAmount"] as [
                    string,
                    string,
                    string,
                  ],
              )
          : [],
      ]),
    },
    {
      label: "Schedule slip",
      deduction: scheduleDeduction,
      detail: `${metrics.ScheduleSlipDays} days late`,
      provenance: src([
        ["Projects", id, "BaselineEnd"],
        ["Projects", id, "ForecastEnd"],
      ]),
    },
  ].sort((a, b) => b.deduction - a.deduction);
}

export function healthWhyLine(
  metrics: {
    HealthScore: number | null;
    CostRAG: string;
    ScheduleRAG: string;
    MarginRAG: string;
  },
  contributors: HealthContributor[],
): string {
  const legs = [
    { name: "cost", rag: metrics.CostRAG },
    { name: "schedule", rag: metrics.ScheduleRAG },
    { name: "margin", rag: metrics.MarginRAG },
  ];
  const bad = legs.filter((l) => l.rag !== "Green" && l.rag !== "N/A");
  const top = [...contributors].sort((a, b) => b.deduction - a.deduction)[0];
  const pts = Math.round(top?.deduction ?? 0);
  const health = metrics.HealthScore ?? EMPTY_FIGURE;
  if (bad.length === 0) {
    return `Health ${health}: on track on all three.`;
  }
  if (bad.length === 1) {
    return `Health ${health}: ${bad[0]!.name} only. Everything else is clean.`;
  }
  const hit = top?.label ?? "The top contributor";
  if (bad.length === 3 && legs.every((l) => l.rag === "Red")) {
    return `Health ${health}: red on all three. ${hit} is the biggest hit: ${pts} of 100 points.`;
  }
  return `Health ${health}: ${bad.map((b) => b.name).join(" and ")}. ${hit} costs the most: ${pts} points.`;
}

export function daysInReview(raised: Date, asOf: Date): number {
  return calendarDays(raised, asOf);
}

export function crAfterPosition(
  metrics: ProjectMetrics,
  cr: { RevenueImpact: number; CostImpact: number; ScheduleImpactDays: number },
): { marginPct: number; slipDays: number } {
  const contract = metrics.CurrentContractValue + cr.RevenueImpact;
  const eac = metrics.EAC + cr.CostImpact;
  return {
    marginPct: contract === 0 ? 0 : (contract - eac) / contract,
    slipDays: metrics.ScheduleSlipDays + cr.ScheduleImpactDays,
  };
}

export function rankWord(n: number): string {
  return (
    ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"][
      n - 1
    ] ?? `${n}th`
  );
}

export function lastSnapshotAgeDays(
  dataset: Dataset,
  projectId: string,
  asOf: Date = dataset.settings.AsOfDate,
): number | null {
  const dates = dataset.snapshots
    .filter((s) => s.ProjectID === projectId)
    .map((s) => s.SnapshotDate.getTime());
  if (dates.length === 0) return null;
  return calendarDays(new Date(Math.max(...dates)), asOf);
}

export function collectabilityScore(input: {
  amount: number;
  daysOverdue: number;
  clientTier: string;
  projectRag: string;
}): number {
  const tierWeight =
    input.clientTier === "Strategic" || input.clientTier === "1"
      ? 1.2
      : input.clientTier === "2"
        ? 1
        : 0.85;
  const ragWeight =
    input.projectRag === "Red" ? 0.55 : input.projectRag === "Amber" ? 0.8 : 1;
  const ageWeight = 1 + Math.min(input.daysOverdue, 120) / 120;
  return input.amount * ageWeight * tierWeight * ragWeight;
}

export function activeMetricsOf(
  dataset: Dataset,
  metrics: ProjectMetrics[],
): ProjectMetrics[] {
  const active = new Set(
    dataset.projects.filter((p) => p.Status === "Active").map((p) => p.ProjectID),
  );
  return metrics.filter((m) => active.has(m.ProjectID));
}

export type EbitdaBridge = {
  recognisedRevenue: number;
  directCost: number;
  grossMargin: number;
  benchCostMonthly: number;
  sgaMonthly: number;
  unrecoveredContingency: number;
  ebitdaRunRate: number;
};

export function computeEbitdaBridge(
  dataset: Dataset,
  projectMetrics: ProjectMetrics[],
  resourceMetrics: ResourceMetrics[],
): EbitdaBridge {
  const byId = new Map(projectMetrics.map((m) => [m.ProjectID, m]));
  const active = dataset.projects.filter((p) => p.Status === "Active");
  const recognisedRevenue = active.reduce((s, p) => {
    const m = byId.get(p.ProjectID);
    return s + p.PctComplete * (m?.CurrentContractValue ?? 0);
  }, 0);
  const directCost = active.reduce(
    (s, p) => s + (byId.get(p.ProjectID)?.ActualCost ?? 0),
    0,
  );
  const resources = new Map(
    dataset.resources.map((r) => [r.EmployeeID, r]),
  );
  const weeks = 4;
  const benchCostMonthly = resourceMetrics.reduce((s, m) => {
    const r = resources.get(m.EmployeeID);
    if (!r || m.AvailableHrsPerWeek <= 0) return s;
    return s + m.AvailableHrsPerWeek * r.CostRateHr * weeks;
  }, 0);
  const sgaMonthly = dataset.resources
    .filter((r) => r.BillRateHr === 0)
    .reduce((s, r) => s + r.CostRateHr * r.WeeklyCapacityHrs * weeks, 0);
  const unrecoveredContingency = contingencyRemaining(dataset);
  const grossMargin = recognisedRevenue - directCost;
  return {
    recognisedRevenue,
    directCost,
    grossMargin,
    benchCostMonthly,
    sgaMonthly,
    unrecoveredContingency,
    ebitdaRunRate:
      grossMargin - benchCostMonthly - sgaMonthly - unrecoveredContingency,
  };
}

export function snapshotSpark(
  dataset: Dataset,
  projectId: string,
): Array<{ date: Date; margin: number; rag: string }> {
  return dataset.snapshots
    .filter((s) => s.ProjectID === projectId)
    .sort((a, b) => a.SnapshotDate.getTime() - b.SnapshotDate.getTime())
    .map((s) => ({
      date: s.SnapshotDate,
      margin: s.ForecastMarginPct,
      rag: s.OverallRAG,
    }));
}
