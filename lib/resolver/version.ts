import type { VersionKind } from "@/lib/resolver/types";

const MONTHS =
  "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";

export function guessVersion(fileName: string): {
  kind: VersionKind;
  label: string;
} {
  const n = fileName.toLowerCase().replace(/_/g, " ");
  if (/\(\d+\)/.test(n) || n.includes("copy of ")) {
    return { kind: "copy", label: "filename copy" };
  }
  const month = n.match(new RegExp(`\\b(${MONTHS})\\b`, "i"));
  if (month) {
    return { kind: "snapshot", label: month[1]!.toLowerCase() };
  }
  const ym = n.match(/(20\d{2}[-_]?(0[1-9]|1[0-2]))/);
  if (ym) return { kind: "snapshot", label: ym[1]! };
  const ver = n.match(/\bv(\d+)\b/i);
  if (ver) return { kind: "revision", label: `v${ver[1]}` };
  if (/final|approved/i.test(n)) return { kind: "revision", label: "final" };
  return { kind: "unknown", label: "" };
}
