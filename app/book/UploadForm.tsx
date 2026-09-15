"use client";

import { useActionState, useRef, useState } from "react";
import { uploadWorkbooks, type UploadState } from "@/app/book/actions";
import { btnCommit } from "@/components/ui/Button";

export function UploadForm({ envLocked }: { envLocked: boolean }) {
  const [state, action, pending] = useActionState(
    uploadWorkbooks,
    null as UploadState,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [over, setOver] = useState(false);

  function takeFiles(files: FileList | null) {
    const input = inputRef.current;
    if (!input) return;
    if (!files?.length) {
      input.value = "";
      setFileName("");
      return;
    }
    const dt = new DataTransfer();
    dt.items.add(files[0]!);
    input.files = dt.files;
    setFileName(files[0]!.name);
  }

  return (
    <form action={action} className="space-y-2">
      <label
        className={`block cursor-pointer rounded-[14px] border border-dashed px-3 py-4 transition-colors ${
          over
            ? "border-[var(--accent)] bg-[var(--accent-tint)]"
            : "border-[var(--tile-border)] bg-[var(--surface-2)]"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          takeFiles(event.dataTransfer.files);
        }}
      >
        <p className="kicker">Workbook</p>
        <p className="mt-1 text-[16px] font-normal leading-5 tracking-[-0.02em]">
          {fileName || "Drop or choose an .xlsx"}
        </p>
        <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
          Template headers brief fully. Extras go to More.
        </p>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          name="files"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          multiple={false}
          disabled={envLocked || pending}
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        />
      </label>
      {fileName ? (
        <button
          type="submit"
          className={`${btnCommit} w-full`}
          disabled={envLocked || pending}
        >
          {pending ? "Reading…" : "Use this file"}
        </button>
      ) : null}
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
