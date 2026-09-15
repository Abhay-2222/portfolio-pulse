import { parseWorkbook, type ParseOptions } from "@/lib/data/parse";
import { emptyCoverage } from "@/lib/data/coverage";
import { mapWorkbookToCanonical } from "@/lib/data/map-workbook";
import type { ParseResult } from "@/lib/data/types";
import { loadRecipes } from "@/lib/resolver/recipes";

export function hasUsableProjects(parsed: ParseResult): boolean {
  const missingProjects = parsed.issues.some(
    (i) => i.table === "Projects" && i.message.toLowerCase().includes("missing"),
  );
  return !missingProjects && parsed.dataset.projects.length > 0;
}

export async function readWorkbook(
  buffer: ArrayBuffer | Buffer,
  version: string,
  fetchedAt: Date = new Date(),
  meta?: ParseOptions,
): Promise<ParseResult> {
  let exact: ParseResult;
  try {
    exact = parseWorkbook(buffer, version, fetchedAt, meta);
  } catch {
    throw new Error("Couldn't open this file as Excel.");
  }
  if (hasUsableProjects(exact)) {
    exact.coverage = emptyCoverage();
    return exact;
  }

  let recipes;
  try {
    recipes = await loadRecipes();
  } catch {
    recipes = undefined;
  }
  try {
    const mapped = mapWorkbookToCanonical(buffer, { ...meta, recipes });
    if (mapped.parse.dataset.projects.length > 0) {
      return mapped.parse;
    }
  } catch {
    /* mapped parse failed — fall through */
  }
  return exact;
}
