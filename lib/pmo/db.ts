import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const DB_PATH =
  process.env.PULSE_DB_PATH ??
  path.join(process.cwd(), "data", "portfolio_pulse.db");

let cached: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!cached) {
    cached = new DatabaseSync(DB_PATH, { readOnly: true });
  }
  return cached;
}

export function dbPath(): string {
  return DB_PATH;
}
