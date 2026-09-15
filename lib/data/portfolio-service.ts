import { watch } from "fs";
import path from "path";
import {
  computeAllProjectMetrics,
  computeAllResourceMetrics,
  computePortfolioKPIs,
} from "@/lib/metrics";
import {
  activeMetricsOf,
  computeEbitdaBridge,
  type EbitdaBridge,
  uninvoicedBillingMilestones,
  type UninvoicedMilestone,
  wipSplit,
} from "@/lib/metrics/derived";
import { evaluateFindings } from "@/lib/findings";
import type { Finding } from "@/lib/findings/types";
import type { DataIssue, Dataset, ParseResult } from "@/lib/data/types";
import type { ResolverReport } from "@/lib/resolver/types";
import type { PortfolioKPIs } from "@/lib/metrics/portfolio";
import type { ProjectMetrics } from "@/lib/metrics/project";
import type { ResourceMetrics } from "@/lib/metrics/resource";

export interface PortfolioPayload {
  version: string;
  fetchedAt: string;
  asOfDate: string;
  dataset: Dataset;
  metrics: {
    projects: ProjectMetrics[];
    resources: ResourceMetrics[];
    portfolio: PortfolioKPIs;
  };
  findings: Finding[];
  derived: {
    wipGross: number;
    wipOverbilled: number;
    uninvoicedMilestones: UninvoicedMilestone[];
    ebitda: EbitdaBridge;
  };
  issues: DataIssue[];
  resolver: ResolverReport | null;
}

let cache: { version: string; payload: PortfolioPayload } | null = null;
let watching = false;

export function clearPortfolioCache() {
  cache = null;
}

function ensureWorkbookWatch(filePath: string) {
  if (watching) return;
  watching = true;
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  const base = path.basename(resolved);
  try {
    watch(dir, { persistent: false }, (_event, filename) => {
      if (!filename || filename === base) {
        cache = null;
      }
    });
  } catch {
    watching = false;
  }
}

export function buildPortfolioPayload(result: ParseResult): PortfolioPayload {
  const asOf = result.dataset.settings.AsOfDate;
  const projects = computeAllProjectMetrics(result.dataset, asOf);
  const resources = computeAllResourceMetrics(result.dataset, asOf);
  const portfolio = computePortfolioKPIs(result.dataset, asOf, projects);
  const findings = evaluateFindings(
    result.dataset,
    projects,
    resources,
    asOf,
  );
  const active = activeMetricsOf(result.dataset, projects);
  const wip = wipSplit(active);
  return {
    version: result.version,
    fetchedAt: result.fetchedAt.toISOString(),
    asOfDate: asOf.toISOString(),
    dataset: result.dataset,
    metrics: { projects, resources, portfolio },
    findings,
    derived: {
      wipGross: wip.gross,
      wipOverbilled: wip.overbilled,
      uninvoicedMilestones: uninvoicedBillingMilestones(
        result.dataset,
        projects,
        asOf,
      ),
      ebitda: computeEbitdaBridge(result.dataset, projects, resources),
    },
    issues: result.issues,
    resolver: null,
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
  const filePath = getDataFilePath();
  ensureWorkbookWatch(filePath);
  const local = new LocalFileSource(filePath);
  if (!force) {
    const version = await local.peekVersion();
    if (cache && cache.version === version) {
      return withOverlay(cache.payload);
    }
  }
  const result = await local.fetch();
  const payload = buildPortfolioPayload(result);
  try {
    const { shredMaster } = await import("@/lib/resolver/shred");
    const { resolveInbox } = await import("@/lib/resolver/resolve");
    const { loadRecipes } = await import("@/lib/resolver/recipes");
    const fixtures = shredMaster(result.dataset);
    const catalog = result.dataset.projects.map((p) => ({
      ProjectID: p.ProjectID,
      ProjectName: p.ProjectName,
      ClientID: p.ClientID,
      ClientName: result.dataset.clients.find((c) => c.ClientID === p.ClientID)
        ?.ClientName,
    }));
    payload.resolver = resolveInbox(
      "data/fixtures (generated from master)",
      fixtures.map((f) => ({
        name: f.name,
        buffer: f.buffer,
        modified: result.fetchedAt.toISOString(),
      })),
      catalog,
      await loadRecipes(),
    );
  } catch {
    payload.resolver = null;
  }
  cache = { version: result.version, payload };
  return withOverlay(payload);
}

async function withOverlay(payload: PortfolioPayload): Promise<PortfolioPayload> {
  try {
    const { applyOverlay } = await import("@/lib/overlay/apply");
    const { loadOverlay } = await import("@/lib/overlay/store");
    return {
      ...payload,
      findings: applyOverlay(payload.findings, await loadOverlay(), new Date()),
    };
  } catch {
    return payload;
  }
}
