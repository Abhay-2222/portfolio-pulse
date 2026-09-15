import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { formatAsOf } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const payload = await getPortfolioPayload();
  const minutes = payload.dataset.settings.AutoRefreshMinutes || 5;

  return (
    <AppShell
      active="guide"
      title="Guide"
      asOf={formatAsOf(payload.asOfDate)}
      refreshMinutes={minutes}
    >
      <p className="px-1 text-[13px] leading-5 text-[var(--ink-2)]">
        Pulse reads one workbook. It never writes Excel. Best on a phone.
      </p>

      <section className="card-tile space-y-3">
        <p className="kicker">The briefing</p>
        <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-5">
          <li>
            <strong>Home</strong>: your projects first, then the book. Tap a
            card to open a brief.
          </li>
          <li>
            Five tabs never change: Home, Projects, People, Money, Risks.
          </li>
          <li>
            Open a project for health, why it is that number, then Urgent
            moves.
          </li>
          <li>
            <strong>Hold</strong> parks a finding, <strong>Take it</strong>{" "}
            marks it yours, <strong>Done</strong> clears it. Notes stay in
            Pulse.
          </li>
          <li>
            Header Refresh re-reads now. Auto-refresh is every {minutes}{" "}
            minutes from Settings.
          </li>
        </ol>
      </section>

      <section className="card-tile space-y-3">
        <p className="kicker">Your file</p>
        <p className="text-[13px] leading-5 text-[var(--ink-2)]">
          Gear or{" "}
          <Link href="/book" className="text-[var(--accent)]">
            Book
          </Link>{" "}
          is where the workbook lives.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-5">
          <li>
            Start from the template if you can. Download, replace demo rows,
            keep headers, then re-upload or paste a public Sheet link.
          </li>
          <li>
            A close cousin still briefs. Pulse maps what it can. Extra sheets
            and skinny rows go to More. Missing figures stay empty, never a
            fake 0.
          </li>
          <li>
            Google Sheets need “anyone with the link.” Private Drive: download
            then upload.
          </li>
        </ol>
      </section>

      <section className="card-tile space-y-2">
        <p className="kicker">Honest limits</p>
        <p className="text-[13px] leading-5 text-[var(--ink-2)]">
          This is a briefing, not a PMO system. No login. Cost rates stay
          hidden. On the hosted demo, uploads do not survive a restart. Run
          locally or link a public Sheet. The live site briefs the shipped
          master until you add your own file.
        </p>
        <p className="text-[13px] leading-5 text-[var(--ink-2)]">
          Clone and run: see the GitHub README. Replace the demo book at{" "}
          <code className="text-[12px]">data/Enterprise_Portfolio_Data.xlsx</code>
          .
        </p>
      </section>
    </AppShell>
  );
}
