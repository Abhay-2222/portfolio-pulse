import { describe, expect, it } from "vitest";
import { resolveWorkbookUrl } from "@/lib/data/remote-url";

describe("resolveWorkbookUrl", () => {
  it("turns a Google Sheet edit link into an xlsx export", () => {
    const result = resolveWorkbookUrl(
      "https://docs.google.com/spreadsheets/d/abc-123/edit?usp=sharing#gid=0",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target.kind).toBe("sheet");
    expect(result.target.fetchUrl).toBe(
      "https://docs.google.com/spreadsheets/d/abc-123/export?format=xlsx",
    );
    expect(result.target.openUrl).toBe(
      "https://docs.google.com/spreadsheets/d/abc-123",
    );
  });

  it("keeps a direct https workbook", () => {
    const result = resolveWorkbookUrl(
      "https://example.com/files/book.xlsx",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target.kind).toBe("url");
    expect(result.target.fetchUrl).toBe("https://example.com/files/book.xlsx");
    expect(result.target.label).toBe("book.xlsx");
  });

  it("rejects non-http schemes", () => {
    const result = resolveWorkbookUrl("file:///tmp/book.xlsx");
    expect(result.ok).toBe(false);
  });
});
