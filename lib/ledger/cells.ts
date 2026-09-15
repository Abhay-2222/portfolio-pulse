import * as XLSX from "xlsx";
import type { Dataset, SourceIndex } from "@/lib/data/types";
import type { CellRef } from "@/lib/findings/types";
import type { Finding } from "@/lib/findings/types";

const SENSITIVE_COLUMNS = new Set([
  "CostRateHr",
  "BillRateHr",
  "BlendedCostRate",
]);

export function emptySource(fileId = "workbook", fileModified = ""): SourceIndex {
  return { fileId, fileModified, sheets: {} };
}

export function a1(colIndex: number, row: number): string {
  return `${XLSX.utils.encode_col(colIndex)}${row}`;
}

export function quoteSheet(sheet: string): string {
  return /[^A-Za-z0-9_]/.test(sheet) ? `'${sheet.replaceAll("'", "''")}'` : sheet;
}

export function cellAddress(sheet: string, colIndex: number, row: number): string {
  return `${quoteSheet(sheet)}!${a1(colIndex, row)}`;
}

export function cellRef(
  dataset: Dataset,
  sheet: string,
  entityId: string,
  column: string,
): CellRef {
  const src = dataset.source;
  const table = src.sheets[sheet];
  const colIndex = table?.columns[column];
  const row = table?.rows[entityId];
  const known = colIndex != null && row != null;
  return {
    fileId: src.fileId,
    sheet,
    column,
    cell: known ? cellAddress(sheet, colIndex, row) : `${quoteSheet(sheet)}!${column}`,
    fileModified: src.fileModified || undefined,
    sensitive: SENSITIVE_COLUMNS.has(column) || undefined,
  };
}

export function cells(
  dataset: Dataset,
  entries: Array<[sheet: string, entityId: string, column: string]>,
): CellRef[] {
  const seen = new Set<string>();
  const out: CellRef[] = [];
  for (const [sheet, id, column] of entries) {
    const ref = cellRef(dataset, sheet, id, column);
    const key = `${ref.cell}:${ref.column}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

export function formatCellRef(ref: CellRef): string {
  const rate = ref.sensitive ? " · rate hidden" : "";
  return `${ref.cell} (${ref.column})${rate}`;
}

export function provenanceFootnotes(findings: Finding[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const f of findings) {
    for (const ref of f.provenance) {
      const line = formatCellRef(ref);
      if (seen.has(line)) continue;
      seen.add(line);
      lines.push(`- ${line}`);
    }
  }
  if (lines.length === 0) return "";
  return `Sources\n${lines.join("\n")}`;
}
