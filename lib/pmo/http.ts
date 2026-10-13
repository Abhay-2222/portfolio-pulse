import { NextResponse } from "next/server";
import { latestAsOf } from "@/lib/pmo/queries";

export function jsonAsOf(body: unknown, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("X-Data-As-Of", latestAsOf());
  return res;
}

export function unauthorized() {
  return NextResponse.json(
    { code: "unauthorized", message: "Missing or expired sign-in" },
    { status: 401 },
  );
}

export function notFound() {
  return NextResponse.json(
    { code: "not_found", message: "Not found" },
    { status: 404 },
  );
}

export function forbidden() {
  return NextResponse.json(
    { code: "forbidden", message: "The user cannot view financials" },
    { status: 403 },
  );
}
