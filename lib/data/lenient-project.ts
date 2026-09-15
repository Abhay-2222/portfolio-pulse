import type { Project, ProjectStatus, Priority, ContractType } from "@/lib/data/types";

export function slugProjectId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `name:${slug || "project"}`;
}

export function coercePercent(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return null;
    if (value > 1 && value <= 100) return value / 100;
    return value;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (t.endsWith("%")) {
      const n = Number(t.slice(0, -1).replace(/,/g, "").trim());
      return Number.isNaN(n) ? null : n / 100;
    }
    const n = Number(t.replace(/,/g, ""));
    if (Number.isNaN(n)) return null;
    if (n > 1 && n <= 100) return n / 100;
    return n;
  }
  return null;
}

function excelSerialToDate(serial: number): Date {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000);
}

export function coerceDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = excelSerialToDate(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function isBlank(value: unknown): boolean {
  return value == null || value === "";
}

const STATUSES: ProjectStatus[] = ["Planned", "Active", "On Hold", "Completed"];
const PRIORITIES: Priority[] = ["P1", "P2", "P3"];
const CONTRACTS: ContractType[] = [
  "Fixed Price",
  "Time & Materials",
  "Retainer",
];

export function hydrateProject(values: Record<string, unknown>): Project | null {
  const name = String(values.ProjectName ?? "").trim();
  let id = String(values.ProjectID ?? "").trim();
  if (!name) return null;
  if (!id) id = slugProjectId(name);

  const absent: string[] = [];
  const note = (field: string, missing: boolean) => {
    if (missing) absent.push(field);
  };

  const statusRaw = String(values.Status ?? "").trim();
  const Status: ProjectStatus = STATUSES.includes(statusRaw as ProjectStatus)
    ? (statusRaw as ProjectStatus)
    : "Active";
  note("Status", isBlank(values.Status));

  const priorityRaw = String(values.Priority ?? "").trim();
  const Priority: Priority = PRIORITIES.includes(priorityRaw as Priority)
    ? (priorityRaw as Priority)
    : "P3";
  note("Priority", isBlank(values.Priority));

  const contractRaw = String(values.ContractType ?? "").trim();
  const ContractType: ContractType = CONTRACTS.includes(
    contractRaw as ContractType,
  )
    ? (contractRaw as ContractType)
    : "Fixed Price";
  note("ContractType", isBlank(values.ContractType));

  const BaselineStart = coerceDate(values.BaselineStart);
  const BaselineEnd = coerceDate(values.BaselineEnd);
  const ForecastEnd = coerceDate(values.ForecastEnd);
  note("BaselineStart", BaselineStart == null);
  note("BaselineEnd", BaselineEnd == null);
  note("ForecastEnd", ForecastEnd == null);

  const contract = Number(values.OriginalContractValue);
  const OriginalContractValue = Number.isFinite(contract) ? contract : 0;
  note(
    "OriginalContractValue",
    isBlank(values.OriginalContractValue) || !Number.isFinite(contract),
  );

  const target = coercePercent(values.TargetMarginPct);
  const TargetMarginPct = target ?? 0;
  note("TargetMarginPct", target == null);

  const pct = coercePercent(values.PctComplete);
  const PctComplete = pct ?? 0;
  note("PctComplete", pct == null);

  const score = Number(values.StrategicScore);
  const StrategicScore = Number.isFinite(score) ? score : 0;
  note("StrategicScore", isBlank(values.StrategicScore));

  const ClientID = String(values.ClientID ?? "").trim();
  note("ClientID", !ClientID);
  const Portfolio = String(values.Portfolio ?? "").trim();
  note("Portfolio", !Portfolio);
  const BusinessUnit = String(values.BusinessUnit ?? "").trim();
  note("BusinessUnit", !BusinessUnit);
  const ProjectManagerID = String(values.ProjectManagerID ?? "").trim();
  note("ProjectManagerID", !ProjectManagerID);
  const Phase = String(values.Phase ?? "").trim();
  note("Phase", !String(values.Phase ?? "").trim());

  return {
    ProjectID: id,
    ProjectName: name,
    ClientID,
    Portfolio,
    BusinessUnit,
    ProjectManagerID,
    ExecutiveSponsor: values.ExecutiveSponsor
      ? String(values.ExecutiveSponsor)
      : null,
    Status,
    Phase,
    Priority,
    ContractType,
    StrategicScore,
    BaselineStart,
    BaselineEnd,
    ForecastEnd,
    OriginalContractValue,
    TargetMarginPct,
    PctComplete,
    LastStatusUpdate: coerceDate(values.LastStatusUpdate),
    absent,
  };
}

export function sampleCell(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return String(value);
  const s = String(value).trim();
  return s.length > 48 ? `${s.slice(0, 45)}…` : s;
}
