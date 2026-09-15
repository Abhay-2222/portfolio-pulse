"use client";

import { useState } from "react";
import type { Finding } from "@/lib/findings/types";
import { provenanceFingerprint } from "@/lib/overlay/fingerprint";
import { btnCommit, btnDefer, btnQuiet } from "@/components/ui/Button";
import {
  actionFinding,
  dismissFinding,
  noteFinding,
  ownFinding,
  releaseFinding,
  reopenFinding,
  snoozeFinding,
  unsnoozeFinding,
} from "@/app/overlay/actions";

const moreBtn =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[var(--tile-border)] bg-[var(--surface)] text-[15px] font-normal leading-none text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function TriageBar({
  finding,
  copyText,
}: {
  finding: Finding;
  copyText: string;
}) {
  const [panel, setPanel] = useState<"none" | "hold" | "more">("none");
  const [copied, setCopied] = useState(false);
  const id = finding.id;
  const closed =
    finding.disposition === "actioned" || finding.disposition === "dismissed";
  const parked = finding.disposition === "snoozed";
  const fingerprint = provenanceFingerprint(finding.provenance);

  async function copy() {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-3">
      <div className="flex items-stretch gap-2">
        {closed ? (
          <form action={reopenFinding} className="min-w-0 flex-1">
            <input type="hidden" name="id" value={id} />
            <input
              type="hidden"
              name="hadOwner"
              value={finding.owner ? "1" : ""}
            />
            <button type="submit" className={`${btnCommit} w-full`}>
              Reopen
            </button>
          </form>
        ) : parked ? (
          <form action={unsnoozeFinding} className="min-w-0 flex-1">
            <input type="hidden" name="id" value={id} />
            <button type="submit" className={`${btnCommit} w-full`}>
              Bring back
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              className={`${btnDefer} min-w-0 flex-1`}
              aria-expanded={panel === "hold"}
              onClick={() => setPanel(panel === "hold" ? "none" : "hold")}
            >
              Hold
            </button>
            {finding.owner ? (
              <form action={actionFinding} className="min-w-0 flex-1">
                <input type="hidden" name="id" value={id} />
                <button type="submit" className={`${btnDefer} w-full`}>
                  Done
                </button>
              </form>
            ) : (
              <form action={ownFinding} className="min-w-0 flex-1">
                <input type="hidden" name="id" value={id} />
                <button type="submit" className={`${btnCommit} w-full`}>
                  Take it
                </button>
              </form>
            )}
          </>
        )}
        <button
          type="button"
          className={moreBtn}
          aria-label="More actions"
          aria-expanded={panel === "more"}
          onClick={() => setPanel(panel === "more" ? "none" : "more")}
        >
          ···
        </button>
      </div>

      {panel === "hold" && !closed && !parked ? (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { days: 1, label: "Tomorrow" },
            { days: 7, label: "Next week" },
            { days: 30, label: "30 days" },
          ].map((opt) => (
            <form action={snoozeFinding} key={opt.days}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="days" value={String(opt.days)} />
              <input
                type="hidden"
                name="amount"
                value={finding.amount == null ? "" : String(finding.amount)}
              />
              <input type="hidden" name="fingerprint" value={fingerprint} />
              <button type="submit" className={`${btnQuiet} w-full px-2 text-[13px]`}>
                {opt.label}
              </button>
            </form>
          ))}
        </div>
      ) : null}

      {panel === "more" ? (
        <div className="mt-2 space-y-2">
          {finding.owner && !closed && !parked ? (
            <form action={releaseFinding}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" className={`${btnDefer} w-full`}>
                Release
              </button>
            </form>
          ) : null}
          {!closed ? (
            <>
              {parked || finding.owner ? null : (
                <form action={actionFinding}>
                  <input type="hidden" name="id" value={id} />
                  <button type="submit" className={`${btnDefer} w-full`}>
                    Done
                  </button>
                </form>
              )}
              <form action={dismissFinding}>
                <input type="hidden" name="id" value={id} />
                <button type="submit" className={`${btnDefer} w-full`}>
                  Skip
                </button>
              </form>
            </>
          ) : null}
          <button type="button" className={`${btnDefer} w-full`} onClick={copy}>
            {copied ? "Copied" : "Copy finding"}
          </button>
          <form action={noteFinding} className="space-y-2">
            <input type="hidden" name="id" value={id} />
            <textarea
              name="note"
              defaultValue={finding.note ?? ""}
              rows={2}
              className="w-full rounded-[12px] border border-[var(--tile-border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)]"
              placeholder="A line for yourself. Not written to the book."
            />
            <button type="submit" className={`${btnDefer} w-full`}>
              Save note
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
