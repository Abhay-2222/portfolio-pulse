"use client";

import { useActionState } from "react";
import { uploadWorkbooks, type UploadState } from "@/app/book/actions";
import { btnCommit } from "@/components/ui/Button";

export function UploadForm({ envLocked }: { envLocked: boolean }) {
  const [state, action, pending] = useActionState(
    uploadWorkbooks,
    null as UploadState,
  );

  return (
    <form action={action} className="space-y-3">
      <label className="card-tile block cursor-pointer">
        <p className="kicker">Your workbook</p>
        <p className="mt-1 text-[16px] font-normal leading-5 tracking-[-0.02em]">
          Drop .xlsx here, or choose files
        </p>
        <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
          One Excel workbook. Template headers brief fully. Close cousins are
          mapped; extras go to More.
        </p>
        <input
          className="mt-3 block w-full text-[13px] text-[var(--ink-2)] file:mr-3 file:rounded-[10px] file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-[13px] file:text-white"
          type="file"
          name="files"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          multiple={false}
          disabled={envLocked || pending}
        />
      </label>
      <button
        type="submit"
        className={`${btnCommit} w-full`}
        disabled={envLocked || pending}
      >
        {pending ? "Reading…" : "Use this file"}
      </button>
      {state ? (
        <p
          className={`text-[13px] leading-5 ${
            state.ok ? "text-[var(--ink-2)]" : "text-[var(--off-track-text)]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
