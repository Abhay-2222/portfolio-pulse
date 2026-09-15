import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  COLOUR_NAME,
  EXTRA_RICH_ID,
  generateCousinWorkbook,
  SKINNY_NAME,
} from "@/lib/data/cousin-fixture";
import { mapWorkbookToCanonical } from "@/lib/data/map-workbook";
import { computeAllProjectMetrics, computePortfolioKPIs } from "@/lib/metrics";
import { evaluateFindings } from "@/lib/findings";
import {
  copyDemoIntoLibrary,
  getBookMeta,
  ingestWorkbooks,
  restoreDemoBook,
} from "@/lib/data/user-source";
import { parseWorkbook } from "@/lib/data/parse";

const MASTER = path.join(
  process.cwd(),
  "data",
  "Enterprise_Portfolio_Data.xlsx",
);

async function withTempData<T>(fn: () => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pulse-cousin-"));
  const prev = process.env.PULSE_USER_DATA_DIR;
  const prevPath = process.env.DATA_FILE_PATH;
  process.env.PULSE_USER_DATA_DIR = dir;
  delete process.env.DATA_FILE_PATH;
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.PULSE_USER_DATA_DIR;
    else process.env.PULSE_USER_DATA_DIR = prev;
    if (prevPath === undefined) delete process.env.DATA_FILE_PATH;
    else process.env.DATA_FILE_PATH = prevPath;
    await rm(dir, { recursive: true, force: true });
  }
}

describe("cousin workbook ingest", () => {
  afterEach(() => {
    delete process.env.DATA_FILE_PATH;
  });

  it("maps a cousin file, keeps Loyalty, and degrades uneven rows", async () => {
    const master = await readFile(MASTER);
    const exact = parseWorkbook(master, "master");
    const loyaltyExact = computeAllProjectMetrics(exact.dataset).find(
      (m) => m.ProjectID === "P-1017",
    )!;

    const cousin = generateCousinWorkbook(master);
    const mapped = mapWorkbookToCanonical(cousin, { fileId: "cousin-portfolio.xlsx" });
    expect(mapped.parse.dataset.projects.length).toBeGreaterThan(0);

    const projects = computeAllProjectMetrics(mapped.parse.dataset);
    const loyalty = projects.find((m) => m.ProjectID === "P-1017");
    expect(loyalty).toBeTruthy();
    expect(loyalty!.HealthScore).toBe(loyaltyExact.HealthScore);
    expect(loyalty!.ForecastMarginPct).toBeCloseTo(
      loyaltyExact.ForecastMarginPct,
      4,
    );

    const skinny = mapped.parse.dataset.projects.find(
      (p) => p.ProjectName === SKINNY_NAME,
    );
    expect(skinny).toBeTruthy();
    const skinnyM = projects.find((m) => m.ProjectID === skinny!.ProjectID)!;
    expect(skinnyM.HealthScore).toBeNull();
    expect(skinnyM.costReady).toBe(false);
    expect(skinnyM.scheduleReady).toBe(false);
    expect(skinnyM.marginReady).toBe(false);
    expect(skinnyM.OverallRAG).toBe("N/A");

    const colour = mapped.parse.dataset.projects.find(
      (p) => p.ProjectName === COLOUR_NAME,
    );
    expect(colour).toBeTruthy();
    const colourM = projects.find((m) => m.ProjectID === colour!.ProjectID)!;
    expect(colourM.HealthScore).toBeNull();
    expect(colourM.OverallRAG).toBe("N/A");

    const kpis = computePortfolioKPIs(mapped.parse.dataset, undefined, projects);
    const exactKpis = computePortfolioKPIs(exact.dataset);
    expect(kpis.offTrack).toBe(exactKpis.offTrack);
    expect(colourM.OverallRAG).not.toBe("Red");

    const rich = mapped.coverage.entities.find((e) => e.projectId === EXTRA_RICH_ID);
    expect(rich?.extraColumns.some((c) => c.header === "Velocity")).toBe(true);

    expect(
      mapped.coverage.bound.some(
        (b) =>
          b.sourceHeader === "Planned Finish" && b.canonical === "BaselineEnd",
      ),
    ).toBe(true);
    expect(mapped.coverage.leftovers.some((l) => /PTO/i.test(l.sheet))).toBe(
      true,
    );
    expect(mapped.coverage.orphans.length).toBeGreaterThan(0);
    expect(mapped.parse.dataset.raid.length).toBe(0);

    const findings = evaluateFindings(
      mapped.parse.dataset,
      projects,
      [],
      mapped.parse.dataset.settings.AsOfDate,
    );
    expect(
      findings.some(
        (f) =>
          f.subject.id === skinny!.ProjectID &&
          f.ruleId === "money.margin_below_floor",
      ),
    ).toBe(false);
  });

  it("ingests the cousin file as the active book", async () => {
    await withTempData(async () => {
      const master = await readFile(MASTER);
      const cousin = generateCousinWorkbook(master);
      const result = await ingestWorkbooks([
        { name: "cousin-portfolio.xlsx", buffer: cousin },
      ]);
      expect(result.rejected).toHaveLength(0);
      expect(result.accepted[0]?.originalName).toBe("cousin-portfolio.xlsx");
      const meta = await getBookMeta();
      expect(meta.label).toBe("cousin-portfolio.xlsx");
    });
  });

  it("copies the demo into My books with empty More", async () => {
    await withTempData(async () => {
      const book = await copyDemoIntoLibrary("My book.xlsx");
      expect(book.originalName).toBe("My book.xlsx");
      expect(book.projects).toBeGreaterThan(0);
      const meta = await getBookMeta();
      expect(meta.kind).toBe("upload");
      await restoreDemoBook();
    });
  });
});
