import { NextRequest } from "next/server";
import { requireMeFromRequest } from "@/lib/pmo/auth";
import { unauthorized } from "@/lib/pmo/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const me = requireMeFromRequest(request);
  if (!me) return unauthorized();
  return NextResponse.json(me);
}
