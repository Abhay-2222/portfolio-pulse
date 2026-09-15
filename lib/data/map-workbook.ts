import * as XLSX from "xlsx";
import { parseWorkbook, type ParseOptions } from "@/lib/data/parse";
import { TABLE_HEADERS, type TableName } from "@/lib/data/schema";
import type { ParseResult } from "@/lib/data/types";
import {
  emptyCoverage,
  type BookCoverage,
  type CoverageGuess,
  type EntityCoverage,
  type ExtraColumn,
  type LeftoverSheet,
  type OrphanRecord,
} from "@/lib/data/coverage";
import {
  bindHeaderForTable,
  normalizeHeader,
} from "@/lib/resolver/bind";
import { coercePercent, sampleCell, slugProjectId } from "@/lib/data/lenient-project";
import { detectTables, extractRows } from "@/lib/resolver/detect";
import type { ColumnBinding, DetectedTable } from "@/lib/resolver/types";
import type { RecipeStore } from "@/lib/resolver/recipes";

const SHEET_ALIASES: Record<string, TableName> = {
  projects: "Projects",
  "project register": "Projects",
  "project list": "Projects",
  resources: "Resources",
  team: "Resources",
  people: "Resources",
  allocations: "Allocations",
  estimates: "Estimates",
  budget: "Budget",
  actuals: "Actuals",
  milestones: "Milestones",
  invoices: "Invoices",
  "ar aging": "Invoices",
  ar: "Invoices",
  raid: "RAID",
  "raid log": "RAID",
  changerequests: "ChangeRequests",
  "change requests": "ChangeRequests",
  snapshots: "Snapshots",
  clients: "Clients",
  settings: "Settings",
};

type Assignment = {
  table: TableName;
  detected: DetectedTable;
  bindings: ColumnBinding[];
};

function applyRecipe(
  table: DetectedTable,
  binding: ColumnBinding,
  recipes?: RecipeStore,
): ColumnBinding {
  const rec = recipes?.bindings?.[table.fingerprint]?.[normalizeHeader(binding.sourceHeader)];
  if (!rec) return binding;
  if (rec.status === "dismissed") {
    return {
      ...binding,
      canonical: null,
      table: null,
      confidence: "low",
      rung: 6,
    };
  }
  return {
    ...binding,
    canonical: rec.canonical,
    table: rec.table,
    confidence: "high",
    rung: 4,
  };
}

function scoreTable(detected: DetectedTable, table: TableName, recipes?: RecipeStore): number {
  let hits = 0;
  for (const header of detected.headers) {
    if (!header) continue;
    const binding = applyRecipe(detected, bindHeaderForTable(header, table), recipes);
    if (binding.canonical) hits += 1;
  }
  return hits;
}

function assignTables(
  detected: DetectedTable[],
  recipes?: RecipeStore,
): { assignments: Assignment[]; leftovers: LeftoverSheet[] } {
  const used = new Set<TableName>();
  const assignments: Assignment[] = [];
  const leftovers: LeftoverSheet[] = [];

  const ranked = detected
    .map((table) => {
      const alias = SHEET_ALIASES[normalizeHeader(table.sheet)];
      const scores = (Object.keys(TABLE_HEADERS) as TableName[]).map((name) => ({
        name,
        score: scoreTable(table, name, recipes) + (alias === name ? 8 : 0),
      }));
      scores.sort((a, b) => b.score - a.score);
      const best = scores[0];
      return { table, best };
    })
    .sort((a, b) => (b.best?.score ?? 0) - (a.best?.score ?? 0));

  for (const { table, best } of ranked) {
    if (!best || best.score < 2 || used.has(best.name)) {
      leftovers.push({
        sheet: table.sheet,
        reason: "In the file, not in Pulse",
      });
      continue;
    }
    const bindings = table.headers.filter(Boolean).map((header) =>
      applyRecipe(table, bindHeaderForTable(header, best.name), recipes),
    );
    const boundCount = bindings.filter((b) => b.canonical).length;
    if (boundCount < 2) {
      leftovers.push({
        sheet: table.sheet,
        reason: "In the file, not in Pulse",
      });
      continue;
    }
    used.add(best.name);
    assignments.push({ table: best.name, detected: table, bindings });
  }

  return { assignments, leftovers };
}

function coerceForField(field: string, value: unknown): unknown {
  if (field === "PctComplete" || field === "TargetMarginPct" || field === "AllocationPct") {
    const n = coercePercent(value);
    return n == null ? value : n;
  }
  return value;
}

function looksLikeRaidNote(text: string): boolean {
  return /uat|clash|watch|risk|raid|issue/i.test(text);
}

