import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";

export const SKINNY_NAME = "Harbourfront Website";
export const COLOUR_NAME = "Beacon Audit";
export const EXTRA_RICH_ID = "P-1015";
export const RAID_NOTE_ID = "P-1002";
export const ORPHAN_INVOICE = "INV-ORPHAN";

const HEADER_ALIASES: Record<string, Record<string, string>> = {
  Projects: {
    ProjectName: "Project Name",
    PctComplete: "% Complete",
    BaselineEnd: "Planned Finish",
    OriginalContractValue: "Contract Value",
    ProjectID: "Project ID",
    BaselineStart: "Planned Start",
    ForecastEnd: "Forecast Finish",
  },
  Resources: {
    FullName: "Full Name",
    EmployeeID: "Employee ID",
  },
  Invoices: {
    InvoiceDate: "Invoice Date",
    PaidDate: "Paid Date",
  },
};

function sheetMatrix(wb: XLSX.WorkBook, name: string): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
    header: 1,
    defval: null,
    raw: true,
  });
}

function renameHeaders(headers: unknown[], aliases: Record<string, string>): string[] {
  return headers.map((h) => {
    const key = String(h ?? "");
    return aliases[key] ?? key;
  });
}

function colIndex(headers: unknown[], name: string): number {
  return headers.findIndex((h) => String(h) === name);
}

export function generateCousinWorkbook(master: Buffer): Buffer {
  const src = XLSX.read(master, { type: "buffer", cellDates: true });
  const out = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    out,
    XLSX.utils.aoa_to_sheet([
      ["Portfolio Pulse cousin fixture"],
      ["Cover — not a data table"],
    ]),
    "Cover",
  );

  const projects = sheetMatrix(src, "Projects");
  const pHeaders = projects[0] ?? [];
  const aliases = HEADER_ALIASES.Projects;
  const newHeaders = [
    ...renameHeaders(pHeaders, aliases),
    "JiraKey",
    "Velocity",
    "Notes",
    "RAG",
  ];
  const idIdx = colIndex(pHeaders, "ProjectID");

  const body = projects.slice(1).map((row) => {
    const id = String(row[idIdx] ?? "");
    const copied = pHeaders.map((h, idx) => {
      const value = row[idx];
      if (String(h) === "PctComplete" && typeof value === "number") {
        return `${Math.round(value * 100)}%`;
      }
      return value;
    });
    const jira = id === EXTRA_RICH_ID ? "POL-221" : "";
    const velocity = id === EXTRA_RICH_ID ? 34 : "";
    const notes = id === RAID_NOTE_ID ? "UAT clash — watch UAT" : "";
    const rag = "";
    return [...copied, jira, velocity, notes, rag];
  });

  const skinny = new Array(newHeaders.length).fill(null);
  skinny[newHeaders.indexOf("Project Name")] = SKINNY_NAME;
  skinny[newHeaders.indexOf("Status")] = "Active";
  const clients = sheetMatrix(src, "Clients");
  const cNameIdx = colIndex(clients[0] ?? [], "ClientName");
  const clientName = String(clients[1]?.[cNameIdx] ?? "Northwind");
  const colour = new Array(newHeaders.length).fill(null);
  colour[newHeaders.indexOf("Project Name")] = COLOUR_NAME;
  colour[newHeaders.indexOf("Status")] = "Active";
  colour[newHeaders.indexOf("RAG")] = "";

  const registerHeaders = [...newHeaders, "Client"];
  const paddedBody = body.map((row) => [...row, ""]);
  const skinnyRow = [...skinny, clientName];
  const colourRow = [...colour, ""];

  const register = [
    ["Project register — September"],
    [],
    registerHeaders,
    ...paddedBody,
    skinnyRow,
    colourRow,
  ];
  XLSX.utils.book_append_sheet(
    out,
    XLSX.utils.aoa_to_sheet(register),
    "Project Register",
  );

  for (const name of src.SheetNames) {
    if (
      name === "Projects" ||
      name === "Summary" ||
      name === "Instructions" ||
      name.startsWith("_")
    ) {
      continue;
    }
    const matrix = sheetMatrix(src, name);
    if (matrix.length === 0) continue;
    if (name === "RAID") {
      const headers = (matrix[0] ?? []).filter((h) => String(h) !== "CostExposure");
      const drop = colIndex(matrix[0] ?? [], "CostExposure");
      const rows = matrix.slice(1).map((row) =>
        (matrix[0] ?? [])
          .map((h, idx) => (idx === drop ? null : row[idx]))
          .filter((_, idx) => idx !== drop),
      );
      XLSX.utils.book_append_sheet(
        out,
        XLSX.utils.aoa_to_sheet([["RAID log"], [], headers, ...rows]),
        "RAID Log",
      );
      continue;
    }
    if (name === "Invoices") {
      const headers = renameHeaders(matrix[0] ?? [], HEADER_ALIASES.Invoices);
      const rows = matrix.slice(1);
      const orphan = new Array(headers.length).fill(null);
      const idI = headers.indexOf("InvoiceID");
      const amtI = headers.indexOf("Amount");
      const descI = headers.indexOf("Description");
      const dateI = headers.indexOf("Invoice Date");
      const projI = headers.indexOf("ProjectID");
      if (idI >= 0) orphan[idI] = ORPHAN_INVOICE;
      if (amtI >= 0) orphan[amtI] = 12500;
      if (descI >= 0) orphan[descI] = "Unassigned retainer";
      if (dateI >= 0) orphan[dateI] = new Date(Date.UTC(2026, 6, 1));
      if (projI >= 0) orphan[projI] = "";
      XLSX.utils.book_append_sheet(
        out,
        XLSX.utils.aoa_to_sheet([headers, ...rows, orphan]),
        "AR aging",
      );
      continue;
    }
    if (name === "Resources") {
      const headers = renameHeaders(matrix[0] ?? [], HEADER_ALIASES.Resources);
      XLSX.utils.book_append_sheet(
        out,
        XLSX.utils.aoa_to_sheet([headers, ...matrix.slice(1)]),
        "Resources",
      );
      continue;
    }
    XLSX.utils.book_append_sheet(
      out,
      XLSX.utils.aoa_to_sheet(matrix),
      name.slice(0, 31),
    );
  }

  XLSX.utils.book_append_sheet(
    out,
    XLSX.utils.aoa_to_sheet([
      ["PTO calendar"],
      [],
      ["Name", "Start", "End", "Hours"],
      ["Mei Fraser", new Date(Date.UTC(2026, 8, 1)), new Date(Date.UTC(2026, 8, 5)), 32],
    ]),
    "PTO calendar",
  );

  return Buffer.from(XLSX.write(out, { type: "buffer", bookType: "xlsx" }));
}

export function writeCousinFixture(root = process.cwd()): string {
  const master = readFileSync(
    path.join(root, "data", "Enterprise_Portfolio_Data.xlsx"),
  );
  const buf = generateCousinWorkbook(master);
  const destDir = path.join(root, "data", "fixtures");
  mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, "cousin-portfolio.xlsx");
  writeFileSync(dest, buf);
  return dest;
}
