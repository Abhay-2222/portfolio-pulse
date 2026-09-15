"use client";

import { useActionState } from "react";
import { connectWorkbookUrl, type UploadState } from "@/app/book/actions";
import { btnCommit } from "@/components/ui/Button";

export function LinkForm({ envLocked }: { envLocked: boolean }) {
  const [state, action, pending] = useActionState(
    connectWorkbookUrl,
    null as UploadState,
  );

  return (
    <form action={action} className="space-y-2">
      <label className="block">
        <p className="kicker">Sheet or file URL</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-[10px] border border-[var(--tile-border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
            type="url"
            name="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://docs.google.com/spreadsheets/d/…"
            disabled={envLocked || pending}
          />
          <button
            type="submit"
            className={`${btnCommit} sm:min-w-24`}
            disabled={envLocked || pending}
          >
            {pending ? "Fetching…" : "Use link"}
          </button>
        </div>
        <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
          Anyone-with-the-link Sheets, or a direct .xlsx URL.
        </p>
      </label>
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
