import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { readWorkbook } from "@/lib/data/read-workbook";
import { TABLE_HEADERS } from "@/lib/data/schema";
import { resolveWorkbookUrl } from "@/lib/data/remote-url";

export const DEMO_WORKBOOK = "Enterprise_Portfolio_Data.xlsx";
export const REQUIRED_SHEETS = Object.keys(TABLE_HEADERS);
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const EXCEL_EXT = /\.(xlsx|xls)$/i;

export type StoredBook = {
  id: string;
  originalName: string;
  storedName: string;
  uploadedAt: string;
  projects: number;
  issueCount: number;
  originKind?: "upload" | "url" | "sheet";
  originUrl?: string;
  fetchUrl?: string;
};

export type UserSourceState = {
  activeId: string | null;
  files: StoredBook[];
};

export type BookKind = "demo" | "upload" | "env" | "url" | "sheet";

export type BookMeta = {
  kind: BookKind;
  label: string;
  path: string;
  href: string | null;
  ephemeral: boolean;
};

const EMPTY: UserSourceState = { activeId: null, files: [] };

export function isEphemeralHost(): boolean {
  return Boolean(process.env.VERCEL);
}

export function demoWorkbookPath(): string {
  return path.join(process.cwd(), "data", DEMO_WORKBOOK);
}

export function userDataDir(): string {
  if (process.env.PULSE_USER_DATA_DIR) {
    return path.resolve(process.env.PULSE_USER_DATA_DIR);
  }
  if (isEphemeralHost()) {
    return path.join(os.tmpdir(), "portfolio-pulse-user");
  }
  return path.join(process.cwd(), "data");
}

function statePath(): string {
  return path.join(userDataDir(), "user-source.json");
}

function uploadsDir(): string {
  return path.join(userDataDir(), "uploads");
}

export function storedBookPath(storedName: string): string {
  return path.join(uploadsDir(), storedName);
}

export async function loadUserSource(): Promise<UserSourceState> {
  try {
    const raw = await fs.readFile(statePath(), "utf8");
    const parsed = JSON.parse(raw) as UserSourceState;
    if (!parsed || !Array.isArray(parsed.files)) return EMPTY;
    return {
      activeId: parsed.activeId ?? null,
      files: parsed.files,
    };
  } catch {
    return EMPTY;
  }
}

async function saveUserSource(state: UserSourceState): Promise<void> {
  await fs.mkdir(userDataDir(), { recursive: true });
  await fs.writeFile(statePath(), JSON.stringify(state, null, 2), "utf8");
}

export function isExcelName(name: string): boolean {
  return EXCEL_EXT.test(name);
}

export async function getBookMeta(): Promise<BookMeta> {
  if (process.env.DATA_FILE_PATH) {
    return {
      kind: "env",
      label: path.basename(process.env.DATA_FILE_PATH),
      path: process.env.DATA_FILE_PATH,
      href: null,
      ephemeral: isEphemeralHost(),
    };
  }
  const state = await loadUserSource();
  if (state.activeId) {
    const file = state.files.find((f) => f.id === state.activeId);
    if (file) {
      const filePath = storedBookPath(file.storedName);
      try {
        await fs.stat(filePath);
        return {
          kind:
            file.originKind === "sheet"
              ? "sheet"
              : file.originKind === "url"
                ? "url"
                : "upload",
          label: file.originalName,
          path: filePath,
          href: file.originUrl ?? null,
          ephemeral: isEphemeralHost(),
        };
      } catch {
        /* missing file — fall through to demo */
      }
    }
  }
  return {
    kind: "demo",
    label: "Demo book",
    path: demoWorkbookPath(),
    href: null,
    ephemeral: isEphemeralHost(),
  };
}

export async function getDataFilePath(): Promise<string> {
  return (await getBookMeta()).path;
}

export type IngestResult = {
  accepted: StoredBook[];
  rejected: { name: string; reason: string }[];
};

