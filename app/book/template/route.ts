import { readFile } from "fs/promises";
import { demoWorkbookPath } from "@/lib/data/user-source";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const buf = await readFile(demoWorkbookPath());
    return new Response(Uint8Array.from(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="portfolio-pulse-template.xlsx"',
      },
    });
  } catch {
    return new Response("Template workbook is missing.", { status: 404 });
  }
}
