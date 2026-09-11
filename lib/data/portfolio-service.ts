import { computeAllProjectMetrics, computePortfolioKPIs } from "@/lib/metrics";
import type { Dataset, DataIssue, ParseResult } from "@/lib/data/types";
import type { PortfolioKPIs } from "@/lib/metrics/portfolio";
import type { ProjectMetrics } from "@/lib/metrics/project";

export interface PortfolioPayload {
  version: string;
  fetchedAt: string;
  asOfDate: string;
  dataset: Dataset;
  metrics: {
    projects: ProjectMetrics[];
    portfolio: PortfolioKPIs;
  };
  issues: DataIssue[];
}

let cache: { version: string; payload: PortfolioPayload } | null = null;

export function buildPortfolioPayload(result: ParseResult): PortfolioPayload {
  const asOf = result.dataset.settings.AsOfDate;
  const projects = computeAllProjectMetrics(result.dataset, asOf);
  const portfolio = computePortfolioKPIs(result.dataset, asOf, projects);
  return {
    version: result.version,
    fetchedAt: result.fetchedAt.toISOString(),
    asOfDate: asOf.toISOString(),
    dataset: result.dataset,
    metrics: { projects, portfolio },
    issues: result.issues,
  };
}

export async function loadPortfolio(force = false): Promise<PortfolioPayload> {
  const source = (process.env.DATA_SOURCE ?? "local").toLowerCase();
  if (source !== "local") {
    throw new Error(
      `DATA_SOURCE=${source} is not implemented in phase 1. Use local.`,
    );
  }
  const { LocalFileSource, getDataFilePath } = await import(
    "@/lib/data/sources/local"
  );
  const local = new LocalFileSource(getDataFilePath());
  const result = await local.fetch(force);
  if (!force && cache && cache.version === result.version) {
    return cache.payload;
  }
  const payload = buildPortfolioPayload(result);
  cache = { version: result.version, payload };
  return payload;
}
