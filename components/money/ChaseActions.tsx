"use client";

import { useState } from "react";
import { actionFinding, noteFinding } from "@/app/overlay/actions";
import { btnCommit, btnDefer } from "@/components/ui/Button";

export function ChaseActions({
  findingId,
  note,
}: {
  findingId: string;
  note: string;
}) {
  const [copied, setCopied] = useState(false);
  const [more, setMore] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(note);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-4 space-y-2">
      <form action={actionFinding}>
        <input type="hidden" name="id" value={findingId} />
        <button type="submit" className={`${btnCommit} w-full`}>
          Mark as chased
        </button>
      </form>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-center text-[13px] font-normal text-[var(--accent)]"
        aria-expanded={more}
        onClick={() => setMore((v) => !v)}
      >
        {more ? "Less" : "More"}
      </button>
      {more ? (
        <div className="space-y-2">
          <button type="button" className={`${btnDefer} w-full`} onClick={copy}>
            {copied ? "Copied" : "Copy chase note"}
          </button>
          <form action={noteFinding} className="space-y-2">
            <input type="hidden" name="id" value={findingId} />
            <textarea
              name="note"
              defaultValue={note}
              rows={3}
              className="w-full rounded-[12px] border border-[var(--tile-border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)]"
            />
            <button type="submit" className={`${btnDefer} w-full`}>
              Save chase note
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
