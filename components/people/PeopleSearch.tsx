"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

export function PeopleSearch({
  status,
  q,
}: {
  status?: string;
  q: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function go(value: string) {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    const next = value.trim();
    if (next) p.set("q", next);
    const s = p.toString();
    router.replace(s ? `/people?${s}` : "/people");
  }

  return (
    <input
      type="search"
      name="q"
      defaultValue={q}
      placeholder="Name, role, skill"
      aria-label="Filter people as you type"
      className="min-h-11 w-full rounded-[10px] border border-[var(--hairline)] bg-[var(--surface)] px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-3)]"
      onChange={(e) => {
        if (timer.current) clearTimeout(timer.current);
        const value = e.target.value;
        timer.current = setTimeout(() => go(value), 160);
      }}
    />
  );
}
