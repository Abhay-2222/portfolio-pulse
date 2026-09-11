import Link from "next/link";
import type { PortfolioPayload } from "@/lib/data/portfolio-service";
import { Spectrum } from "@/components/pulse/Spectrum";
import { AppShell } from "@/components/shell/AppShell";
import { BentoCard, MetricStat } from "@/components/ui/BentoCard";
import { ExpandableTile, TileGrid } from "@/components/ui/ExpandableTile";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { formatAsOf, money, pct, pts } from "@/lib/format";

function briefing(kpis: PortfolioPayload["metrics"]["portfolio"]): string {
  const gap = kpis.forecastMarginPct - kpis.weightedTargetMargin;
  if (kpis.offTrack > 0) {
    return `${kpis.offTrack} projects are off track and forecast margin is ${Math.abs(gap * 100).toFixed(1)} points ${gap < 0 ? "below" : "above"} target.`;
  }
  if (kpis.watch > 0) {
    return `${kpis.watch} projects need a watch, and forecast margin is ${pct(kpis.forecastMarginPct)}.`;
  }
  return `Everything is on track. Forecast margin is ${pct(kpis.forecastMarginPct)}.`;
}

export function PulseHome({ payload }: { payload: PortfolioPayload }) {
  const kpis = payload.metrics.portfolio;
  const projects = new Map(
    payload.dataset.projects.map((p) => [p.ProjectID, p]),
  );
  const clients = new Map(payload.dataset.clients.map((c) => [c.ClientID, c]));
  const peopleById = new Map(
    payload.dataset.resources.map((r) => [r.EmployeeID, r]),
  );

  const attention = payload.metrics.projects
    .filter((m) => {
      const p = projects.get(m.ProjectID);
      return (
        p?.Status === "Active" &&
        (m.OverallRAG === "Red" || m.OverallRAG === "Amber")
      );
    })
    .sort((a, b) => {
      const rank = (r: string) => (r === "Red" ? 0 : r === "Amber" ? 1 : 2);
      const d = rank(a.OverallRAG) - rank(b.OverallRAG);
      if (d !== 0) return d;
      return (a.HealthScore ?? 999) - (b.HealthScore ?? 999);
    })
    .slice(0, 6);

  const spectrumProjects = payload.metrics.projects
    .filter((m) => projects.get(m.ProjectID)?.Status === "Active")
    .map((m) => ({
      id: m.ProjectID,
      name: projects.get(m.ProjectID)?.ProjectName ?? m.ProjectID,
      health: m.HealthScore ?? 0,
      value: m.CurrentContractValue,
      rag: m.OverallRAG,
    }));

  const marginGap = kpis.forecastMarginPct - kpis.weightedTargetMargin;

  const thinMargin = payload.metrics.projects
    .filter((m) => projects.get(m.ProjectID)?.Status === "Active")
    .sort((a, b) => a.ForecastMarginPct - b.ForecastMarginPct)
    .slice(0, 4);

  const overPeople = payload.metrics.resources
    .filter((r) => r.UtilizationStatus === "Overallocated")
    .slice(0, 4);

  const openRisks = payload.dataset.raid
    .filter((r) => r.Status !== "Closed")
    .slice(0, 4);

  return (
    <AppShell active="pulse" title="Pulse" asOf={formatAsOf(payload.asOfDate)}>
      <BentoCard label="Briefing">
        <p className="text-[22px] font-semibold leading-[28px] tracking-[-0.02em] md:text-[26px] md:leading-[32px]">
          {briefing(kpis)}
        </p>
        <div className="mt-5">
          <Spectrum projects={spectrumProjects} />
          <div className="mt-3 flex flex-wrap gap-4 text-[14px]">
            <CountChip href="/projects?rag=Red" n={kpis.offTrack} label="off track" rag="Red" />
            <CountChip href="/projects?rag=Amber" n={kpis.watch} label="watch" rag="Amber" />
            <CountChip href="/projects?rag=Green" n={kpis.onTrack} label="on track" rag="Green" />
          </div>
        </div>
      </BentoCard>

      <div className="grid grid-cols-2 gap-3">
        <BentoCard label="Situation" tone="soft">
          <div className="space-y-4">
            <MetricStat value={String(kpis.activeProjects)} unit="Active projects" />
            <MetricStat value={money(kpis.activeContractValue)} unit="Contract value" />
          </div>
        </BentoCard>
        <BentoCard label="Outcome" tone="accent">
          <MetricStat
            value={pct(kpis.forecastMarginPct, 0)}
            unit="Forecast margin"
            inverted
          />
          <p className="mt-4 text-[13px] leading-snug text-white/75">
            {pts(marginGap)} vs target · health{" "}
            {Math.round(kpis.averageHealthScore)}
          </p>
        </BentoCard>
      </div>

      <BentoCard label="Key decisions">
        <p className="mb-3 text-[13px] text-[var(--ink-2)]">
          Tap a tile to expand the detail.
        </p>
        <TileGrid>
          <ExpandableTile
            summary={
              <TileSummary
                title={`${kpis.offTrack} off-track projects`}
                subtitle="Stabilize delivery first"
              />
            }
            detail={
              <div className="space-y-2">
                <p>
                  Start with Red RAG work and clear the next milestone or cost
                  recovery action.
                </p>
                <Link href="/projects?rag=Red" className="font-semibold text-[var(--accent)]">
                  Open off-track projects →
                </Link>
              </div>
            }
          />
          <ExpandableTile
            summary={
              <TileSummary
                title={`${money(kpis.overdueReceivables)} overdue AR`}
                subtitle="Cash collection"
              />
            }
            detail={
              <div className="space-y-2">
                <p>
                  {money(kpis.outstandingReceivables)} outstanding overall.
                  Chase aging invoices before unbilled WIP grows.
                </p>
                <Link href="/money?focus=overdue" className="font-semibold text-[var(--accent)]">
                  Open overdue receivables →
                </Link>
              </div>
            }
          />
          <ExpandableTile
            summary={
              <TileSummary
                title={`${kpis.overallocated} overallocated people`}
                subtitle="Capacity rebalance"
              />
            }
            detail={
              <div className="space-y-2">
                <p>
                  {Math.round(kpis.benchCapacityHrs)} hrs/week free elsewhere.
                  Move load before schedule slip compounds.
                </p>
                <Link
                  href="/people?status=Overallocated"
                  className="font-semibold text-[var(--accent)]"
                >
                  Open people →
                </Link>
              </div>
            }
          />
          <ExpandableTile
            summary={
              <TileSummary
                title={`${kpis.openCriticalRisks} critical risks`}
                subtitle="Protect margin"
              />
            }
            detail={
              <div className="space-y-2">
                <p>
                  Weighted open exposure {money(kpis.weightedOpenRiskExposure)}.
                  {kpis.pendingChangeRequests > 0
                    ? ` ${kpis.pendingChangeRequests} pending CRs (${money(kpis.pendingChangeRequestCost)}).`
                    : null}
                </p>
                <Link href="/risks" className="font-semibold text-[var(--accent)]">
                  Open risks →
                </Link>
              </div>
            }
          />
        </TileGrid>
      </BentoCard>

      <BentoCard label="Needs attention">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--ink-2)]">
            Expand a project for the quick read.
          </p>
          <Link
            href="/projects?rag=attention"
            className="shrink-0 text-[13px] font-semibold text-[var(--accent)]"
          >
            Show all
          </Link>
        </div>
        <div className="space-y-2">
          {attention.map((m) => {
            const p = projects.get(m.ProjectID)!;
            return (
              <ExpandableTile
                key={m.ProjectID}
                summary={
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold leading-5">
                        {p.ProjectName}
                      </div>
                      <div className="truncate text-[12px] text-[var(--ink-2)]">
                        {clients.get(p.ClientID)?.ClientName ?? ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusGlyph rag={m.OverallRAG} />
                      <span
                        className="text-[13px] font-semibold"
                        style={{
                          color:
                            m.ForecastMarginPct < 0
                              ? "var(--off-track-text)"
                              : "var(--ink)",
                        }}
                      >
                        {pct(m.ForecastMarginPct)}
                      </span>
                    </div>
                  </div>
                }
                detail={
                  <div className="space-y-2">
                    <p>
                      Health {m.HealthScore ?? "—"} · slip {m.ScheduleSlipDays}d
                      · contract {money(m.CurrentContractValue)}
                    </p>
                    <p>
                      Cost {m.CostRAG} · Schedule {m.ScheduleRAG} · Margin{" "}
                      {m.MarginRAG}
                    </p>
                    <Link
                      href={`/projects/${m.ProjectID}`}
                      className="inline-flex font-semibold text-[var(--accent)]"
                    >
                      Open project →
                    </Link>
                  </div>
                }
              />
            );
          })}
        </div>
      </BentoCard>

      <BentoCard label="Money">
        <TileGrid>
          <ExpandableTile
            summary={
              <TileSummary
                title={`Margin ${pct(kpis.forecastMarginPct)}`}
                subtitle={pts(marginGap)}
              />
            }
            detail={
              <div className="space-y-2">
                <p>Thinnest active margins right now:</p>
                <ul className="space-y-1">
                  {thinMargin.map((m) => (
                    <li key={m.ProjectID}>
                      <Link
                        href={`/projects/${m.ProjectID}`}
                        className="text-[var(--accent)]"
                      >
                        {projects.get(m.ProjectID)?.ProjectName}:{" "}
                        {pct(m.ForecastMarginPct)}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/money" className="font-semibold text-[var(--accent)]">
                  Open Money →
                </Link>
              </div>
            }
          />
          <ExpandableTile
            summary={
              <TileSummary
                title={`Unbilled ${money(kpis.unbilledWipActive)}`}
                subtitle={`EAC ${money(kpis.eacActive)}`}
              />
            }
            detail={
              <div className="space-y-2">
                <p>
                  Budget {money(kpis.activeBudget)} · spent{" "}
                  {money(kpis.actualCostActive)}. Convert earned work to
                  invoices where milestones allow.
                </p>
                <Link
                  href="/money?focus=unbilled"
                  className="font-semibold text-[var(--accent)]"
                >
                  Open unbilled →
                </Link>
              </div>
            }
          />
        </TileGrid>
      </BentoCard>

      <BentoCard label="People & risks">
        <TileGrid>
          <ExpandableTile
            summary={
              <TileSummary
                title={`${kpis.overallocated} overallocated`}
                subtitle={`${Math.round(kpis.benchCapacityHrs)} hrs free`}
              />
            }
            detail={
              <ul className="space-y-1">
                {overPeople.length === 0 ? (
                  <li>No overallocated people right now.</li>
                ) : (
                  overPeople.map((r) => (
                    <li key={r.EmployeeID}>
                      <Link
                        href={`/people/${r.EmployeeID}`}
                        className="text-[var(--accent)]"
                      >
                        {peopleById.get(r.EmployeeID)?.FullName ?? r.EmployeeID}{" "}
                        · {pct(r.CurrentAllocationPct, 0)}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            }
          />
          <ExpandableTile
            summary={
              <TileSummary
                title={`${kpis.overdueMilestones} overdue milestones`}
                subtitle={`${openRisks.length} open RAID shown`}
              />
            }
            detail={
              <ul className="space-y-1">
                {openRisks.length === 0 ? (
                  <li>No open RAID items.</li>
                ) : (
                  openRisks.map((r) => (
                    <li key={r.RAIDID}>
                      <Link
                        href={`/projects/${r.ProjectID}`}
                        className="text-[var(--accent)]"
                      >
                        {r.Title}
                      </Link>
                    </li>
                  ))
                )}
                <li>
                  <Link href="/risks" className="font-semibold text-[var(--accent)]">
                    Open Risks →
                  </Link>
                </li>
              </ul>
            }
          />
        </TileGrid>
      </BentoCard>
    </AppShell>
  );
}

function TileSummary({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="text-[14px] font-semibold leading-5">{title}</div>
      <div className="mt-0.5 text-[12px] text-[var(--ink-2)]">{subtitle}</div>
    </div>
  );
}

function CountChip({
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
    <Link href={href} className="inline-flex min-h-10 items-center gap-2">
      <StatusGlyph rag={rag} />
      <span className="font-semibold text-[var(--accent)]">{n}</span>
      <span className="text-[var(--ink-2)]">{label}</span>
    </Link>
  );
}
