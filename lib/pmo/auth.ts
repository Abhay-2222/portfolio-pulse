import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getMe } from "@/lib/pmo/queries";
import type { Me } from "@/lib/pmo/types";
import { USER_COOKIE } from "@/lib/pmo/constants";

export { USER_COOKIE };

export function userIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  return request.cookies.get(USER_COOKIE)?.value ?? null;
}

export async function userIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(USER_COOKIE)?.value ?? null;
}

export async function requireMeFromCookies(): Promise<Me | null> {
  const id = await userIdFromCookies();
  if (!id) return null;
  return getMe(id);
}

export async function requireSession(): Promise<Me> {
  const me = await requireMeFromCookies();
  if (!me) redirect("/signin");
  return me;
}

export function requireMeFromRequest(request: NextRequest): Me | null {
  const id = userIdFromRequest(request);
  if (!id) return null;
  return getMe(id);
}
