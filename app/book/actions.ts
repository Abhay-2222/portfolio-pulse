"use server";

import { revalidatePath } from "next/cache";
import { clearPortfolioCache } from "@/lib/data/portfolio-service";
import {
  activateBook,
  ingestFromUrl,
  ingestWorkbooks,
  removeBook,
  restoreDemoBook,
  copyDemoIntoLibrary,
} from "@/lib/data/user-source";
import { setBindingRecipe } from "@/lib/resolver/recipes";

export type UploadState = {
  ok: boolean;
  message: string;
} | null;

function refresh() {
  clearPortfolioCache();
  revalidatePath("/", "layout");
}

export async function uploadWorkbooks(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  if (process.env.DATA_FILE_PATH) {
    return {
      ok: false,
      message:
        "DATA_FILE_PATH is set, so uploads are ignored. Unset it to use the file picker.",
    };
  }

  const incoming = formData
    .getAll("files")
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (incoming.length === 0) {
    return { ok: false, message: "Choose one or more Excel workbooks first." };
  }

  const files = await Promise.all(
    incoming.slice(0, 10).map(async (file) => ({
      name: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    })),
  );

  const result = await ingestWorkbooks(files);
  refresh();

  if (result.accepted.length === 0) {
    const first = result.rejected[0];
    return {
      ok: false,
      message: first
        ? `${first.name}: ${first.reason}`
        : "None of those files could be used.",
    };
  }

  const using = result.accepted[0].originalName;
  const extra = result.rejected.length
    ? ` ${result.rejected.length} file${result.rejected.length === 1 ? "" : "s"} skipped.`
    : "";
  return {
    ok: true,
    message: `Briefing from ${using}.${extra}`,
  };
}

export async function connectWorkbookUrl(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  if (process.env.DATA_FILE_PATH) {
    return {
      ok: false,
      message:
        "DATA_FILE_PATH is set, so links are ignored. Unset it to use a URL.",
    };
  }
  const url = String(formData.get("url") ?? "").trim();
  if (!url) {
    return { ok: false, message: "Paste a Google Sheet or https link to an .xlsx." };
  }
  const result = await ingestFromUrl(url);
  refresh();
  if (result.accepted.length === 0) {
    const first = result.rejected[0];
    return {
      ok: false,
      message: first?.reason ?? "Couldn't use that link.",
    };
  }
  return {
    ok: true,
    message: `Briefing from ${result.accepted[0].originalName}. Refresh pulls a new copy.`,
  };
}

export async function useUploadedBook(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await activateBook(id);
  refresh();
}

export async function dropUploadedBook(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await removeBook(id);
  refresh();
}

export async function useDemoBook() {
  await restoreDemoBook();
  refresh();
}

export async function copyDemoBook() {
  await copyDemoIntoLibrary("My book.xlsx");
  refresh();
}

export async function confirmBinding(formData: FormData) {
  const fingerprint = String(formData.get("fingerprint") ?? "");
  const sourceHeader = String(formData.get("sourceHeader") ?? "");
  const canonical = String(formData.get("canonical") ?? "");
  const table = String(formData.get("table") ?? "");
  if (!fingerprint || !sourceHeader || !canonical || !table) return;
  await setBindingRecipe(fingerprint, sourceHeader, canonical, table, "confirmed");
  refresh();
}

export async function dismissBinding(formData: FormData) {
  const fingerprint = String(formData.get("fingerprint") ?? "");
  const sourceHeader = String(formData.get("sourceHeader") ?? "");
  const canonical = String(formData.get("canonical") ?? "");
  const table = String(formData.get("table") ?? "");
  if (!fingerprint || !sourceHeader || !canonical || !table) return;
  await setBindingRecipe(fingerprint, sourceHeader, canonical, table, "dismissed");
  refresh();
}
