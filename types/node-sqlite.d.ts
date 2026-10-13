declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(
      path: string,
      options?: { readOnly?: boolean; enableForeignKeys?: boolean },
    );
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export class StatementSync {
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  }
}
