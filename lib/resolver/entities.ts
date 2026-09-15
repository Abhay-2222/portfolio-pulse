import { jaroWinkler, normalizeHeader } from "@/lib/resolver/bind";
import type { Confidence, Grouping } from "@/lib/resolver/types";

export type CatalogProject = {
  ProjectID: string;
  ProjectName: string;
  ClientID: string;
  ClientName?: string;
};

function tokens(name: string): string[] {
  return normalizeHeader(name)
    .split(" ")
    .filter(
      (t) =>
        t.length > 2 &&
        !["the", "and", "for", "app", "inc"].includes(t),
    );
}

function overlap(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = tokens(b);
  if (ta.size === 0 || tb.length === 0) return 0;
  const hit = tb.filter((t) => ta.has(t)).length;
  return hit / Math.min(ta.size, tb.length);
}

export function matchProject(
  label: string,
  catalog: CatalogProject[],
): { project: CatalogProject; confidence: Confidence; evidence: string } | null {
  const needle = label.trim();
  if (!needle) return null;
  const exact = catalog.find(
    (p) => normalizeHeader(p.ProjectName) === normalizeHeader(needle),
  );
  if (exact) {
    return {
      project: exact,
      confidence: "high",
      evidence: "exact project name",
    };
  }
  const id = catalog.find((p) => p.ProjectID.toLowerCase() === needle.toLowerCase());
  if (id) {
    return { project: id, confidence: "high", evidence: "project id" };
  }

  let best: { project: CatalogProject; score: number } | null = null;
  for (const p of catalog) {
    const jw = jaroWinkler(normalizeHeader(needle), normalizeHeader(p.ProjectName));
    const ov = overlap(p.ProjectName, needle);
    const score = Math.max(jw, ov);
    if (!best || score > best.score) best = { project: p, score };
  }
  if (best && best.score >= 0.66) {
    const abbreviated =
      tokens(needle).length < tokens(best.project.ProjectName).length &&
      overlap(best.project.ProjectName, needle) >= 0.66;
    if (best.score < 0.88 && !abbreviated) return null;
    return {
      project: best.project,
      confidence: abbreviated || best.score < 0.96 ? "medium" : "high",
      evidence: abbreviated
        ? "abbreviated name"
        : `name similarity ${(best.score * 100).toFixed(0)}%`,
    };
  }
  return null;
}

export function groupingFromLabel(
  id: string,
  fileId: string,
  label: string,
  catalog: CatalogProject[],
  extraEvidence = "",
): Grouping {
  const hit = matchProject(label, catalog);
  return {
    id,
    fileId,
    sourceLabel: label,
    projectId: hit?.project.ProjectID ?? null,
    projectName: hit?.project.ProjectName ?? null,
    confidence: hit?.confidence ?? "low",
    status: hit?.confidence === "high" ? "confirmed" : "proposed",
    evidence: [hit?.evidence, extraEvidence].filter(Boolean).join(" · "),
  };
}
