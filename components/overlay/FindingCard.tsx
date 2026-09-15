import type { ReactNode } from "react";
import Link from "next/link";
import type { Finding } from "@/lib/findings/types";
import { SourceLink } from "@/components/ui/Provenance";
import { TriageBar } from "@/components/overlay/TriageBar";
import { EntityLink } from "@/components/ui/EntityLink";
import { exportFindingMarkdown } from "@/lib/overlay/export";
import { formatHoldUntil, money } from "@/lib/format";

export function FindingCard({
  finding,
  linked = true,
  compact = false,
  actions = true,
  spark = null,
}: {
  finding: Finding;
  linked?: boolean;
  compact?: boolean;
  actions?: boolean;
  spark?: ReactNode;
}) {
  const status = statusLine(finding);
  const tier = finding.treatment;
  const figure = finding.amount != null ? money(finding.amount) : null;
  const title = compact
    ? (finding.move ?? finding.headline).replace(/\.$/, "")
    : finding.headline.replace(/\.$/, "");
  const figureColor =
    finding.kind === "opportunity"
      ? "var(--accent)"
      : finding.domain === "money"
        ? "var(--off-track-text)"
        : "var(--ink)";

  const compactBody = (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        {finding.kicker ? <p className="kicker">{finding.kicker}</p> : null}
        <p
          className={`text-[16px] font-normal leading-5 tracking-[-0.02em] ${
            finding.kicker ? "mt-1" : ""
          }`}
        >
          {title}
        </p>
        {finding.actor ? (
          <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
            {finding.actor.type === "person" && !linked ? (
              <EntityLink type="person" id={finding.actor.id}>
                {finding.actor.label}
              </EntityLink>
            ) : (
              finding.actor.label
            )}
          </p>
        ) : null}
      </div>
      {figure && tier >= 3 ? (
        <p
          className="figure shrink-0 !text-[16px] !leading-5"
          style={{ color: figureColor }}
        >
          {figure}
        </p>
      ) : null}
    </div>
  );

  const claimSize =
    tier === 4
      ? "text-[17px] font-normal leading-5 tracking-[-0.02em]"
      : tier === 3
        ? "text-[15px] font-normal leading-5"
        : "text-[13px] font-normal leading-5";

  const fullBody = (
    <>
      {finding.kicker ? (
        <span className="mb-1 block font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-[var(--ink-2)]">
          {finding.kicker}
        </span>
      ) : null}
      {figure && tier >= 3 ? (
        <span
          className={`block ${tier === 4 ? "text-[20px] font-normal leading-6 tracking-[-0.03em]" : "text-[16px] font-normal leading-5 tracking-[-0.02em]"}`}
          style={{ color: figureColor }}
        >
          {figure}
        </span>
      ) : null}
      <span className={`mt-1 block ${claimSize} text-[var(--ink)]`}>
        {finding.headline.replace(/\.$/, "")}
      </span>
      {tier < 2 ? null : (
        <span className="mt-1 block text-[13px] font-normal leading-5 text-[var(--ink-2)]">
          {finding.sentence}
        </span>
      )}
      {finding.consequence && tier >= 2 ? (
        <span className="mt-1.5 block text-[13px] leading-5 text-[var(--ink-2)]">
          {finding.consequence}
        </span>
      ) : null}
      {finding.move && tier >= 3 ? (
        <span className="mt-1.5 block text-[13px] font-normal leading-5 text-[var(--ink)]">
          → {finding.move}
        </span>
      ) : null}
      {finding.actor && tier >= 3 ? (
        <span className="mt-1 block text-[13px] text-[var(--ink-2)]">
          {finding.actor.type === "person" && !linked ? (
            <EntityLink type="person" id={finding.actor.id}>
              {finding.actor.label}
            </EntityLink>
          ) : (
            finding.actor.label
          )}
        </span>
      ) : null}
    </>
  );

  const body = compact ? compactBody : fullBody;

  return (
    <article className={compact ? "" : "px-4 py-4"}>
      {linked ? (
        <Link href={finding.href} className="block">
          {body}
        </Link>
      ) : (
        <div>{body}</div>
      )}
      {spark}
      {status ? (
        <p className="mt-2">
          {status === "Yours" ? (
            <span className="inline-flex min-h-7 items-center rounded-full border border-[var(--tile-border)] bg-[var(--surface)] px-2.5 text-[12px] font-normal text-[var(--ink)]">
              Yours
            </span>
          ) : (
            <span className="text-[12px] leading-4 text-[var(--ink-2)]">
              {status}
            </span>
          )}
        </p>
      ) : null}
      {finding.note ? (
        <p className="mt-1 text-[13px] leading-[18px] text-[var(--ink-2)]">
          {finding.note}
        </p>
      ) : null}
      {actions ? (
        <TriageBar
          finding={finding}
          copyText={exportFindingMarkdown(finding)}
          compact={compact}
        />
      ) : null}
      {actions && !compact ? (
        <SourceLink refs={finding.provenance} compact />
      ) : null}
    </article>
  );
}

function statusLine(finding: Finding): string | null {
  if (finding.snoozeBroke) {
    const why =
      finding.snoozeBroke === "worsened"
        ? "it got worse"
        : finding.snoozeBroke === "source"
          ? "the source moved"
          : "the hold ended";
    return `Back: ${why}`;
  }
  const mine = finding.owner ? "Yours" : null;
  if (finding.disposition === "snoozed" && finding.snoozeUntil) {
    const until = formatHoldUntil(finding.snoozeUntil);
    const held = until ? `Held until ${until}` : "Held";
    return mine ? `Yours · ${held.toLowerCase()}` : held;
  }
  if (finding.disposition === "actioned") return "Cleared";
  if (finding.disposition === "dismissed") return "Skipped";
  if (mine) return mine;
  return null;
}
