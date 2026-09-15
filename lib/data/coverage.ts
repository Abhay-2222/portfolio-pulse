import type { Confidence } from "@/lib/resolver/types";

export type CoverageGuess = {
  sourceSheet: string;
  sourceHeader: string;
  canonical: string | null;
  table: string | null;
  confidence: Confidence;
  sample: string;
  fingerprint: string;
};

export type ExtraColumn = {
  sheet: string;
  header: string;
  sample: string;
};

export type LeftoverSheet = {
  sheet: string;
  reason: string;
};

export type OrphanRecord = {
  kind: "invoice";
  label: string;
  amount?: number;
  reason: string;
};

export type EntityCoverage = {
  projectId: string;
  missingLegs: string[];
  extraColumns: { header: string; sample: string }[];
  notes: string[];
};

export type UnavailableView = "risks" | "people" | "money";

export type BookCoverage = {
  mapped: boolean;
  bound: CoverageGuess[];
  missing: { table: string; field: string; reason: string }[];
  extraColumns: ExtraColumn[];
  leftovers: LeftoverSheet[];
  orphans: OrphanRecord[];
  entities: EntityCoverage[];
  unavailableViews: UnavailableView[];
};

export function emptyCoverage(): BookCoverage {
  return {
    mapped: false,
    bound: [],
    missing: [],
    extraColumns: [],
    leftovers: [],
    orphans: [],
    entities: [],
    unavailableViews: [],
  };
}

export function hasBookMore(coverage: BookCoverage | null | undefined): boolean {
  if (!coverage) return false;
  return (
    coverage.unavailableViews.length > 0 ||
    coverage.leftovers.length > 0 ||
    coverage.orphans.length > 0 ||
    coverage.extraColumns.length > 0 ||
    coverage.missing.length > 0
  );
}

export function entityCoverage(
  coverage: BookCoverage | null | undefined,
  projectId: string,
): EntityCoverage | undefined {
  return coverage?.entities.find((e) => e.projectId === projectId);
}

export function hasEntityMore(entity: EntityCoverage | undefined): boolean {
  if (!entity) return false;
  return (
    entity.missingLegs.length > 0 ||
    entity.extraColumns.length > 0 ||
    entity.notes.length > 0
  );
}

export function viewLabel(view: UnavailableView): string {
  if (view === "risks") return "Risks";
  if (view === "people") return "People";
  return "Money";
}
