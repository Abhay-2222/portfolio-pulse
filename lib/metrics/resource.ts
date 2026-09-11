import type { Dataset, Resource, UtilizationStatus } from "@/lib/data/types";
import { startOfYear } from "@/lib/metrics/dates";
import { round1 } from "@/lib/metrics/round";

export interface ResourceMetrics {
  EmployeeID: string;
  CurrentAllocationPct: number;
  AvailableHrsPerWeek: number;
  UtilizationStatus: UtilizationStatus;
  HoursLoggedYTD: number;
  BillableHoursYTD: number;
}

export function computeResourceMetrics(
  resource: Resource,
  dataset: Dataset,
  asOf: Date = dataset.settings.AsOfDate,
): ResourceMetrics {
  const settings = dataset.settings;
  const allocs = dataset.allocations.filter(
    (a) =>
      a.EmployeeID === resource.EmployeeID &&
      a.StartDate.getTime() <= asOf.getTime() &&
      asOf.getTime() <= a.EndDate.getTime(),
  );
  const CurrentAllocationPct = allocs.reduce((s, a) => s + a.AllocationPct, 0);
  const AvailableHrsPerWeek = round1(
    resource.WeeklyCapacityHrs * Math.max(0, 1 - CurrentAllocationPct),
  );

  let UtilizationStatus: UtilizationStatus;
  if (resource.WeeklyCapacityHrs === 0) {
    UtilizationStatus = "Non-assignable";
  } else if (CurrentAllocationPct > settings.OverallocationThreshold) {
    UtilizationStatus = "Overallocated";
  } else if (CurrentAllocationPct < settings.UnderutilizationThreshold) {
    UtilizationStatus = "Under-utilized";
  } else {
    UtilizationStatus = "Healthy";
  }

  const ytdStart = startOfYear(asOf);
  const actuals = dataset.actuals.filter(
    (a) =>
      a.EmployeeID === resource.EmployeeID &&
      a.Period.getTime() >= ytdStart.getTime(),
  );
  const HoursLoggedYTD = actuals.reduce((s, a) => s + (a.Hours ?? 0), 0);
  const BillableHoursYTD = actuals
    .filter((a) => a.Billable === "Yes")
    .reduce((s, a) => s + (a.Hours ?? 0), 0);

  return {
    EmployeeID: resource.EmployeeID,
    CurrentAllocationPct,
    AvailableHrsPerWeek,
    UtilizationStatus,
    HoursLoggedYTD,
    BillableHoursYTD,
  };
}

export function computeAllResourceMetrics(
  dataset: Dataset,
  asOf?: Date,
): ResourceMetrics[] {
  return dataset.resources.map((r) => computeResourceMetrics(r, dataset, asOf));
}
