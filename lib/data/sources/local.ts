import { promises as fs } from "fs";
import path from "path";
import { parseWorkbook } from "@/lib/data/parse";
import type { ParseResult } from "@/lib/data/types";

export class LocalFileSource {
  constructor(private readonly filePath: string) {}

  async peekVersion(): Promise<string> {
    const resolved = path.resolve(this.filePath);
    const stat = await fs.stat(resolved);
    return `mtime:${stat.mtimeMs}`;
  }

  async fetch(): Promise<ParseResult> {
    const resolved = path.resolve(this.filePath);
    const stat = await fs.stat(resolved);
    const buffer = await fs.readFile(resolved);
    const version = `mtime:${stat.mtimeMs}`;
    return parseWorkbook(buffer, version, new Date(), {
      fileId: path.basename(resolved),
      fileModified: stat.mtime.toISOString(),
    });
  }
}

export function getDataFilePath(): string {
  return (
    process.env.DATA_FILE_PATH ??
    path.join(process.cwd(), "data", "Enterprise_Portfolio_Data.xlsx")
  );
}