export function mapWorkbookToCanonical(
  buffer: ArrayBuffer | Buffer,
  meta?: ParseOptions & { recipes?: RecipeStore },
): { parse: ParseResult; coverage: BookCoverage } {
  const fileId = meta?.fileId ?? "workbook";
  const wb = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellNF: false,
    cellText: false,
    cellStyles: true,
  });
  const detected = detectTables(fileId, wb);
  const { assignments, leftovers } = assignTables(detected, meta?.recipes);

  const bound: CoverageGuess[] = [];
  const extraColumns: ExtraColumn[] = [];
  const missing: BookCoverage["missing"] = [];
  const orphans: OrphanRecord[] = [];
  const entityExtras = new Map<string, EntityCoverage>();

  const remapped = XLSX.utils.book_new();
  const assignedSheets = new Set(assignments.map((a) => a.detected.sheet));

  for (const sheet of wb.SheetNames) {
    if (sheet.startsWith("_")) continue;
    if (!assignedSheets.has(sheet) && !leftovers.some((l) => l.sheet === sheet)) {
      leftovers.push({
        sheet,
        reason: "In the file, not in Pulse",
      });
    }
  }

  let nameToId = new Map<string, string>();

  const projectAssignment = assignments.find((a) => a.table === "Projects");
  if (projectAssignment) {
    const rows = extractRows(wb, projectAssignment.detected);
    for (const row of rows) {
      const nameHeader = projectAssignment.bindings.find(
        (b) => b.canonical === "ProjectName",
      )?.sourceHeader;
      const idHeader = projectAssignment.bindings.find(
        (b) => b.canonical === "ProjectID",
      )?.sourceHeader;
      const name = String((nameHeader ? row[nameHeader] : "") ?? "").trim();
      const idRaw = String((idHeader ? row[idHeader] : "") ?? "").trim();
      if (!name) continue;
      const id = idRaw || slugProjectId(name);
      nameToId.set(normalizeHeader(name), id);
    }
  }

  for (const assignment of assignments) {
    const expected = TABLE_HEADERS[assignment.table] as readonly string[];
    const rows = extractRows(wb, assignment.detected);
    const boundByCanonical = new Map<string, ColumnBinding>();
    for (const binding of assignment.bindings) {
      const sampleRow = rows[0] ?? {};
      const sample = sampleCell(sampleRow[binding.sourceHeader]);
      bound.push({
        sourceSheet: assignment.detected.sheet,
        sourceHeader: binding.sourceHeader,
        canonical: binding.canonical,
        table: binding.canonical ? assignment.table : null,
        confidence: binding.confidence,
        sample,
        fingerprint: assignment.detected.fingerprint,
      });
      if (binding.canonical && !boundByCanonical.has(binding.canonical)) {
        boundByCanonical.set(binding.canonical, binding);
      }
      if (!binding.canonical) {
        extraColumns.push({
          sheet: assignment.detected.sheet,
          header: binding.sourceHeader,
          sample,
        });
      }
    }

    for (const field of expected) {
      if (!boundByCanonical.has(field)) {
        missing.push({
          table: assignment.table,
          field,
          reason: `No column mapped to ${assignment.table}.${field}`,
        });
      }
    }

    const aoa: unknown[][] = [[...expected]];
    rows.forEach((row, rowIdx) => {
      if (assignment.table === "Invoices") {
        const projectBind = boundByCanonical.get("ProjectID");
        const nameBind = assignment.bindings.find(
          (b) =>
            normalizeHeader(b.sourceHeader).includes("project") &&
            b.canonical !== "ProjectID",
        );
        let projectId = projectBind
          ? String(row[projectBind.sourceHeader] ?? "").trim()
          : "";
        if (!projectId && nameBind) {
          const pname = String(row[nameBind.sourceHeader] ?? "").trim();
          projectId = nameToId.get(normalizeHeader(pname)) ?? "";
        }
        if (!projectId) {
          const amountBind = boundByCanonical.get("Amount");
          const descBind = boundByCanonical.get("Description");
          orphans.push({
            kind: "invoice",
            label: sampleCell(descBind ? row[descBind.sourceHeader] : `row ${rowIdx + 1}`),
            amount: Number(amountBind ? row[amountBind.sourceHeader] : 0) || undefined,
            reason: "Invoice with no project, not attached to a brief",
          });
          return;
        }
        if (projectBind) row[projectBind.sourceHeader] = projectId;
      }

      const line = expected.map((field) => {
        const binding = boundByCanonical.get(field);
        if (!binding) return null;
        return coerceForField(field, row[binding.sourceHeader] ?? null);
      });

      if (assignment.table === "Projects") {
        const idIdx = expected.indexOf("ProjectID");
        const nameIdx = expected.indexOf("ProjectName");
        const name = String(line[nameIdx] ?? "").trim();
        if (!name) return;
        if (!String(line[idIdx] ?? "").trim()) {
          line[idIdx] = slugProjectId(name);
        }
        const projectId = String(line[idIdx]);
        const extras: EntityCoverage["extraColumns"] = [];
        const notes: string[] = [];
        for (const binding of assignment.bindings) {
          if (binding.canonical) continue;
          const value = row[binding.sourceHeader];
          if (value == null || value === "") continue;
          extras.push({
            header: binding.sourceHeader,
            sample: sampleCell(value),
          });
          const headerNorm = normalizeHeader(binding.sourceHeader);
          if (headerNorm === "notes" || headerNorm === "note") {
            notes.push(
              looksLikeRaidNote(String(value))
                ? "RAID as a note, not a RAID finding"
                : "Note is not a Pulse field",
            );
          }
          if (headerNorm === "rag" || headerNorm.includes("rag colour") || headerNorm === "rag color") {
            notes.push("RAG colour is leftover, not a metric");
          }
        }
        entityExtras.set(projectId, {
          projectId,
          missingLegs: [],
          extraColumns: extras,
          notes,
        });
      }

      aoa.push(line);
    });

    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(remapped, sheet, assignment.table);
  }

  const remappedBuffer = Buffer.from(
    XLSX.write(remapped, { type: "buffer", bookType: "xlsx" }),
  );
  const parse = parseWorkbook(remappedBuffer, meta?.fileId ?? "mapped", new Date(), {
    fileId,
    fileModified: meta?.fileModified,
    lenientProjects: true,
  });

  const clientsByName = new Map(
    parse.dataset.clients.map((c) => [normalizeHeader(c.ClientName), c.ClientID]),
  );
  const extraClientCol = extraColumns.find((c) =>
    /client/.test(normalizeHeader(c.header)),
  );
  if (projectAssignment && extraClientCol) {
    const nameHeader = projectAssignment.bindings.find(
      (b) => b.canonical === "ProjectName",
    )?.sourceHeader;
    const idHeader = projectAssignment.bindings.find(
      (b) => b.canonical === "ProjectID",
    )?.sourceHeader;
    const clientHeader = extraClientCol.header;
    const rows = extractRows(wb, projectAssignment.detected);
    for (const row of rows) {
      const name = String((nameHeader ? row[nameHeader] : "") ?? "").trim();
      if (!name) continue;
      const id =
        String((idHeader ? row[idHeader] : "") ?? "").trim() || slugProjectId(name);
      const project = parse.dataset.projects.find((p) => p.ProjectID === id);
      if (!project || project.ClientID) continue;
      const clientName = String(row[clientHeader] ?? "").trim();
      if (!clientName) continue;
      const existing = clientsByName.get(normalizeHeader(clientName));
      if (existing) {
        project.ClientID = existing;
        project.absent = (project.absent ?? []).filter((f) => f !== "ClientID");
      } else {
        const cid = `name:${normalizeHeader(clientName).replace(/\s+/g, "-")}`;
        parse.dataset.clients.push({
          ClientID: cid,
          ClientName: clientName,
          Industry: "",
          Region: "",
          Tier: "",
          AccountOwner: "",
          PaymentTermsDays: 0,
        });
        clientsByName.set(normalizeHeader(clientName), cid);
        project.ClientID = cid;
        project.absent = (project.absent ?? []).filter((f) => f !== "ClientID");
      }
    }
  }

  const coverage: BookCoverage = {
    ...emptyCoverage(),
    mapped: true,
    bound,
    missing,
    extraColumns,
    leftovers,
    orphans,
    entities: [...entityExtras.values()],
    unavailableViews: [],
  };
  parse.coverage = coverage;
  return { parse, coverage };
}

