"use client";

import { useId, useState, type ReactNode } from "react";

export function ExpandableTile({
  summary,
  detail,
  defaultOpen = false,
  accent = false,
}: {
  summary: ReactNode;
  detail: ReactNode;
  defaultOpen?: boolean;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div
      className={`overflow-hidden rounded-[10px] border transition-[box-shadow,transform] duration-200 ${
        accent
          ? "border-transparent bg-[var(--accent)] text-white"
          : "border-[var(--tile-border)] bg-[var(--surface)]"
      } ${open ? "shadow-[0_12px_40px_rgba(0,0,0,0.1)]" : ""}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full min-h-11 items-start gap-2 px-3 py-3 text-left ${
          accent ? "text-white" : "text-[var(--ink)]"
        }`}
      >
        <span
          className={`mt-[1px] text-[14px] font-normal leading-none transition-transform duration-200 ${
            accent ? "text-white/90" : "text-[var(--accent)]"
          } ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          →
        </span>
        <div className="min-w-0 flex-1">{summary}</div>
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`border-t px-3 pb-3 pt-2 text-[13px] leading-relaxed ${
              accent
                ? "border-white/20 text-white/80"
                : "border-[var(--tile-border)] text-[var(--ink-2)]"
            }`}
          >
            {detail}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>
  );
}
