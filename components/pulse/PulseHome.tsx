import type { PortfolioPayload } from "@/lib/data/portfolio-service";
import type { ProjectMetrics } from "@/lib/metrics/project";
import { Spectrum } from "@/components/pulse/Spectrum";
import { StatusGlyph } from "@/components/ui/StatusGlyph";

function money(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

function pts(n: number): string {
  const v = n * 100;
  return `${v > 0 ? "+" : ""}${v.toFixed(1)} pts`;
}

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
  return text
    .split(/(\d+(?:\.\d+)?(?:%| points?| pts)?)/g)
    .map((part, i) =>
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
  const asOf = new Date(payload.asOfDate).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 border-b border-[var(--hairline)] bg-[var(--material)] [backdrop-filter:var(--material-blur)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <div>
            <p className="text-[13px] text-[var(--ink-3)]">Portfolio Pulse</p>
            <h1 className="text-[22px] font-bold leading-7 tracking-tight md:text-[28px] md:leading-[34px]">
              Pulse
            </h1>
          </div>
          <div className="text-right text-[13px] text-[var(--ink-2)]">
            <div>As of {asOf}</div>
            <a className="text-[var(--accent)]" href="/api/portfolio">
              JSON API
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:px-6 md:py-10">
        <section className="rounded-[28px] bg-[var(--surface)] p-5 md:p-8">
          <p className="text-[28px] font-bold leading-[34px] tracking-tight md:text-[34px] md:leading-[41px]">
            {highlightBriefing(briefing(kpis))}
          </p>
          <div className="mt-8">
            <Spectrum projects={spectrumProjects} />
            <div className="mt-4 flex flex-wrap gap-5 text-[15px]">
              <Count n={kpis.offTrack} label="off track" rag="Red" />
              <Count n={kpis.watch} label="watch" rag="Amber" />
              <Count n={kpis.onTrack} label="on track" rag="Green" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 px-1 text-[20px] font-semibold leading-[25px]">
            Needs attention
          </h2>
          <div className="overflow-hidden rounded-[14px] bg-[var(--surface)]">
            {attention.map((m, idx) => {
              const p = projects.get(m.ProjectID)!;
              return (
                <AttentionRow
                  key={m.ProjectID}
                  metrics={m}
                  name={p.ProjectName}
                  client={clients.get(p.ClientID)?.ClientName ?? ""}
                  last={idx === attention.length - 1}
                />
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 px-1 text-[20px] font-semibold leading-[25px]">
            Money
          </h2>
          <div className="overflow-hidden rounded-[14px] bg-[var(--surface)]">
            <MoneyRow
              label="Forecast margin vs target"
              value={pct(kpis.forecastMarginPct)}
              detail={pts(marginGap)}
              bad={marginGap < 0}
            />
            <MoneyRow
              label="Expected total cost vs budget"
              value={money(kpis.eacActive)}
              detail={`Budget ${money(kpis.activeBudget)}`}
            />
            <MoneyRow
              label="Overdue receivables"
              value={money(kpis.overdueReceivables)}
              detail={`of ${money(kpis.outstandingReceivables)} outstanding`}
              bad={kpis.overdueReceivables > 0}
            />
            <MoneyRow
              label="Earned, not yet invoiced"
              value={money(kpis.unbilledWipActive)}
              last
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 px-1 text-[20px] font-semibold leading-[25px]">
            People
          </h2>
          <div className="rounded-[14px] bg-[var(--surface)] px-4 py-4 text-[17px]">
            <span className="font-semibold text-[var(--off-track-text)]">
              {kpis.overallocated} overallocated
            </span>
            <span className="text-[var(--ink-3)]"> · </span>
            <span>{Math.round(kpis.benchCapacityHrs)} hrs/week free</span>
          </div>
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-[var(--hairline)] bg-[var(--material)] [backdrop-filter:var(--material-blur)]">
        <div className="mx-auto grid max-w-5xl grid-cols-5 px-2 py-2 text-center text-[11px] text-[var(--ink-3)]">
          {["Pulse", "Projects", "People", "Money", "Risks"].map((tab) => (
            <div
              key={tab}
              className={`rounded-[10px] px-1 py-2 ${
                tab === "Pulse"
                  ? "bg-[var(--accent-tint)] font-semibold text-[var(--accent)]"
                  : ""
              }`}
            >
              {tab}
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Count({
  n,
  label,
  rag,
}: {
  n: number;
  label: string;
  rag: "Red" | "Amber" | "Green";
}) {
  return (
    <div className="inline-flex min-h-11 items-center gap-2">
      <StatusGlyph rag={rag} />
      <span className="font-semibold">{n}</span>
      <span className="text-[var(--ink-2)]">{label}</span>
    </div>
  );
}

function AttentionRow({
  metrics,
  name,
  client,
  last,
}: {
  metrics: ProjectMetrics;
  name: string;
  client: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex min-h-14 items-center gap-3 px-4 py-3 ${
        last ? "" : "border-b border-[var(--hairline)]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-semibold leading-[22px]">
          {name}
        </div>
        <div className="truncate text-[15px] text-[var(--ink-2)]">{client}</div>
      </div>
      <StatusGlyph rag={metrics.OverallRAG} />
      <div className="w-[4.5rem] text-right text-[15px] font-medium">
        <span
          style={{
            color:
              metrics.ForecastMarginPct < 0
                ? "var(--off-track-text)"
                : "var(--ink)",
          }}
        >
          {pct(metrics.ForecastMarginPct)}
        </span>
      </div>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  detail,
  bad,
  last,
}: {
  label: string;
  value: string;
  detail?: string;
  bad?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex min-h-14 items-center justify-between gap-4 px-4 py-3 ${
        last ? "" : "border-b border-[var(--hairline)]"
      }`}
    >
      <div>
        <div className="text-[17px] font-semibold leading-[22px]">{label}</div>
        {detail ? (
          <div className="text-[15px] text-[var(--ink-2)]">{detail}</div>
        ) : null}
      </div>
      <div
        className="text-[17px] font-semibold"
        style={{ color: bad ? "var(--off-track-text)" : "var(--ink)" }}
      >
        {value}
      </div>
    </div>
  );
}
