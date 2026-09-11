import Link from "next/link";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
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
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--surface)] px-4 text-[15px] text-[var(--ink-2)]"
          >
            {c.label}
          </Link>
        ))}
      </div>

      <p className="px-1 text-[15px] text-[var(--ink-2)]">
        {rows.length} project{rows.length === 1 ? "" : "s"} · portfolio{" "}
        {money(payload.metrics.portfolio.activeContractValue)}
      </p>

      <div className="overflow-hidden rounded-[14px] bg-[var(--surface)]">
        {rows.map((row, idx) => (
          <Link
            key={row.project.ProjectID}
            href={`/projects/${row.project.ProjectID}`}
            className={`flex min-h-14 items-center gap-3 px-4 py-3 ${
              idx === rows.length - 1 ? "" : "border-b border-[var(--hairline)]"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[17px] font-semibold leading-[22px]">
                {row.project.ProjectName}
              </div>
              <div className="truncate text-[15px] text-[var(--ink-2)]">
                {row.client} · {row.project.Portfolio}
              </div>
            </div>
            <StatusGlyph rag={row.metrics.OverallRAG} />
            <div className="w-12 text-right text-[15px] font-medium">
              {row.metrics.HealthScore ?? "—"}
            </div>
            <div
              className="w-[4.5rem] text-right text-[15px] font-medium"
              style={{
                color:
                  row.metrics.ForecastMarginPct < 0
                    ? "var(--off-track-text)"
                    : "var(--ink)",
              }}
            >
              {pct(row.metrics.ForecastMarginPct)}
            </div>
          </Link>
        ))}
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-[15px] text-[var(--ink-2)]">
            No projects match these filters.{" "}
            <Link href="/projects" className="text-[var(--accent)]">
              Clear filters
            </Link>
            .
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
