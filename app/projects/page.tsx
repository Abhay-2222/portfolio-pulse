import Link from "next/link";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { BentoCard } from "@/components/ui/BentoCard";
import { ExpandableTile } from "@/components/ui/ExpandableTile";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { formatAsOf, money, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ rag?: string; status?: string }>;
}) {
  const params = await searchParams;
  const payload = await getPortfolioPayload();
  const projects = new Map(
    payload.dataset.projects.map((p) => [p.ProjectID, p]),
  );
  const clients = new Map(payload.dataset.clients.map((c) => [c.ClientID, c]));

  let rows = payload.metrics.projects.map((m) => ({
    metrics: m,
    project: projects.get(m.ProjectID)!,
    client: clients.get(projects.get(m.ProjectID)!.ClientID)?.ClientName ?? "",
  }));

  const statusFilter = params.status ?? "Active";
  if (statusFilter !== "All") {
    rows = rows.filter((r) => r.project.Status === statusFilter);
  }

  if (params.rag === "attention") {
    rows = rows.filter(
      (r) => r.metrics.OverallRAG === "Red" || r.metrics.OverallRAG === "Amber",
    );
  } else if (params.rag) {
    rows = rows.filter((r) => r.metrics.OverallRAG === params.rag);
  }

  rows.sort((a, b) => {
    const rank = (r: string) =>
      r === "Red" ? 0 : r === "Amber" ? 1 : r === "Green" ? 2 : 3;
    const d = rank(a.metrics.OverallRAG) - rank(b.metrics.OverallRAG);
    if (d !== 0) return d;
    return (a.metrics.HealthScore ?? 999) - (b.metrics.HealthScore ?? 999);
  });

  const chips = [
    { label: "Active", href: "/projects?status=Active" },
    { label: "Attention", href: "/projects?status=Active&rag=attention" },
    { label: "Off track", href: "/projects?status=Active&rag=Red" },
    { label: "All", href: "/projects?status=All" },
  ];

  return (
    <AppShell
      active="projects"
      title="Projects"
      asOf={formatAsOf(payload.asOfDate)}
    >
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--tile-border)] bg-[var(--surface)] px-4 text-[14px] text-[var(--ink-2)]"
          >
            {c.label}
          </Link>
        ))}
      </div>

      <BentoCard label="Portfolio">
        <p className="text-[15px] text-[var(--ink-2)]">
          {rows.length} project{rows.length === 1 ? "" : "s"} ·{" "}
          {money(payload.metrics.portfolio.activeContractValue)} contract value.
          Tap a tile to expand.
        </p>
      </BentoCard>

      <div className="space-y-2">
        {rows.map((row) => (
          <ExpandableTile
            key={row.project.ProjectID}
            summary={
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold leading-5">
                    {row.project.ProjectName}
                  </div>
                  <div className="truncate text-[12px] text-[var(--ink-2)]">
                    {row.client} · {row.project.Portfolio}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusGlyph rag={row.metrics.OverallRAG} />
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color:
                        row.metrics.ForecastMarginPct < 0
                          ? "var(--off-track-text)"
                          : "var(--ink)",
                    }}
                  >
                    {pct(row.metrics.ForecastMarginPct)}
                  </span>
                </div>
              </div>
            }
            detail={
              <div className="space-y-2">
                <p>
                  Health {row.metrics.HealthScore ?? "—"} · slip{" "}
                  {row.metrics.ScheduleSlipDays}d · contract{" "}
                  {money(row.metrics.CurrentContractValue)}
                </p>
                <p>
                  Cost {row.metrics.CostRAG} · Schedule{" "}
                  {row.metrics.ScheduleRAG} · Margin {row.metrics.MarginRAG}
                </p>
                <Link
                  href={`/projects/${row.project.ProjectID}`}
                  className="inline-flex font-semibold text-[var(--accent)]"
                >
                  Open project →
                </Link>
              </div>
            }
          />
        ))}
        {rows.length === 0 ? (
          <BentoCard label="Empty">
            <p className="text-[15px] text-[var(--ink-2)]">
              No projects match these filters.{" "}
              <Link href="/projects" className="font-semibold text-[var(--accent)]">
                Clear filters
              </Link>
              .
            </p>
          </BentoCard>
        ) : null}
      </div>
    </AppShell>
  );
}
