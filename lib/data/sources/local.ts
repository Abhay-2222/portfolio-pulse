import { promises as fs } from "fs";
import path from "path";
import { parseWorkbook } from "@/lib/data/parse";
import type { ParseResult } from "@/lib/data/types";

export class LocalFileSource {
  constructor(private readonly filePath: string) {}

  async fetch(force = false): Promise<ParseResult> {
    void force; // local always reads disk; cache is handled by portfolio-service
    const resolved = path.resolve(this.filePath);
    const stat = await fs.stat(resolved);
    const buffer = await fs.readFile(resolved);
    const version = `mtime:${stat.mtimeMs}`;
    return parseWorkbook(buffer, version, new Date());
  }
}

export function getDataFilePath(): string {
  return (
    process.env.DATA_FILE_PATH ??
    path.join(process.cwd(), "data", "Enterprise_Portfolio_Data.xlsx")
  );
}
