import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { requireSession } from "@/lib/pmo/auth";
import { latestAsOf, loadFailed } from "@/lib/pmo/queries";
import { formatAsOf } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const me = await requireSession();

  return (
    <AppShell
      active="guide"
      title="Guide"
      asOf={formatAsOf(latestAsOf())}
      meName={me.name}
      refreshFailed={loadFailed()}
    >
      <p className="px-1 text-[13px] leading-5 text-[var(--ink-2)]">
        Pulse reads a PMO database. It does not write back. Health is calculated
        in SQL, not in the screen.
      </p>
      <section className="card-tile space-y-2">
        <p className="kicker">The briefing</p>
        <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-5">
          <li>
            Home is program folders. Counts tap through to Briefing.
          </li>
          <li>
            Five tabs: Home, Projects, People, Money, Risks. Briefing is not a
            sixth tab.
          </li>
          <li>
            Calculated colour comes from schedule slip, cost variance, and open
            issues. The PM&apos;s colour is compared to it.
          </li>
          <li>
            Watermelon means reported better than the data. Never treat that as
            a calm green.
          </li>
          <li>
            Stale means no PM update in 30 days. Missing reported RAG is No
            status, never Green.
          </li>
        </ol>
      </section>
      <section className="card-tile space-y-2">
        <p className="kicker">Access</p>
        <p className="text-[13px] leading-5 text-[var(--ink-2)]">
          You see only projects in your scope. Money is hidden when the account
          cannot view financials. Gear opens{" "}
          <Link href="/status" className="text-[var(--accent)]">
            Data status
          </Link>
          .
        </p>
      </section>
    </AppShell>
  );
}
