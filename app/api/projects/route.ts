import { NextRequest } from "next/server";
import { requireMeFromRequest } from "@/lib/pmo/auth";
import { jsonAsOf, unauthorized } from "@/lib/pmo/http";
import { listProjects } from "@/lib/pmo/queries";
import type { HealthCheck, Lifecycle, Rag } from "@/lib/pmo/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const me = requireMeFromRequest(request);
  if (!me) return unauthorized();
  const s = request.nextUrl.searchParams;
  const stale = s.get("stale");
  const rebaselined = s.get("rebaselined");
  const result = listProjects(me.userId, {
    q: s.get("q") ?? undefined,
    programId: s.get("programId") ?? undefined,
    pmId: s.get("pmId") ?? undefined,
    lifecycle: (s.get("lifecycle") as Lifecycle | null) ?? undefined,
    calculatedRag: (s.get("calculatedRag") as Rag | null) ?? undefined,
    healthCheck: (s.get("healthCheck") as HealthCheck | null) ?? undefined,
    stale: stale == null ? undefined : stale === "true" || stale === "1",
    rebaselined:
      rebaselined == null
        ? undefined
        : rebaselined === "true" || rebaselined === "1",
    sort:
      (s.get("sort") as "severity" | "name" | "code" | "forecastFinish") ??
      "severity",
    limit: s.get("limit") ? Number(s.get("limit")) : undefined,
    cursor: s.get("cursor") ?? undefined,
  });
  return jsonAsOf(result);
}