export function finalizeCoverage(
  parse: ParseResult,
  coverage: BookCoverage | undefined,
  metrics: { ProjectID: string; costReady: boolean; scheduleReady: boolean; marginReady: boolean }[],
): BookCoverage {
  const next: BookCoverage = coverage ? { ...coverage, entities: coverage.entities.map((e) => ({ ...e })) } : emptyCoverage();
  const byId = new Map(next.entities.map((e) => [e.projectId, e]));
  const raidIds = new Set(parse.dataset.raid.map((r) => r.ProjectID));
  for (const project of parse.dataset.projects) {
    let entity = byId.get(project.ProjectID);
    if (!entity) {
      entity = {
        projectId: project.ProjectID,
        missingLegs: [],
        extraColumns: [],
        notes: [],
      };
      next.entities.push(entity);
      byId.set(project.ProjectID, entity);
    }
    const m = metrics.find((row) => row.ProjectID === project.ProjectID);
    const legs: string[] = [];
    if (m && !m.costReady) legs.push("cost");
    if (m && !m.scheduleReady) legs.push("schedule");
    if (m && !m.marginReady) legs.push("margin");
    if (!raidIds.has(project.ProjectID)) legs.push("RAID");
    entity.missingLegs = legs;
  }

  const views: BookCoverage["unavailableViews"] = [];
  if (parse.dataset.raid.length === 0) views.push("risks");
  if (parse.dataset.resources.length === 0) views.push("people");
  if (parse.dataset.invoices.length === 0) views.push("money");
  next.unavailableViews = views;
  return next;
}
