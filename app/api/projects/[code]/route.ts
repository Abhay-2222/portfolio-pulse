import { NextRequest } from "next/server";
import { requireMeFromRequest } from "@/lib/pmo/auth";
import { jsonAsOf, notFound, unauthorized } from "@/lib/pmo/http";
import { getProject } from "@/lib/pmo/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const me = requireMeFromRequest(request);
  if (!me) return unauthorized();
  const { code } = await ctx.params;
  const project = getProject(me.userId, code, me.canViewFinancials);
  if (project === "not_found") return notFound();
  return jsonAsOf(project);
}
