"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USER_COOKIE } from "@/lib/pmo/constants";
import { getMe } from "@/lib/pmo/queries";

export async function signIn(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";
  const me = getMe(userId);
  if (!me) redirect("/signin");
  const jar = await cookies();
  jar.set(USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect(next.startsWith("/") ? next : "/");
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(USER_COOKIE);
  redirect("/signin");
}
