import { NextRequest } from "next/server";
import { requireMeFromRequest } from "@/lib/pmo/auth";
import { jsonAsOf, notFound, unauthorized } from "@/lib/pmo/http";
import { getHistory } from "@/lib/pmo/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const me = requireMeFromRequest(request);
  if (!me) return unauthorized();
  const { code } = await ctx.params;
  const weeks = Number(request.nextUrl.searchParams.get("weeks") ?? 26);
  const history = getHistory(me.userId, code, weeks);
  if (history === "not_found") return notFound();
  return jsonAsOf(history);
}
