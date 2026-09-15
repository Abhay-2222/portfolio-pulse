import type { CellRef } from "@/lib/findings/types";

export function provenanceFingerprint(refs: CellRef[]): string {
  return [...refs]
    .map((r) => `${r.cell}|${r.column}`)
    .sort()
    .join(";");
}

/** Magnitude worsened by 20% — more dollars (or more-negative margin) at stake. */
export function magnitudeWorsened(
  current: number | undefined,
  snoozed: number | undefined,
): boolean {
  if (current == null || snoozed == null) return false;
  if (snoozed === 0) return Math.abs(current) > 0;
  return Math.abs(current) >= Math.abs(snoozed) * 1.2;
}
