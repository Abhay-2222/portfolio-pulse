export type RemoteKind = "sheet" | "url";

export type RemoteTarget = {
  kind: RemoteKind;
  fetchUrl: string;
  openUrl: string;
  label: string;
};

const SHEET_ID = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i;

export function resolveWorkbookUrl(
  raw: string,
): { ok: true; target: RemoteTarget } | { ok: false; reason: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: "Paste a Google Sheet or https link to an .xlsx." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "That is not a URL." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "Only http(s) links. Private drives need a downloaded .xlsx." };
  }

  const sheet = trimmed.match(SHEET_ID);
  if (sheet) {
    const id = sheet[1]!;
    return {
      ok: true,
      target: {
        kind: "sheet",
        fetchUrl: `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`,
        openUrl: `https://docs.google.com/spreadsheets/d/${id}`,
        label: "Google Sheet",
      },
    };
  }

  return {
    ok: true,
    target: {
      kind: "url",
      fetchUrl: parsed.href,
      openUrl: parsed.href,
      label: filenameFromUrl(parsed) || "Linked workbook",
    },
  };
}

function filenameFromUrl(url: URL): string {
  const base = url.pathname.split("/").filter(Boolean).pop() ?? "";
  try {
    return decodeURIComponent(base);
  } catch {
    return base;
  }
}
