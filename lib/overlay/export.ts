import type { Finding } from "@/lib/findings/types";
import { provenanceFootnotes } from "@/lib/ledger/cells";
import { formatAsOf } from "@/lib/format";

function overlayLine(f: Finding): string {
  const bits = [
    f.disposition && f.disposition !== "open" ? f.disposition : null,
    f.owner ? `owner ${f.owner.label}` : null,
    f.snoozeUntil ? `parked until ${f.snoozeUntil.slice(0, 10)}` : null,
    f.snoozeBroke ? `returned (${f.snoozeBroke})` : null,
    f.note ? `note: ${f.note}` : null,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "";
}

export function exportFindingMarkdown(f: Finding): string {
  return [
    f.headline,
    f.sentence,
    overlayLine(f),
    provenanceFootnotes([f]),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function exportQueueMarkdown(
  findings: Finding[],
  asOf: string,
): string {
  const lines = [
    `# Pulse queue`,
    `As of ${formatAsOf(asOf)}. Overlay only — source files were not changed.`,
    ...findings.map((f) => {
      const extra = overlayLine(f);
      return `- ${f.headline}${extra ? ` (${extra})` : ""}`;
    }),
    provenanceFootnotes(findings),
  ];
  return lines.filter(Boolean).join("\n\n");
}
