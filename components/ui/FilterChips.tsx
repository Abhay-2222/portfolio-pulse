"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { IconFilter } from "@/components/ui/Icons";

export function FilterChips({
  chips,
  label = "Filter",
}: {
  chips: { label: string; href: string; active?: boolean }[];
  variant?: "pills" | "segmented";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const router = useRouter();
  const active = chips.find((c) => c.active) ?? chips[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-11 max-w-[11rem] shrink-0 items-center gap-2 rounded-[10px] border border-[var(--tile-border)] bg-[var(--surface)] px-3 text-[13px] font-normal text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${active?.label ?? "choose"}`}
        onClick={() => setOpen(true)}
      >
        <IconFilter size={18} />
        <span className="truncate">{active?.label ?? label}</span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(29,29,31,0.35)]"
            aria-label="Close filter"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-x-0 bottom-0 rounded-t-[16px] border border-[var(--hairline)] bg-[var(--surface)] px-4 pb-8 pt-4 md:inset-x-auto md:bottom-auto md:right-4 md:top-16 md:w-80 md:rounded-[16px]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--hairline)] md:hidden" />
            <h2 id={titleId} className="text-[15px] font-normal">
              {label}
            </h2>
            <p className="mt-1 text-[12px] text-[var(--ink-2)]">
              Now showing {active?.label ?? "all"}.
            </p>
            <ul className="mt-3 divide-y divide-[var(--hairline)]">
              {chips.map((c) => (
                <li key={c.href}>
                  <button
                    type="button"
                    aria-current={c.active ? "true" : undefined}
                    className={`flex min-h-12 w-full items-center justify-between px-1 text-left text-[15px] ${
                      c.active
                        ? "font-normal text-[var(--ink)]"
                        : "text-[var(--ink-2)]"
                    }`}
                    onClick={() => {
                      setOpen(false);
                      if (!c.active) router.push(c.href);
                    }}
                  >
                    {c.label}
                    {c.active ? <span aria-hidden>✓</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
