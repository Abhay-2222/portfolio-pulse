import { promises as fs } from "fs";
import path from "path";
import { readWorkbook } from "@/lib/data/read-workbook";
import type { ParseResult } from "@/lib/data/types";

export class LocalFileSource {
  constructor(private readonly filePath: string) {}

  async peekVersion(): Promise<string> {
    const resolved = path.resolve(this.filePath);
    const stat = await fs.stat(resolved);
    return `${resolved}:mtime:${stat.mtimeMs}`;
  }

  async fetch(): Promise<ParseResult> {
    const resolved = path.resolve(this.filePath);
    const stat = await fs.stat(resolved);
    const buffer = await fs.readFile(resolved);
    const version = `${resolved}:mtime:${stat.mtimeMs}`;
    return readWorkbook(buffer, version, new Date(), {
      fileId: path.basename(resolved),
      fileModified: stat.mtime.toISOString(),
    });
  }
}

export { getDataFilePath } from "@/lib/data/user-source";
