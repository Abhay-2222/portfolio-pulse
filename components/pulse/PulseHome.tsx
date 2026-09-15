import Link from "next/link";
import type { PortfolioPayload } from "@/lib/data/portfolio-service";
import { ProjectBentoCarousel } from "@/components/pulse/ProjectBentoCarousel";
import { AppShell } from "@/components/shell/AppShell";
import {
  MagicBentoCard,
  MagicBentoGrid,
} from "@/components/react-bits/MagicBento";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { formatAsOf, moneyExact, pct, pts } from "@/lib/format";
import { worstLegLabel } from "@/lib/metrics/rag";
import { lastSnapshotAgeDays, snapshotSpark } from "@/lib/metrics/derived";
import { BookMore } from "@/components/book/BookMore";
import { hasBookMore } from "@/lib/data/coverage";

export function PulseHome({ payload }: { payload: PortfolioPayload }) {
  const kpis = payload.metrics.portfolio;
  const projects = new Map(
    payload.dataset.projects.map((p) => [p.ProjectID, p]),
  );

  const rankRag = (r: string) =>
    r === "Red" ? 0 : r === "Amber" ? 1 : r === "Green" ? 2 : 3;
  const bentoProjects = payload.metrics.projects
    .filter((m) => projects.get(m.ProjectID)?.Status === "Active")
    .slice()
    .sort((a, b) => {
      const d = rankRag(a.OverallRAG) - rankRag(b.OverallRAG);
      if (d !== 0) return d;
      return (a.HealthScore ?? 999) - (b.HealthScore ?? 999);
    })
    .map((m) => {
      const project = projects.get(m.ProjectID);
      return {
        id: m.ProjectID,
        name: project?.ProjectName ?? m.ProjectID,
        client:
          payload.dataset.clients.find(
            (c) => c.ClientID === project?.ClientID,
          )?.ClientName ?? "",
        health: m.HealthScore,
        margin: m.marginReady ? m.ForecastMarginPct : null,
        targetMargin: project?.TargetMarginPct ?? 0,
        contract: m.marginReady ? m.CurrentContractValue : null,
        slip: m.scheduleReady ? m.ScheduleSlipDays : null,
        rag: m.OverallRAG,
        worstLeg: worstLegLabel(m),
        costRag: m.CostRAG,
        scheduleRag: m.ScheduleRAG,
        marginRag: m.MarginRAG,
        unbilled: m.UnbilledWIP,
        spark: snapshotSpark(payload.dataset, m.ProjectID).map((s) => s.margin),
      };
    });

  const uninvoiced = payload.derived.uninvoicedMilestones
    .slice()
    .sort((a, b) => b.amount - a.amount);
  const uninvoicedSum = uninvoiced.reduce((s, r) => s + r.amount, 0);
  const biggest = uninvoiced[0];
  const marginGap = kpis.forecastMarginPct - kpis.weightedTargetMargin;

  const activeIds = payload.dataset.projects
    .filter((p) => p.Status === "Active")
    .map((p) => p.ProjectID);
  const staleN = activeIds.filter((id) => {
    const age = lastSnapshotAgeDays(payload.dataset, id);
    return age == null || age >= 30;
  }).length;

  return (
    <AppShell
      active="pulse"
      title="Home"
      asOf={formatAsOf(payload.asOfDate)}
      refreshMinutes={payload.dataset.settings.AutoRefreshMinutes}
    >
      <p className="px-1 text-[12px] leading-4 text-[var(--ink-2)]">
        Source ·{" "}
        <Link href="/book" className="text-[var(--accent)]">
          {payload.book.label}
        </Link>
        {" · "}
        <Link href="/guide" className="text-[var(--accent)]">
          Guide
        </Link>
        {payload.book.href ? (
          <>
            {" · "}
            <a
              href={payload.book.href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)]"
            >
              Open
            </a>
          </>
        ) : null}
      </p>

      <ProjectBentoCarousel projects={bentoProjects} />

      <section className="space-y-3" aria-labelledby="book-label">
        <div className="px-1">
          <p id="book-label" className="kicker">
            The book
          </p>
          <p className="mt-1 text-[12px] leading-4 text-[var(--ink-2)]">
            Across every active project, not the one above.
          </p>
        </div>
        <MagicBentoGrid>
          <MagicBentoCard
            label="Uninvoiced"
            span="2x1"
            href="/money?focus=uninvoiced"
            className="bg-[var(--surface-2)]"
          >
          <div
            className="figure"
            style={{
              color:
                uninvoicedSum > 0 ? "var(--off-track-text)" : "var(--ink)",
            }}
          >
            {moneyExact(uninvoicedSum)}
          </div>
          <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
            {uninvoiced.length === 1
              ? "1 billing milestone never invoiced"
              : `${uninvoiced.length} billing milestones never invoiced`}
            {biggest ? ` · ${biggest.MilestoneName}` : ""}
          </p>
        </MagicBentoCard>

        <MagicBentoCard
          label="Forecast margin"
          href="/money"
          className="bg-[var(--hero)]"
        >
          <div className="figure">
            {pct(kpis.forecastMarginPct)}
          </div>
          <p
            className={`mt-1.5 text-[12px] leading-4 ${
              marginGap < 0
                ? "text-[var(--off-track-text)]"
                : "text-[var(--ink-2)]"
            }`}
          >
            {pts(marginGap)} vs {pct(kpis.weightedTargetMargin)}
          </p>
        </MagicBentoCard>

        <MagicBentoCard label="Active book" span="3x1">
          <div className="grid grid-cols-3 gap-2">
            <CountBlock
              href="/projects?status=Active&rag=Red"
              n={kpis.offTrack}
              label="off track"
              rag="Red"
            />
            <CountBlock
              href="/projects?status=Active&rag=attention"
              n={kpis.watch}
              label="watch"
              rag="Amber"
            />
            <CountBlock
              href="/projects?status=Active"
              n={kpis.onTrack}
              label="on track"
              rag="Green"
            />
          </div>
        </MagicBentoCard>

        {staleN > 0 ? (
          <MagicBentoCard
            label="Freshness"
            href="/projects?status=Active"
            className="bg-[var(--surface-2)]"
          >
            <div className="figure">
              {staleN}
            </div>
            <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
              {staleN} of {activeIds.length} active projects have no snapshot
              in 30+ days.
            </p>
          </MagicBentoCard>
        ) : null}
        </MagicBentoGrid>
        {hasBookMore(payload.coverage) ? (
          <BookMore coverage={payload.coverage} />
        ) : null}
      </section>
    </AppShell>
  );
}

function CountBlock({
  href,
  n,
  label,
  rag,
}: {
  href: string;
  n: number;
  label: string;
  rag: "Red" | "Amber" | "Green";
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-1.5 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface)] px-2.5"
    >
      <StatusGlyph rag={rag} size={12} />
      <span className="text-[17px] font-normal leading-none tracking-[-0.03em]">
        {n}
      </span>
      <span className="text-[12px] text-[var(--ink-2)]">{label}</span>
    </Link>
  );
}
