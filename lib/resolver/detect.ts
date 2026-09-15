import * as XLSX from "xlsx";
import { bindHeader, fingerprint } from "@/lib/resolver/bind";
import type { DetectedTable } from "@/lib/resolver/types";

function nonempty(row: unknown[] | undefined): number {
  if (!row) return 0;
  return row.filter((c) => c != null && String(c).trim() !== "").length;
}

function looksLikeLabel(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (s.length < 2 || s.length > 48) return false;
  if (/^\d+(\.\d+)?$/.test(s)) return false;
  return true;
}

function joinTwoRowHeader(top: unknown[], bottom: unknown[]): string[] {
  const n = Math.max(top.length, bottom.length);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = String(top[i] ?? "").trim();
    const b = String(bottom[i] ?? "").trim();
    out.push([a, b].filter(Boolean).join(" ").trim());
  }
  return out;
}

export function detectTables(
  fileId: string,
  wb: XLSX.WorkBook,
): DetectedTable[] {
  const tables: DetectedTable[] = [];
  for (const sheet of wb.SheetNames) {
    if (sheet.startsWith("_")) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], {
      header: 1,
      defval: null,
      raw: true,
    });
    if (matrix.length === 0) continue;

    let headerIdx = -1;
    let twoRow = false;
    const titleParts: string[] = [];
    for (let i = 0; i < Math.min(matrix.length, 12); i++) {
      const row = matrix[i] ?? [];
      const filled = nonempty(row);
      const labels = row.filter(looksLikeLabel).length;
      const boundHits = row
        .filter(looksLikeLabel)
        .filter((c) => bindHeader(String(c)).canonical != null).length;
      if (filled <= 2 && labels >= 1 && boundHits === 0) {
        titleParts.push(String(row.find(looksLikeLabel) ?? ""));
        continue;
      }
      if (
        labels >= 2 &&
        (labels >= 3 || boundHits >= 1 || labels / Math.max(filled, 1) >= 0.8)
      ) {
        headerIdx = i;
        const next = matrix[i + 1] ?? [];
        const blanks = row.filter((c, idx) => idx < row.length && (c == null || String(c).trim() === "")).length;
        const nextLabels = next.filter(looksLikeLabel).length;
        if (
          blanks >= 1 &&
          nextLabels >= 3 &&
          i + 2 < matrix.length &&
          nonempty(matrix[i + 2]) >= 2
        ) {
          twoRow = true;
        }
        break;
      }
    }
    if (headerIdx < 0) continue;
    const headers = twoRow
      ? joinTwoRowHeader(matrix[headerIdx] ?? [], matrix[headerIdx + 1] ?? [])
      : (matrix[headerIdx] ?? []).map((h) => String(h ?? "").trim());
    const clean = headers.map((h) => h.trim());
    if (clean.filter(Boolean).length < 2) continue;
    tables.push({
      fileId,
      sheet,
      headerRow: headerIdx + 1,
      dataStart: headerIdx + (twoRow ? 3 : 2),
      headers: clean,
      fingerprint: fingerprint(clean),
      titleText: titleParts.join(" · "),
    });
  }
  return tables;
}

export function extractRows(
  wb: XLSX.WorkBook,
  table: DetectedTable,
): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[table.sheet], {
    header: 1,
    defval: null,
    raw: true,
  });
  const rows: Record<string, unknown>[] = [];
  for (let i = table.dataStart - 1; i < matrix.length; i++) {
    const line = matrix[i];
    if (!line || nonempty(line) === 0) continue;
    const obj: Record<string, unknown> = {};
    table.headers.forEach((h, idx) => {
      if (!h) return;
      obj[h] = line[idx] ?? null;
    });
    rows.push(obj);
  }
  return rows;
}

const EXPENSE_HINTS = [
  "merchant",
  "vendor",
  "receipt",
  "uber",
  "meal",
  "expense",
];

export function looksLikeExpenses(
  fileName: string,
  headers: string[],
  rows: Record<string, unknown>[],
): boolean {
  if (/expense/i.test(fileName)) return true;
  const joined = headers.map((h) => h.toLowerCase()).join(" ");
  const hasMoney = /amount|total|cost/.test(joined);
  const hasDate = /date/.test(joined);
  const hasMerchant = EXPENSE_HINTS.some((h) => joined.includes(h));
  const hasProject = /project/.test(joined);
  if (hasMoney && hasDate && hasMerchant && !hasProject) return true;
  const sample = rows
    .slice(0, 5)
    .map((r) => Object.values(r).join(" ").toLowerCase())
    .join(" ");
  if (/uber|starbucks|doordash|lyft/.test(sample) && !hasProject) return true;
  return false;
}
