import { createHash } from "crypto";
import * as XLSX from "xlsx";
import { bindHeaders, bindingAccuracy } from "@/lib/resolver/bind";
import {
  detectTables,
  extractRows,
  looksLikeExpenses,
} from "@/lib/resolver/detect";
import {
  groupingFromLabel,
  type CatalogProject,
} from "@/lib/resolver/entities";
import { normalizeHeader } from "@/lib/resolver/bind";
import type { RecipeStore } from "@/lib/resolver/recipes";
import type {
  ColumnBinding,
  FileRecord,
  Grouping,
  ResolverReport,
} from "@/lib/resolver/types";
import { guessVersion } from "@/lib/resolver/version";

export type InboxFile = {
  name: string;
  buffer: Buffer;
  modified: string;
};

function hashBuf(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function readBook(name: string, buffer: Buffer): XLSX.WorkBook {
  return XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    raw: name.toLowerCase().endsWith(".csv") ? true : false,
  });
}

function applyRecipes(groupings: Grouping[], recipes: RecipeStore): Grouping[] {
  return groupings.map((g) => {
    const rec = recipes.groupings[g.id];
    if (!rec) return g;
    return {
      ...g,
      projectId: rec.projectId,
      status: rec.status,
      confidence: rec.status === "confirmed" ? "high" : g.confidence,
      evidence:
        rec.status === "confirmed"
          ? `${g.evidence} · confirmed`
          : g.evidence,
    };
  });
}

export function resolveInbox(
  folder: string,
  files: InboxFile[],
  catalog: CatalogProject[],
  recipes: RecipeStore = { groupings: {}, bindings: {} },
): ResolverReport {
  const records: FileRecord[] = [];
  const tables = [];
  const bindings: Record<string, ColumnBinding[]> = {};
  const groupings: Grouping[] = [];
  const hashToName = new Map<string, string>();

  const sorted = [...files].sort((a, b) => {
    const ac = guessVersion(a.name).kind === "copy" ? 1 : 0;
    const bc = guessVersion(b.name).kind === "copy" ? 1 : 0;
    if (ac !== bc) return ac - bc;
    return a.name.localeCompare(b.name);
  });
  for (const file of sorted) {
    const fileId = file.name;
    const hash = hashBuf(file.buffer);
    const version = guessVersion(file.name);
    const base: FileRecord = {
      fileId,
      name: file.name,
      hash,
      modified: file.modified,
      bytes: file.buffer.length,
      version,
      disposition: "unmapped",
    };

    const prior = hashToName.get(hash);
    if (prior) {
      records.push({
        ...base,
        disposition: "duplicate",
        duplicateOf: prior,
        reason: `Byte-identical to ${prior}`,
      });
      continue;
    }
    hashToName.set(hash, file.name);

    let wb: XLSX.WorkBook;
    try {
      wb = readBook(file.name, file.buffer);
    } catch (e) {
      records.push({
        ...base,
        disposition: "failed",
        reason: e instanceof Error ? e.message : "unreadable",
      });
      continue;
    }

    const found = detectTables(fileId, wb);
    if (found.length === 0) {
      records.push({
        ...base,
        disposition: "rejected",
        reason: "No tabular data",
      });
      continue;
    }

    const sampleRows = found.flatMap((t) => extractRows(wb, t).slice(0, 8));
    const allHeaders = found.flatMap((t) => t.headers);
    if (looksLikeExpenses(file.name, allHeaders, sampleRows)) {
      records.push({
        ...base,
        disposition: "rejected",
        reason: "Looks like an expense claim, not a portfolio file",
      });
      continue;
    }

    tables.push(...found);
    const fileBinds: ColumnBinding[] = [];
    for (const table of found) {
      const bound = bindHeaders(table.headers);
      fileBinds.push(...bound);
      const rows = extractRows(wb, table);
      const nameHeader = table.headers.find((_, i) => {
        const b = bound[i];
        return b?.canonical === "ProjectName" || b?.canonical === "ProjectID";
      });
      const labels: Array<{ label: string; fromTitle: boolean }> = [];
      for (const part of table.titleText.split(/\s*[·—\-|]\s*/)) {
        const t = part.trim();
        if (t.length >= 8) labels.push({ label: t, fromTitle: true });
      }
      if (nameHeader) {
        for (const row of rows) {
          const v = row[nameHeader];
          if (v) labels.push({ label: String(v).trim(), fromTitle: false });
        }
      }
      for (const { label, fromTitle } of labels) {
        if (label.length < 4) continue;
        const id = `${fileId}:${normalizeHeader(label)}`;
        const g = groupingFromLabel(id, fileId, label, catalog, `${table.sheet}`);
        if (!g.projectId) continue;
        if (fromTitle && g.confidence === "high") {
          g.status = "proposed";
          g.evidence = `${g.evidence} · title only, confirm grouping`;
        }
        groupings.push(g);
      }
    }
    bindings[fileId] = fileBinds;
    records.push({ ...base, disposition: "mapped" });
  }

  const applied = applyRecipes(groupings, recipes);
  const uniqueGroup = new Map<string, Grouping>();
  for (const g of applied) uniqueGroup.set(g.id, g);
  const groupingList = [...uniqueGroup.values()];

  const boundCols = Object.values(bindings).flat();
  const confirmationsNeeded = groupingList.filter(
    (g) => g.status === "proposed" && g.projectId,
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    folder,
    files: records,
    tables,
    bindings,
    groupings: groupingList,
    scores: {
      groupingAccuracy: 0,
      bindingAccuracy: bindingAccuracy(boundCols),
      confirmationsNeeded,
      rejected: records.filter((f) => f.disposition === "rejected").length,
      duplicates: records.filter((f) => f.disposition === "duplicate").length,
    },
  };
}

export function scoreGroupings(
  groupings: Grouping[],
  expected: Record<string, string[]>,
): number {
  let ok = 0;
  let n = 0;
  for (const [fileId, ids] of Object.entries(expected)) {
    const got = new Set(
      groupings
        .filter((g) => g.fileId === fileId && g.projectId)
        .map((g) => g.projectId!),
    );
    n += ids.length;
    for (const id of ids) if (got.has(id)) ok++;
  }
  return n === 0 ? 1 : ok / n;
}
