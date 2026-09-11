import * as XLSX from "xlsx";
import {
  ROW_SCHEMAS,
  TABLE_HEADERS,
  type TableName,
} from "@/lib/data/schema";
import type {
  Dataset,
  DataIssue,
  ParseResult,
  SettingsMap,
} from "@/lib/data/types";

const INPUT_TABLES = Object.keys(ROW_SCHEMAS) as Exclude<TableName, "Settings">[];

type DatasetTableKey = Exclude<keyof Dataset, "settings">;

function blankToNull(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v === "" ? null : v;
  }
  return out;
}

function validateHeaders(
  sheetName: string,
  headers: string[],
  expected: readonly string[],
  issues: DataIssue[],
): boolean {
  const missing = expected.filter((h) => !headers.includes(h));
  for (const col of missing) {
    issues.push({
      table: sheetName,
      rowNumber: 1,
      column: col,
      message: `Missing required column ${col}`,
    });
  }
  return missing.length === 0;
}

function excelSerialToDate(serial: number): Date {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000);
}

function parseSettings(
  rows: Record<string, unknown>[],
  issues: DataIssue[],
): SettingsMap {
  const map: Record<string, unknown> = {};
  rows.forEach((row, i) => {
    const key = row.Setting;
    const value = row.Value === "" ? null : row.Value;
    if (typeof key !== "string" || key.trim() === "") {
      issues.push({
        table: "Settings",
        rowNumber: i + 2,
        column: "Setting",
        message: "Setting key is required",
      });
      return;
    }
    map[key] = value;
  });

  const dateKeys = ["AsOfDate", "ActualsCutoff"] as const;
  const numKeys = [
    "RAG_CostAmber",
    "RAG_CostRed",
    "RAG_ScheduleAmberDays",
    "RAG_ScheduleRedDays",
    "MarginFloor",
    "MarginTolerance",
    "OverallocationThreshold",
    "UnderutilizationThreshold",
    "RiskCriticalScore",
    "RiskHighScore",
    "RiskMediumScore",
    "MilestoneAtRiskDays",
    "BudgetNearLimit",
    "Contingency_High",
    "Contingency_Medium",
    "Contingency_Low",
    "AutoRefreshMinutes",
  ] as const;

  const settings: Record<string, Date | number | string> = {};
  for (const k of dateKeys) {
    const v = map[k];
    if (v instanceof Date) {
      settings[k] = v;
    } else if (typeof v === "string" || typeof v === "number") {
      const d = typeof v === "number" ? excelSerialToDate(v) : new Date(v);
      if (Number.isNaN(d.getTime())) {
        issues.push({
          table: "Settings",
          rowNumber: 2,
          column: k,
          message: `Invalid date for ${k}`,
        });
        settings[k] = new Date(Date.UTC(2026, 8, 11));
      } else {
        settings[k] = d;
      }
    } else {
      issues.push({
        table: "Settings",
        rowNumber: 2,
        column: k,
        message: `Missing setting ${k}`,
      });
      settings[k] = new Date(Date.UTC(2026, 8, 11));
    }
  }
  for (const k of numKeys) {
    const v = map[k];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isNaN(n)) {
      issues.push({
        table: "Settings",
        rowNumber: 2,
        column: k,
        message: `Invalid number for ${k}`,
      });
      settings[k] = 0;
    } else {
      settings[k] = n;
    }
  }
  settings.Currency = String(map.Currency ?? "CAD");
  return settings as SettingsMap;
}

function sheetToRows(
  wb: XLSX.WorkBook,
  name: string,
  issues: DataIssue[],
): { headers: string[]; rows: Record<string, unknown>[] } | null {
  const sheet = wb.Sheets[name];
  if (!sheet) {
    issues.push({
      table: name,
      rowNumber: 1,
      column: "",
      message: `Sheet ${name} is missing`,
    });
    return null;
  }
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | boolean | null)[]>(
    sheet,
    {
      header: 1,
      defval: null,
      raw: true,
    },
  );
  if (matrix.length === 0) {
    issues.push({
      table: name,
      rowNumber: 1,
      column: "",
      message: `Sheet ${name} is empty`,
    });
    return null;
  }
  const headers = (matrix[0] ?? []).map((h) => String(h ?? ""));
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i];
    if (!line || line.every((c) => c === null || c === "")) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      obj[h] = line[idx] ?? null;
    });
    rows.push(blankToNull(obj));
  }
  return { headers, rows };
}

function defaultSettings(): SettingsMap {
  return {
    AsOfDate: new Date(Date.UTC(2026, 8, 11)),
    ActualsCutoff: new Date(Date.UTC(2026, 8, 11)),
    RAG_CostAmber: 0.1,
    RAG_CostRed: 0.2,
    RAG_ScheduleAmberDays: 14,
    RAG_ScheduleRedDays: 30,
    MarginFloor: 0.1,
    MarginTolerance: 0.05,
    OverallocationThreshold: 1.0,
    UnderutilizationThreshold: 0.5,
    RiskCriticalScore: 20,
    RiskHighScore: 12,
    RiskMediumScore: 6,
    MilestoneAtRiskDays: 14,
    BudgetNearLimit: 0.9,
    Contingency_High: 0.15,
    Contingency_Medium: 0.1,
    Contingency_Low: 0.05,
    Currency: "CAD",
    AutoRefreshMinutes: 10,
  };
}

export function parseWorkbook(
  buffer: ArrayBuffer | Buffer,
  version: string,
  fetchedAt: Date = new Date(),
): ParseResult {
  const issues: DataIssue[] = [];
  const wb = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const dataset: Dataset = {
    projects: [],
    resources: [],
    allocations: [],
    estimates: [],
    budget: [],
    actuals: [],
    milestones: [],
    invoices: [],
    raid: [],
    changeRequests: [],
    snapshots: [],
    clients: [],
    settings: defaultSettings(),
  };

  const keyMap: Record<Exclude<TableName, "Settings">, DatasetTableKey> = {
    Projects: "projects",
    Resources: "resources",
    Allocations: "allocations",
    Estimates: "estimates",
    Budget: "budget",
    Actuals: "actuals",
    Milestones: "milestones",
    Invoices: "invoices",
    RAID: "raid",
    ChangeRequests: "changeRequests",
    Snapshots: "snapshots",
    Clients: "clients",
  };

  for (const table of INPUT_TABLES) {
    const parsed = sheetToRows(wb, table, issues);
    if (!parsed) continue;
    const expected = TABLE_HEADERS[table];
    if (!validateHeaders(table, parsed.headers, expected, issues)) continue;
    const schema = ROW_SCHEMAS[table];
    const out: Dataset[DatasetTableKey] = [];
    parsed.rows.forEach((row, i) => {
      const result = schema.safeParse(row);
      if (result.success) {
        (out as unknown[]).push(result.data);
      } else {
        for (const err of result.error.issues) {
          issues.push({
            table,
            rowNumber: i + 2,
            column: String(err.path[0] ?? ""),
            message: err.message,
          });
        }
      }
    });
    dataset[keyMap[table]] = out as never;
  }

  const settingsParsed = sheetToRows(wb, "Settings", issues);
  if (settingsParsed) {
    if (
      validateHeaders(
        "Settings",
        settingsParsed.headers,
        TABLE_HEADERS.Settings,
        issues,
      )
    ) {
      dataset.settings = parseSettings(settingsParsed.rows, issues);
    }
  }

  return {
    dataset,
    issues,
    version,
    fetchedAt,
  };
}
