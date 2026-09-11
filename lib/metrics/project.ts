import type { Dataset, Project, RaidItem, RAG } from "@/lib/data/types";
import { calendarDays } from "@/lib/metrics/dates";
import { costRAG, marginRAG, scheduleRAG, worstRAG } from "@/lib/metrics/rag";
import { roundHalfAwayFromZero } from "@/lib/metrics/round";

export interface ProjectMetrics {
  ProjectID: string;
  ApprovedCRRevenue: number;
  ApprovedCRCost: number;
  CurrentContractValue: number;
  BaselineBudget: number;
  CurrentBudget: number;
  ActualCost: number;
  ActualHours: number;
  ElapsedPct: number;
  EarnedValue: number;
  PlannedValue: number;
  CPI: number;
  SPI: number;
  EAC: number;
  ETC: number;
  VAC: number;
  BudgetBurnPct: number;
  ForecastMarginAmt: number;
  ForecastMarginPct: number;
  MarginVsTarget: number;
  ScheduleSlipDays: number;
  DaysRemaining: number;
  InvoicedToDate: number;
  CollectedToDate: number;
  UnbilledWIP: number;
  OpenRisks: number;
  OpenIssues: number;
  OpenRiskExposure: number;
  PendingCRs: number;
  TeamSize: number;
  NextMilestoneDate: Date | null;
  CostRAG: RAG;
  ScheduleRAG: RAG;
  MarginRAG: RAG;
  OverallRAG: RAG;
  HealthScore: number | null;
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function isActiveOn(asOf: Date, start: Date, end: Date): boolean {
  return start.getTime() <= asOf.getTime() && asOf.getTime() <= end.getTime();
}

function expectedExposure(item: RaidItem): number {
  return (item.CostExposure * item.Probability) / 5;
}

export function computeProjectMetrics(
  project: Project,
  dataset: Dataset,
  asOf: Date = dataset.settings.AsOfDate,
): ProjectMetrics {
  const settings = dataset.settings;
  const crs = dataset.changeRequests.filter((c) => c.ProjectID === project.ProjectID);
  const budget = dataset.budget.filter((b) => b.ProjectID === project.ProjectID);
  const actuals = dataset.actuals.filter((a) => a.ProjectID === project.ProjectID);
  const invoices = dataset.invoices.filter((i) => i.ProjectID === project.ProjectID);
  const raid = dataset.raid.filter((r) => r.ProjectID === project.ProjectID);
  const allocations = dataset.allocations.filter(
    (a) => a.ProjectID === project.ProjectID,
  );
  const milestones = dataset.milestones.filter((m) => m.ProjectID === project.ProjectID);

  const ApprovedCRRevenue = sum(
    crs.filter((c) => c.Status === "Approved").map((c) => c.RevenueImpact),
  );
  const ApprovedCRCost = sum(
    crs.filter((c) => c.Status === "Approved").map((c) => c.CostImpact),
  );
  const CurrentContractValue = project.OriginalContractValue + ApprovedCRRevenue;
  const BaselineBudget = sum(budget.map((b) => b.BudgetAmount));
  const CurrentBudget = BaselineBudget + ApprovedCRCost;
  const ActualCost = sum(actuals.map((a) => a.Amount));
  const ActualHours = sum(actuals.map((a) => a.Hours ?? 0));

  let ElapsedPct: number;
  if (project.Status === "Completed") {
    ElapsedPct = 1;
  } else if (asOf.getTime() <= project.BaselineStart.getTime()) {
    ElapsedPct = 0;
  } else {
    const span = Math.max(1, calendarDays(project.BaselineStart, project.BaselineEnd));
    ElapsedPct = Math.min(1, calendarDays(project.BaselineStart, asOf) / span);
  }

  const EarnedValue = project.PctComplete * CurrentBudget;
  const PlannedValue = ElapsedPct * CurrentBudget;
  const CPI = ActualCost === 0 ? 1 : EarnedValue / ActualCost;
  const SPI = PlannedValue === 0 ? 1 : EarnedValue / PlannedValue;

  let EAC: number;
  if (project.Status === "Completed") {
    EAC = ActualCost;
  } else if (project.PctComplete < 0.05) {
    EAC = Math.max(CurrentBudget, ActualCost);
  } else {
    EAC = ActualCost / project.PctComplete;
  }

  const ETC = Math.max(0, EAC - ActualCost);
  const VAC = CurrentBudget - EAC;
  const BudgetBurnPct = CurrentBudget === 0 ? 0 : ActualCost / CurrentBudget;
  const ForecastMarginAmt = CurrentContractValue - EAC;
  const ForecastMarginPct =
    CurrentContractValue === 0 ? 0 : ForecastMarginAmt / CurrentContractValue;
  const MarginVsTarget = ForecastMarginPct - project.TargetMarginPct;
  const ScheduleSlipDays = calendarDays(project.BaselineEnd, project.ForecastEnd);
  const DaysRemaining =
    project.Status === "Completed"
      ? 0
      : Math.max(0, calendarDays(asOf, project.ForecastEnd));

  const InvoicedToDate = sum(invoices.map((i) => i.Amount));
  const CollectedToDate = sum(
    invoices.filter((i) => i.PaidDate != null).map((i) => i.Amount),
  );
  const UnbilledWIP = project.PctComplete * CurrentContractValue - InvoicedToDate;

  const OpenRisks = raid.filter(
    (r) => r.Type === "Risk" && r.Status !== "Closed",
  ).length;
  const OpenIssues = raid.filter(
    (r) => r.Type === "Issue" && r.Status !== "Closed",
  ).length;
  const OpenRiskExposure = sum(
    raid.filter((r) => r.Status !== "Closed").map(expectedExposure),
  );
  const PendingCRs = crs.filter(
    (c) => c.Status === "Draft" || c.Status === "Submitted",
  ).length;
  const TeamSize = allocations.filter((a) =>
    isActiveOn(asOf, a.StartDate, a.EndDate),
  ).length;

  const openMilestones = milestones.filter((m) => m.ActualDate == null);
  let NextMilestoneDate: Date | null = null;
  for (const m of openMilestones) {
    if (
      NextMilestoneDate == null ||
      m.ForecastDate.getTime() < NextMilestoneDate.getTime()
    ) {
      NextMilestoneDate = m.ForecastDate;
    }
  }

  const CostRAG = costRAG(
    project.Status,
    BudgetBurnPct,
    project.PctComplete,
    settings.RAG_CostAmber,
    settings.RAG_CostRed,
  );
  const ScheduleRAG = scheduleRAG(
    project.Status,
    ScheduleSlipDays,
    settings.RAG_ScheduleAmberDays,
    settings.RAG_ScheduleRedDays,
  );
  const MarginRAG = marginRAG(
    project.Status,
    ForecastMarginPct,
    project.TargetMarginPct,
    settings.MarginFloor,
    settings.MarginTolerance,
  );
  const OverallRAG = worstRAG(CostRAG, ScheduleRAG, MarginRAG);

  let HealthScore: number | null = null;
  if (project.Status !== "Planned") {
    const raw =
      100 -
      150 * Math.max(0, BudgetBurnPct - project.PctComplete) -
      0.4 * Math.max(0, ScheduleSlipDays) -
      150 * Math.max(0, project.TargetMarginPct - ForecastMarginPct);
    HealthScore = Math.max(0, roundHalfAwayFromZero(raw, 0));
  }

  return {
    ProjectID: project.ProjectID,
    ApprovedCRRevenue,
    ApprovedCRCost,
    CurrentContractValue,
    BaselineBudget,
    CurrentBudget,
    ActualCost,
    ActualHours,
    ElapsedPct,
    EarnedValue,
    PlannedValue,
    CPI,
    SPI,
    EAC,
    ETC,
    VAC,
    BudgetBurnPct,
    ForecastMarginAmt,
    ForecastMarginPct,
    MarginVsTarget,
    ScheduleSlipDays,
    DaysRemaining,
    InvoicedToDate,
    CollectedToDate,
    UnbilledWIP,
    OpenRisks,
    OpenIssues,
    OpenRiskExposure,
    PendingCRs,
    TeamSize,
    NextMilestoneDate,
    CostRAG,
    ScheduleRAG,
    MarginRAG,
    OverallRAG,
    HealthScore,
  };
}

export function computeAllProjectMetrics(
  dataset: Dataset,
  asOf?: Date,
): ProjectMetrics[] {
  return dataset.projects.map((p) => computeProjectMetrics(p, dataset, asOf));
}
