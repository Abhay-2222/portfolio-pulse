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
    <form action={action} className="space-y-3">
      <label className="card-tile block">
        <p className="kicker">Web link</p>
        <p className="mt-1 text-[16px] font-normal leading-5 tracking-[-0.02em]">
          Google Sheet or .xlsx URL
        </p>
        <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
          Share the Google Sheet with anyone with the link, or paste a direct
          .xlsx URL. Private Drive files need a downloaded .xlsx.
        </p>
        <input
          className="mt-3 w-full rounded-[10px] border border-[var(--tile-border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
          type="url"
          name="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://docs.google.com/spreadsheets/d/…"
          disabled={envLocked || pending}
        />
      </label>
      <button
        type="submit"
        className={`${btnCommit} w-full`}
        disabled={envLocked || pending}
      >
        {pending ? "Fetching…" : "Use this link"}
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
