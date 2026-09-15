"use client";

import { useState } from "react";
import type { CellRef } from "@/lib/findings/types";

function line(ref: CellRef): string {
  return `${ref.cell} (${ref.column})${ref.sensitive ? " · rate hidden" : ""}`;
}

export function SourceLink({
  refs,
  compact = false,
  quiet = false,
}: {
  refs: CellRef[];
  compact?: boolean;
  quiet?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!refs.length) return null;
  const count = refs.length;
  const label = compact
    ? "Source"
    : count === 1
      ? `Source · ${refs[0]!.cell}`
      : `Source · ${count} cells`;

  return (
    <div className={compact ? "" : "mt-2"}>
      <button
        type="button"
        className={
          quiet
            ? "flex min-h-8 items-center text-[12px] font-normal text-[var(--ink-2)]"
            : "flex min-h-11 items-center text-[12px] font-normal text-[var(--accent)]"
        }
        aria-expanded={open}
        aria-label={
          count === 1 ? `Source, ${refs[0]!.cell}` : `Source, ${count} cells`
        }
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open ? (
        <ul className="space-y-1 pb-2 text-[12px] leading-5 text-[var(--ink-2)]">
          {refs.map((ref) => (
            <li key={`${ref.cell}:${ref.column}`}>
              {line(ref)}
              {ref.fileId ? (
                <span className="block text-[11px] text-[var(--ink-3)]">
                  {ref.fileId}
                  {ref.fileModified ? ` · ${ref.fileModified.slice(0, 10)}` : ""}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** @deprecated Use SourceLink */
export function Provenance({
  refs,
  compact = false,
}: {
  refs: CellRef[];
  compact?: boolean;
}) {
  return <SourceLink refs={refs} compact={compact} />;
}
