import type {
  Allocation,
  AgingBucket,
  BudgetLine,
  BudgetLineStatus,
  Dataset,
  Invoice,
  InvoiceStatus,
  Milestone,
  MilestoneStatus,
  Resource,
} from "@/lib/data/types";
import { addDays, calendarDays, networkDays } from "@/lib/metrics/dates";
import { round1 } from "@/lib/metrics/round";

export interface AllocationMetrics {
  AllocationID: string;
  PlannedHours: number;
  PlannedCost: number;
}

export function computeAllocationMetrics(
  allocation: Allocation,
  resource: Resource | undefined,
): AllocationMetrics {
  const capacity = resource?.WeeklyCapacityHrs ?? 0;
  const PlannedHours = round1(
    networkDays(allocation.StartDate, allocation.EndDate) *
      (capacity / 5) *
      allocation.AllocationPct,
  );
  const PlannedCost = PlannedHours * (resource?.CostRateHr ?? 0);
  return {
    AllocationID: allocation.AllocationID,
    PlannedHours,
    PlannedCost,
  };
}

export interface InvoiceMetrics {
  InvoiceID: string;
  DueDate: Date;
  Status: InvoiceStatus;
  DaysOverdue: number;
  AgingBucket: AgingBucket;
}

export function computeInvoiceMetrics(
  invoice: Invoice,
  dataset: Dataset,
  asOf: Date = dataset.settings.AsOfDate,
): InvoiceMetrics {
  const project = dataset.projects.find((p) => p.ProjectID === invoice.ProjectID);
  const client = project
    ? dataset.clients.find((c) => c.ClientID === project.ClientID)
    : undefined;
  const terms = client?.PaymentTermsDays ?? 30;
  const DueDate = addDays(invoice.InvoiceDate, terms);

  let Status: InvoiceStatus;
  if (invoice.PaidDate != null) {
    Status = "Paid";
  } else if (asOf.getTime() > DueDate.getTime()) {
    Status = "Overdue";
  } else {
    Status = "Outstanding";
  }

  const DaysOverdue = Status === "Overdue" ? calendarDays(DueDate, asOf) : 0;

  let AgingBucket: AgingBucket;
  if (Status === "Paid") {
    AgingBucket = "Paid";
  } else if (Status !== "Overdue") {
    AgingBucket = "Current";
  } else if (DaysOverdue <= 30) {
    AgingBucket = "1-30";
  } else if (DaysOverdue <= 60) {
    AgingBucket = "31-60";
  } else {
    AgingBucket = "60+";
  }

  return { InvoiceID: invoice.InvoiceID, DueDate, Status, DaysOverdue, AgingBucket };
}

export function computeMilestoneStatus(
  milestone: Milestone,
  dataset: Dataset,
  asOf: Date = dataset.settings.AsOfDate,
): MilestoneStatus {
  if (milestone.ActualDate != null) return "Completed";
  if (milestone.ForecastDate.getTime() < asOf.getTime()) return "Overdue";
  const slip = calendarDays(milestone.BaselineDate, milestone.ForecastDate);
  if (slip > dataset.settings.MilestoneAtRiskDays) return "At Risk";
  return "On Track";
}

export interface BudgetLineMetrics {
  BudgetLineID: string;
  ActualToDate: number;
  BurnPct: number;
  LineStatus: BudgetLineStatus;
}

export function computeBudgetLineMetrics(
  line: BudgetLine,
  dataset: Dataset,
): BudgetLineMetrics {
  const ActualToDate = dataset.actuals
    .filter(
      (a) =>
        a.ProjectID === line.ProjectID && a.CostCategory === line.CostCategory,
    )
    .reduce((s, a) => s + a.Amount, 0);
  const BurnPct = line.BudgetAmount === 0 ? 0 : ActualToDate / line.BudgetAmount;
  let LineStatus: BudgetLineStatus;
  if (line.CostCategory.toLowerCase() === "contingency") {
    LineStatus = "Reserve";
  } else if (BurnPct > 1) {
    LineStatus = "Overspent";
  } else if (BurnPct >= dataset.settings.BudgetNearLimit) {
    LineStatus = "Near limit";
  } else {
    LineStatus = "Within budget";
  }
  return { BudgetLineID: line.BudgetLineID, ActualToDate, BurnPct, LineStatus };
}
