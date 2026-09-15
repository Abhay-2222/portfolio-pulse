export type Confidence = "high" | "medium" | "low";

export type FileDisposition =
  | "mapped"
  | "unmapped"
  | "rejected"
  | "duplicate"
  | "failed";

export type VersionKind = "snapshot" | "revision" | "copy" | "unknown";

export type FileRecord = {
  fileId: string;
  name: string;
  hash: string;
  modified: string;
  bytes: number;
  version: { kind: VersionKind; label: string };
  disposition: FileDisposition;
  duplicateOf?: string;
  reason?: string;
};

export type DetectedTable = {
  fileId: string;
  sheet: string;
  headerRow: number;
  dataStart: number;
  headers: string[];
  fingerprint: string;
  titleText: string;
};

export type ColumnBinding = {
  sourceHeader: string;
  canonical: string | null;
  table: string | null;
  confidence: Confidence;
  rung: 1 | 2 | 3 | 4 | 6;
};

export type Grouping = {
  id: string;
  fileId: string;
  sourceLabel: string;
  projectId: string | null;
  projectName: string | null;
  confidence: Confidence;
  status: "proposed" | "confirmed" | "dismissed";
  evidence: string;
};

export type ResolverReport = {
  generatedAt: string;
  folder: string;
  files: FileRecord[];
  tables: DetectedTable[];
  bindings: Record<string, ColumnBinding[]>;
  groupings: Grouping[];
  scores: {
    groupingAccuracy: number;
    bindingAccuracy: number;
    confirmationsNeeded: number;
    rejected: number;
    duplicates: number;
  };
};
