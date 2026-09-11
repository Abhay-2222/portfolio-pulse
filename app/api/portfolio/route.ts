import { NextRequest, NextResponse } from "next/server";
import { loadPortfolio } from "@/lib/data/portfolio-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const payload = await loadPortfolio(force);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: message,
        hint: "Couldn't read the workbook. Check DATA_FILE_PATH and that required sheets/columns exist.",
      },
      { status: 500 },
    );
  }
}
