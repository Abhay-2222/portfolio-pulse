export type FindingDomain =
  | "delivery"
  | "money"
  | "people"
  | "risk"
  | "decision"
  | "data";

export type FindingKind =
  | "exception"
  | "trend"
  | "collision"
  | "coverage"
  | "opportunity";

export type BriefSection =
  | "escalation"
  | "verdict"
  | "pressure"
  | "resources"
  | "money"
  | "footer";

export type EntityType =
  | "project"
  | "person"
  | "client"
  | "invoice"
  | "milestone"
  | "raid"
  | "cr";

export type EntityRef = {
  type: EntityType;
  id: string;
  label: string;
};

export type CellRef = {
  fileId: string;
  sheet: string;
  column: string;
  /** A1 address including sheet, e.g. `Projects!R18`. */
  cell: string;
  fileModified?: string;
  sensitive?: boolean;
};

export type Finding = {
  id: string;
  ruleId: string;
  subject: EntityRef;
  related: EntityRef[];
  domain: FindingDomain;
  kind: FindingKind;
  amount?: number;
  deadline?: string;
  daysUntil?: number;
  delta?: number;
  severity: 1 | 2 | 3 | 4 | 5;
  treatment: 1 | 2 | 3 | 4;
  headline: string;
  sentence: string;
  /** Short scope + kind, e.g. "This invoice · overdue AR". */
  kicker?: string;
  /** What this costs if ignored. */
  consequence?: string;
  /** Named next action. */
  move?: string;
  /** Person who does the move. */
  actor?: EntityRef;
  section: BriefSection;
  href: string;
  provenance: CellRef[];
  asOf: string;
  staleness: number;
  confidence: "high" | "medium" | "low";
  disposition?: "open" | "owned" | "snoozed" | "actioned" | "dismissed";
  owner?: EntityRef;
  snoozeUntil?: string;
  note?: string;
  snoozeBroke?: "date" | "worsened" | "source";
};

export type HealthContributor = {
  label: string;
  deduction: number;
  detail: string;
  provenance: CellRef[];
};
