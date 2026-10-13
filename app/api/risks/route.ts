import { NextRequest } from "next/server";
import { requireMeFromRequest } from "@/lib/pmo/auth";
import { jsonAsOf, unauthorized } from "@/lib/pmo/http";
import { listRisks } from "@/lib/pmo/queries";
import type { RaidItem } from "@/lib/pmo/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const me = requireMeFromRequest(request);
  if (!me) return unauthorized();
  const s = request.nextUrl.searchParams;
  return jsonAsOf(
    listRisks(
      me.userId,
      (s.get("type") as RaidItem["type"] | null) ?? undefined,
      (s.get("severity") as RaidItem["severity"] | null) ?? undefined,
    ),
  );
}
