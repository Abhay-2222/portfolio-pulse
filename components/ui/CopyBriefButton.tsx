"use client";

import { useState } from "react";
import { btnDefer } from "@/components/ui/Button";

export function CopyBriefButton({
  text,
  label = "Copy brief",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={btnDefer}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
