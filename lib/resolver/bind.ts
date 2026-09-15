import type { ColumnBinding, Confidence } from "@/lib/resolver/types";
import { TABLE_HEADERS, type TableName } from "@/lib/data/schema";

export function normalizeHeader(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/[_./\\]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fingerprint(headers: string[]): string {
  return headers.map(normalizeHeader).filter(Boolean).sort().join("|");
}

/** Jaro-Winkler similarity, 0–1. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const maxDist = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aHits = new Array<boolean>(a.length).fill(false);
  const bHits = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bHits[j] || a[i] !== b[j]) continue;
      aHits[i] = true;
      bHits[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aHits[i]) continue;
    while (!bHits[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro =
    (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] !== b[i]) break;
    prefix++;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

const SYNONYMS: Record<string, string> = {
  "planned finish": "BaselineEnd",
  "planned end": "BaselineEnd",
  "baseline finish": "BaselineEnd",
  "planned start": "BaselineStart",
  "baseline start": "BaselineStart",
  "forecast finish": "ForecastEnd",
  "forecast end": "ForecastEnd",
  "percent complete": "PctComplete",
  "pct complete": "PctComplete",
  complete: "PctComplete",
  "project name": "ProjectName",
  project: "ProjectName",
  "project id": "ProjectID",
  "project no": "ProjectID",
  "client name": "ClientName",
  client: "ClientName",
  "allocation percent": "AllocationPct",
  allocation: "AllocationPct",
  "full name": "FullName",
  name: "FullName",
  role: "Role",
  "cost category": "CostCategory",
  category: "CostCategory",
  amount: "BudgetAmount",
  "budget amount": "BudgetAmount",
  description: "Notes",
  title: "Title",
  type: "Type",
  probability: "Probability",
  impact: "Impact",
  owner: "OwnerID",
  status: "Status",
  "target date": "TargetDate",
  "forecast date": "ForecastDate",
  forecast: "ForecastDate",
  milestone: "MilestoneName",
  "milestone name": "MilestoneName",
  billing: "IsBillingMilestone",
  "billing percent": "BillingPct",
  "contract value": "OriginalContractValue",
  contract: "OriginalContractValue",
  "target margin": "TargetMarginPct",
  merchant: "Vendor",
};

const CANONICAL = new Map<string, { field: string; table: string }>();
for (const [table, cols] of Object.entries(TABLE_HEADERS) as [
  TableName,
  readonly string[],
][]) {
  for (const col of cols) {
    CANONICAL.set(normalizeHeader(col), { field: col, table });
  }
}

export function bindHeader(header: string): ColumnBinding {
  const norm = normalizeHeader(header);
  if (!norm) {
    return {
      sourceHeader: header,
      canonical: null,
      table: null,
      confidence: "low",
      rung: 6,
    };
  }
  const exact = CANONICAL.get(norm);
  if (exact) {
    return {
      sourceHeader: header,
      canonical: exact.field,
      table: exact.table,
      confidence: "high",
      rung: 1,
    };
  }
  const syn = SYNONYMS[norm];
  if (syn) {
    const hit = CANONICAL.get(normalizeHeader(syn));
    return {
      sourceHeader: header,
      canonical: syn,
      table: hit?.table ?? null,
      confidence: "high",
      rung: 2,
    };
  }
  let best: { field: string; table: string; score: number } | null = null;
  for (const [key, val] of CANONICAL) {
    const score = jaroWinkler(norm, key);
    if (!best || score > best.score) best = { ...val, score };
  }
  if (best && best.score >= 0.92) {
    return {
      sourceHeader: header,
      canonical: best.field,
      table: best.table,
      confidence: "medium",
      rung: 3,
    };
  }
  return {
    sourceHeader: header,
    canonical: null,
    table: null,
    confidence: "low",
    rung: 6,
  };
}

export function bindHeaders(headers: string[]): ColumnBinding[] {
  return headers.filter(Boolean).map(bindHeader);
}

export function bindingAccuracy(bindings: ColumnBinding[]): number {
  const decided = bindings.filter((b) => b.canonical);
  if (bindings.length === 0) return 1;
  return decided.length / bindings.length;
}

export type ConfidenceLevel = Confidence;
