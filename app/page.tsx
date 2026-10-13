import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { requireSession } from "@/lib/pmo/auth";
import { getPortfolio } from "@/lib/pmo/queries";
import { formatAsOf } from "@/lib/format";
import { ragTone } from "@/components/ui/ListCard";

export const dynamic = "force-dynamic";

function folderTone(red: number, amber: number, watermelons: number) {
  if (red > 0) return ragTone("Red");
  if (watermelons > 0 || amber > 0) return ragTone("Amber");
  return ragTone("Green");
}

export default async function HomePage() {
  const me = await requireSession();
  const portfolio = getPortfolio(me.userId);
  const asOf = formatAsOf(portfolio.asOf);

  return (
    <AppShell
      active="pulse"
      title="Home"
      asOf={asOf}
      meName={me.name}
      refreshFailed={portfolio.refreshFailed}
    >
      <div className="px-1">
        <p className="page-title">Home</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
          {me.name} · {me.role} · {portfolio.totals.live} live projects
        </p>
      </div>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href="/briefing" className="card-tile card-tile--bad">
          <p className="kicker">Newly red</p>
          <p className="figure mt-1">{portfolio.briefing.newlyRed}</p>
        </Link>
        <Link href="/briefing" className="card-tile card-tile--watch">
          <p className="kicker">Watermelon</p>
          <p className="figure mt-1">
            {portfolio.briefing.reportedBetterThanData}
          </p>
        </Link>
        <Link href="/briefing" className="card-tile">
          <p className="kicker">Stale</p>
          <p className="figure mt-1">{portfolio.briefing.stale}</p>
        </Link>
        <Link href="/briefing" className="card-tile">
          <p className="kicker">No status</p>
          <p className="figure mt-1">{portfolio.briefing.noStatusReported}</p>
        </Link>
      </section>

      <section className="space-y-2">
        <p className="kicker px-1">Programs</p>
        {portfolio.programs.map((p) => {
          const tone = folderTone(
            p.counts.red,
            p.counts.amber,
            p.counts.reportedBetterThanData,
          );
          const cls =
            tone === "bad"
              ? "card-tile card-tile--bad"
              : tone === "watch"
                ? "card-tile card-tile--watch"
                : "card-tile card-tile--good";
          return (
            <Link
              key={p.programId}
              href={`/projects?programId=${p.programId}`}
              className={`${cls} block`}
            >
              <p className="kicker">{p.portfolioName}</p>
              <p className="mt-1 text-[16px] leading-5 tracking-[-0.02em]">
                {p.programName}
              </p>
              <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
                {p.counts.red} red · {p.counts.amber} amber · {p.counts.green}{" "}
                green · {p.counts.live} live
                {p.counts.reportedBetterThanData
                  ? ` · ${p.counts.reportedBetterThanData} watermelon`
                  : ""}
              </p>
            </Link>
          );
        })}
      </section>
    </AppShell>
  );
}
