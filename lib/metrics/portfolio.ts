import type { Dataset } from "@/lib/data/types";
import {
  computeInvoiceMetrics,
  computeMilestoneStatus,
} from "@/lib/metrics/finance";
import {
  computeAllProjectMetrics,
  type ProjectMetrics,
} from "@/lib/metrics/project";
import { computeRaidMetrics } from "@/lib/metrics/risk";
import { computeAllResourceMetrics } from "@/lib/metrics/resource";

export interface PortfolioKPIs {
  activeProjects: number;
  activeContractValue: number;
  activeBudget: number;
  actualCostActive: number;
  eacActive: number;
  forecastMarginPct: number;
  weightedTargetMargin: number;
  offTrack: number;
  watch: number;
  onTrack: number;
  averageHealthScore: number;
  averageScheduleSlip: number;
  overallocated: number;
  underUtilized: number;
  benchCapacityHrs: number;
  outstandingReceivables: number;
  overdueReceivables: number;
  unbilledWipActive: number;
  openCriticalRisks: number;
  weightedOpenRiskExposure: number;
  pendingChangeRequests: number;
  pendingChangeRequestCost: number;
  overdueMilestones: number;
}

export function computePortfolioKPIs(
  dataset: Dataset,
  asOf: Date = dataset.settings.AsOfDate,
  projectMetrics?: ProjectMetrics[],
): PortfolioKPIs {
  const metrics = projectMetrics ?? computeAllProjectMetrics(dataset, asOf);
  const byId = new Map(metrics.map((m) => [m.ProjectID, m]));
  const active = dataset.projects.filter((p) => p.Status === "Active");
  const activeMetrics = active.map((p) => byId.get(p.ProjectID)!);

  const activeContractValue = activeMetrics.reduce(
    (s, m) => s + m.CurrentContractValue,
    0,
  );
  const activeBudget = activeMetrics.reduce((s, m) => s + m.CurrentBudget, 0);
  const actualCostActive = activeMetrics.reduce((s, m) => s + m.ActualCost, 0);
  const eacActive = activeMetrics.reduce((s, m) => s + m.EAC, 0);
  const forecastMarginPct =
    activeContractValue === 0
      ? 0
      : (activeContractValue - eacActive) / activeContractValue;
  const weightedTargetMargin =
    activeContractValue === 0
      ? 0
      : active.reduce((s, p) => {
          const m = byId.get(p.ProjectID)!;
          return s + m.CurrentContractValue * p.TargetMarginPct;
        }, 0) / activeContractValue;

  const offTrack = activeMetrics.filter((m) => m.OverallRAG === "Red").length;
  const watch = activeMetrics.filter((m) => m.OverallRAG === "Amber").length;
  const onTrack = activeMetrics.filter((m) => m.OverallRAG === "Green").length;

  const healthScores = activeMetrics
    .map((m) => m.HealthScore)
    .filter((h): h is number => h != null);
  const averageHealthScore =
    healthScores.length === 0
      ? 0
      : healthScores.reduce((a, b) => a + b, 0) / healthScores.length;
  const averageScheduleSlip =
    activeMetrics.length === 0
      ? 0
      : activeMetrics.reduce((s, m) => s + m.ScheduleSlipDays, 0) /
        activeMetrics.length;

  const resources = computeAllResourceMetrics(dataset, asOf);
  const overallocated = resources.filter(
    (r) => r.UtilizationStatus === "Overallocated",
  ).length;
  const underUtilized = resources.filter(
    (r) => r.UtilizationStatus === "Under-utilized",
  ).length;
  // Summary "Bench capacity" = Σ AvailableHrsPerWeek where AvailableHrsPerWeek > 0
  const benchCapacityHrs = resources
    .filter((r) => r.AvailableHrsPerWeek > 0)
    .reduce((s, r) => s + r.AvailableHrsPerWeek, 0);

  const invoiceMetrics = dataset.invoices.map((i) =>
    computeInvoiceMetrics(i, dataset, asOf),
  );
  const outstandingReceivables = invoiceMetrics
    .filter((i) => i.Status === "Outstanding" || i.Status === "Overdue")
    .reduce((s, im) => {
      const inv = dataset.invoices.find((i) => i.InvoiceID === im.InvoiceID)!;
      return s + inv.Amount;
    }, 0);
  const overdueReceivables = invoiceMetrics
    .filter((i) => i.Status === "Overdue")
    .reduce((s, im) => {
      const inv = dataset.invoices.find((i) => i.InvoiceID === im.InvoiceID)!;
      return s + inv.Amount;
    }, 0);

  const unbilledWipActive = activeMetrics.reduce((s, m) => s + m.UnbilledWIP, 0);

  const openRaid = dataset.raid.filter((r) => r.Status !== "Closed");
  // Summary counts Critical severity across all RAID types (not Risk-only)
  const openCriticalRisks = openRaid.filter((r) => {
    const m = computeRaidMetrics(r, dataset);
    return m.Severity === "Critical";
  }).length;
  const weightedOpenRiskExposure = openRaid.reduce(
    (s, r) => s + computeRaidMetrics(r, dataset).ExpectedExposure,
    0,
  );

  const pending = dataset.changeRequests.filter(
    (c) => c.Status === "Draft" || c.Status === "Submitted",
  );
  const pendingChangeRequests = pending.length;
  const pendingChangeRequestCost = pending.reduce((s, c) => s + c.CostImpact, 0);

  const overdueMilestones = dataset.milestones.filter(
    (m) => computeMilestoneStatus(m, dataset, asOf) === "Overdue",
  ).length;

  return {
    activeProjects: active.length,
    activeContractValue,
    activeBudget,
    actualCostActive,
    eacActive,
    forecastMarginPct,
    weightedTargetMargin,
    offTrack,
    watch,
    onTrack,
    averageHealthScore,
    averageScheduleSlip,
    overallocated,
    underUtilized,
    benchCapacityHrs,
    outstandingReceivables,
    overdueReceivables,
    unbilledWipActive,
    openCriticalRisks,
    weightedOpenRiskExposure,
    pendingChangeRequests,
    pendingChangeRequestCost,
    overdueMilestones,
  };
}
