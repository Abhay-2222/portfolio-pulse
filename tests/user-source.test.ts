import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { TABLE_HEADERS } from "@/lib/data/schema";
import {
  getBookMeta,
  ingestWorkbooks,
  restoreDemoBook,
} from "@/lib/data/user-source";

async function withTempData<T>(fn: () => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pulse-book-"));
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

function projectRow(): unknown[] {
  return [
    "P-1",
    "Pilot",
    "C-1",
    "Delivery",
    "Consulting",
    "E-1",
    null,
    "Active",
    "Execute",
    "P1",
    "Fixed Price",
    8,
    new Date("2026-01-01"),
    new Date("2026-12-01"),
    new Date("2026-12-15"),
    100000,
    0.3,
    0.4,
    new Date("2026-09-01"),
  ];
}

function minimalXlsx(): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [...TABLE_HEADERS.Projects],
      projectRow(),
    ]),
    "Projects",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Setting", "Value"],
      ["AsOfDate", new Date("2026-09-11")],
      ["Currency", "CAD"],
    ]),
    "Settings",
  );
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

describe("user workbook ingest", () => {
  afterEach(() => {
    delete process.env.DATA_FILE_PATH;
  });

  it("rejects non-Excel files", async () => {
    await withTempData(async () => {
      const result = await ingestWorkbooks([
        { name: "notes.pdf", buffer: Buffer.from("%PDF-1.4") },
      ]);
      expect(result.accepted).toHaveLength(0);
      expect(result.rejected[0]?.reason).toMatch(/Excel/);
    });
  });

  it("activates an uploaded workbook with a Projects sheet", async () => {
    await withTempData(async () => {
      const result = await ingestWorkbooks([
        { name: "my-book.xlsx", buffer: minimalXlsx() },
      ]);
      expect(result.rejected).toHaveLength(0);
      expect(result.accepted[0]?.projects).toBe(1);
      const meta = await getBookMeta();
      expect(meta.kind).toBe("upload");
      expect(meta.label).toBe("my-book.xlsx");
      await restoreDemoBook();
      const demo = await getBookMeta();
      expect(demo.kind).toBe("demo");
    });
  });
});
