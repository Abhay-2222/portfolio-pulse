import Link from "next/link";
import type { PortfolioPayload } from "@/lib/data/portfolio-service";
import { Spectrum } from "@/components/pulse/Spectrum";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { AppShell } from "@/components/shell/AppShell";
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

function highlightBriefing(text: string) {
  return text.split(/(\d+(?:\.\d+)?(?:%| points?| pts)?)/g).map((part, i) =>
    /^\d/.test(part) ? (
      <span
        key={i}
        className="text-[var(--accent)] underline decoration-[var(--accent-tint)] underline-offset-[5px]"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function PulseHome({ payload }: { payload: PortfolioPayload }) {
  const kpis = payload.metrics.portfolio;
  const projects = new Map(
    payload.dataset.projects.map((p) => [p.ProjectID, p]),
  );
  const clients = new Map(payload.dataset.clients.map((c) => [c.ClientID, c]));

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
    .slice(0, 5);

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

  return (
    <AppShell active="pulse" title="Pulse" asOf={formatAsOf(payload.asOfDate)}>
      <section className="rounded-[28px] bg-[var(--surface)] p-5 md:p-8">
        <p className="text-[28px] font-bold leading-[34px] tracking-tight md:text-[34px] md:leading-[41px]">
          {highlightBriefing(briefing(kpis))}
        </p>
        <div className="mt-8">
          <Spectrum projects={spectrumProjects} />
          <div className="mt-4 flex flex-wrap gap-5 text-[15px]">
            <CountLink href="/projects?rag=Red" n={kpis.offTrack} label="off track" rag="Red" />
            <CountLink href="/projects?rag=Amber" n={kpis.watch} label="watch" rag="Amber" />
            <CountLink href="/projects?rag=Green" n={kpis.onTrack} label="on track" rag="Green" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <h2 className="text-[20px] font-semibold leading-[25px]">Needs attention</h2>
          <Link href="/projects?rag=attention" className="text-[15px] font-medium text-[var(--accent)]">
            Show all
          </Link>
        </div>
        <div className="overflow-hidden rounded-[14px] bg-[var(--surface)]">
          {attention.map((m, idx) => {
            const p = projects.get(m.ProjectID)!;
            return (
              <Link
                key={m.ProjectID}
                href={`/projects/${m.ProjectID}`}
                className={`flex min-h-14 items-center gap-3 px-4 py-3 ${
                  idx === attention.length - 1 ? "" : "border-b border-[var(--hairline)]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-semibold leading-[22px]">
                    {p.ProjectName}
                  </div>
                  <div className="truncate text-[15px] text-[var(--ink-2)]">
                    {clients.get(p.ClientID)?.ClientName ?? ""}
                  </div>
                </div>
                <StatusGlyph rag={m.OverallRAG} />
                <div
                  className="w-[4.5rem] text-right text-[15px] font-medium"
                  style={{
                    color:
                      m.ForecastMarginPct < 0
                        ? "var(--off-track-text)"
                        : "var(--ink)",
                  }}
                >
                  {pct(m.ForecastMarginPct)}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <h2 className="text-[20px] font-semibold leading-[25px]">Money</h2>
          <Link href="/money" className="text-[15px] font-medium text-[var(--accent)]">
            Open Money
          </Link>
        </div>
        <div className="overflow-hidden rounded-[14px] bg-[var(--surface)]">
          <MoneyLink href="/money" label="Forecast margin vs target" value={pct(kpis.forecastMarginPct)} detail={pts(marginGap)} bad={marginGap < 0} />
          <MoneyLink href="/money" label="Expected total cost vs budget" value={money(kpis.eacActive)} detail={`Budget ${money(kpis.activeBudget)}`} />
          <MoneyLink href="/money?focus=overdue" label="Overdue receivables" value={money(kpis.overdueReceivables)} detail={`of ${money(kpis.outstandingReceivables)} outstanding`} bad={kpis.overdueReceivables > 0} />
          <MoneyLink href="/money?focus=unbilled" label="Earned, not yet invoiced" value={money(kpis.unbilledWipActive)} last />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <h2 className="text-[20px] font-semibold leading-[25px]">People</h2>
          <Link href="/people?status=Overallocated" className="text-[15px] font-medium text-[var(--accent)]">
            Open People
          </Link>
        </div>
        <Link
          href="/people?status=Overallocated"
          className="block rounded-[14px] bg-[var(--surface)] px-4 py-4 text-[17px]"
        >
          <span className="font-semibold text-[var(--off-track-text)]">
            {kpis.overallocated} overallocated
          </span>
          <span className="text-[var(--ink-3)]"> · </span>
          <span>{Math.round(kpis.benchCapacityHrs)} hrs/week free</span>
        </Link>
      </section>
    </AppShell>
  );
}

function CountLink({
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
    <Link href={href} className="inline-flex min-h-11 items-center gap-2">
      <StatusGlyph rag={rag} />
      <span className="font-semibold text-[var(--accent)] underline decoration-[var(--accent-tint)] underline-offset-4">
        {n}
      </span>
      <span className="text-[var(--ink-2)]">{label}</span>
    </Link>
  );
}

function MoneyLink({
  href,
  label,
  value,
  detail,
  bad,
  last,
}: {
  href: string;
  label: string;
  value: string;
  detail?: string;
  bad?: boolean;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-14 items-center justify-between gap-4 px-4 py-3 ${
        last ? "" : "border-b border-[var(--hairline)]"
      }`}
    >
      <div>
        <div className="text-[17px] font-semibold leading-[22px]">{label}</div>
        {detail ? <div className="text-[15px] text-[var(--ink-2)]">{detail}</div> : null}
      </div>
      <div
        className="text-[17px] font-semibold"
        style={{ color: bad ? "var(--off-track-text)" : "var(--ink)" }}
      >
        {value}
      </div>
    </Link>
  );
}