export async function ingestWorkbooks(
  files: {
    name: string;
    buffer: Buffer;
    originKind?: StoredBook["originKind"];
    originUrl?: string;
    fetchUrl?: string;
  }[],
): Promise<IngestResult> {
  await fs.mkdir(uploadsDir(), { recursive: true });
  const state = await loadUserSource();
  const accepted: StoredBook[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const file of files) {
    const name = file.name.trim() || "workbook.xlsx";
    const remote = file.originKind === "url" || file.originKind === "sheet";
    if (!remote && !isExcelName(name)) {
      rejected.push({
        name,
        reason: "Needs an Excel workbook (.xlsx or .xls). Export sheets into the template if the file is Word, CSV, or PDF.",
      });
      continue;
    }
    if (file.buffer.length > MAX_UPLOAD_BYTES) {
      rejected.push({
        name,
        reason: `Larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
      });
      continue;
    }

    let parsed;
    try {
      parsed = await readWorkbook(file.buffer, `upload:${name}`, new Date(), {
        fileId: name,
      });
    } catch {
      rejected.push({
        name,
        reason: "Couldn't open this file as Excel.",
      });
      continue;
    }

    if (parsed.dataset.projects.length === 0) {
      rejected.push({
        name,
        reason:
          "No projects Pulse could read. Start from the template, or use a file with a project list.",
      });
      continue;
    }

    const id = crypto.randomUUID();
    const storedName = `${id}${path.extname(name).toLowerCase() || ".xlsx"}`;
    await fs.writeFile(storedBookPath(storedName), file.buffer);
    const record: StoredBook = {
      id,
      originalName: path.basename(name),
      storedName,
      uploadedAt: new Date().toISOString(),
      projects: parsed.dataset.projects.length,
      issueCount: parsed.issues.length,
      originKind: file.originKind ?? "upload",
      originUrl: file.originUrl,
      fetchUrl: file.fetchUrl,
    };
    const replaced = state.files.filter((f) =>
      record.originUrl
        ? f.originUrl === record.originUrl
        : f.originalName === record.originalName && !f.originUrl,
    );
    const replacedIds = new Set(replaced.map((f) => f.id));
    for (const old of replaced) {
      await fs.unlink(storedBookPath(old.storedName)).catch(() => undefined);
    }
    state.files = [record, ...state.files.filter((f) => !replacedIds.has(f.id))];
    accepted.push(record);
  }

  if (accepted.length > 0) {
    state.activeId = accepted[0].id;
    await saveUserSource(state);
  }

  return { accepted, rejected };
}

function looksLikeHtml(buffer: Buffer): boolean {
  const head = buffer
    .subarray(0, 64)
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart()
    .slice(0, 15)
    .toLowerCase();
  return head.startsWith("<") || head.startsWith("<!doctype");
}

export async function ingestFromUrl(rawUrl: string): Promise<IngestResult> {
  const resolved = resolveWorkbookUrl(rawUrl);
  if (!resolved.ok) {
    return { accepted: [], rejected: [{ name: rawUrl, reason: resolved.reason }] };
  }
  const { target } = resolved;
  let response: Response;
  try {
    response = await fetch(target.fetchUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,*/*" },
    });
  } catch {
    return {
      accepted: [],
      rejected: [
        {
          name: target.label,
          reason: "Couldn't reach that link.",
        },
      ],
    };
  }
  if (!response.ok) {
    return {
      accepted: [],
      rejected: [
        {
          name: target.label,
          reason:
            response.status === 401 || response.status === 403
              ? "The file is not public. For Google Sheets, share with anyone with the link."
              : `The link returned ${response.status}.`,
        },
      ],
    };
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return {
      accepted: [],
      rejected: [{ name: target.label, reason: "Larger than 20 MB." }],
    };
  }
  if (looksLikeHtml(buffer)) {
    return {
      accepted: [],
      rejected: [
        {
          name: target.label,
          reason:
            "That link returned a web page, not a workbook. Share the Google Sheet with anyone with the link, or paste a direct .xlsx URL.",
        },
      ],
    };
  }
  return ingestWorkbooks([
    {
      name: target.label.endsWith(".xlsx") ? target.label : `${target.label}.xlsx`,
      buffer,
      originKind: target.kind,
      originUrl: target.openUrl,
      fetchUrl: target.fetchUrl,
    },
  ]);
}

export async function refreshActiveRemote(): Promise<void> {
  const state = await loadUserSource();
  const file = state.files.find((f) => f.id === state.activeId);
  if (!file?.originUrl || !file.fetchUrl) return;
  await ingestFromUrl(file.originUrl);
}

export async function activateBook(id: string): Promise<boolean> {
  const state = await loadUserSource();
  const file = state.files.find((f) => f.id === id);
  if (!file) return false;
  state.activeId = id;
  await saveUserSource(state);
  return true;
}

export async function removeBook(id: string): Promise<void> {
  const state = await loadUserSource();
  const file = state.files.find((f) => f.id === id);
  if (file) {
    await fs.unlink(storedBookPath(file.storedName)).catch(() => undefined);
  }
  state.files = state.files.filter((f) => f.id !== id);
  if (state.activeId === id) state.activeId = null;
  await saveUserSource(state);
}

export async function restoreDemoBook(): Promise<void> {
  const state = await loadUserSource();
  state.activeId = null;
  await saveUserSource(state);
}

export async function copyDemoIntoLibrary(
  name = "My book.xlsx",
): Promise<StoredBook> {
  const buffer = await fs.readFile(demoWorkbookPath());
  const result = await ingestWorkbooks([
    {
      name,
      buffer,
      originKind: "upload",
    },
  ]);
  if (result.accepted[0]) return result.accepted[0];
  throw new Error(result.rejected[0]?.reason ?? "Couldn't copy the demo book.");
}
