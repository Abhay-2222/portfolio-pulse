import Link from "next/link";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { FilterChips } from "@/components/ui/FilterChips";
import { CardStack, EntityCard, ragTone } from "@/components/ui/ListCard";
import { computeMilestoneStatus } from "@/lib/metrics/finance";
import { worstLegLabel } from "@/lib/metrics/rag";
import { formatAsOf, money, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ rag?: string; status?: string; slip?: string }>;
}) {
  const params = await searchParams;
  const payload = await getPortfolioPayload();
  const projects = new Map(
    payload.dataset.projects.map((p) => [p.ProjectID, p]),
  );
  const clients = new Map(payload.dataset.clients.map((c) => [c.ClientID, c]));
  const overdueDelivery = new Set(
    payload.dataset.milestones
      .filter(
        (m) =>
          m.IsBillingMilestone !== "Yes" &&
          computeMilestoneStatus(m, payload.dataset) === "Overdue",
      )
      .map((m) => m.ProjectID),
  );

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

  if (params.slip === "overdue") {
    rows = rows.filter((r) => overdueDelivery.has(r.project.ProjectID));
  }

  rows.sort((a, b) => {
    const rank = (r: string) =>
      r === "Red" ? 0 : r === "Amber" ? 1 : r === "Green" ? 2 : 3;
    const d = rank(a.metrics.OverallRAG) - rank(b.metrics.OverallRAG);
    if (d !== 0) return d;
    return (a.metrics.HealthScore ?? 999) - (b.metrics.HealthScore ?? 999);
  });

  const chips = [
    {
      label: "Active",
      href: "/projects?status=Active",
      active: statusFilter === "Active" && !params.rag && params.slip !== "overdue",
    },
    {
      label: "Attention",
      href: "/projects?status=Active&rag=attention",
      active: params.rag === "attention",
    },
    {
      label: "Off track",
      href: "/projects?status=Active&rag=Red",
      active: params.rag === "Red" && params.slip !== "overdue",
    },
    {
      label: "Dates",
      href: "/projects?status=Active&slip=overdue",
      active: params.slip === "overdue",
    },
    {
      label: "Pipeline",
      href: "/projects?status=Planned",
      active: statusFilter === "Planned",
    },
  ];

  const n = rows.length;
  const countCopy =
    params.slip === "overdue"
      ? `${n} with overdue milestone${n === 1 ? "" : "s"}`
      : params.rag === "attention"
        ? `${n} need attention — red and amber`
        : params.rag === "Red"
          ? `${n} off track`
          : statusFilter === "Planned"
            ? `${n} in pipeline`
            : `${n} active · ${money(payload.metrics.portfolio.activeContractValue)} contract`;

  return (
    <AppShell
      active="projects"
      title="Projects"
      asOf={formatAsOf(payload.asOfDate)}
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 text-[13px] text-[var(--ink-2)]">{countCopy}</p>
        <FilterChips label="Projects" chips={chips} />
      </div>

      <CardStack>
        {rows.map((row) => {
          const worst =
            row.metrics.OverallRAG === "N/A"
              ? "—"
              : row.metrics.OverallRAG === "Red" ||
                  row.metrics.OverallRAG === "Amber"
                ? worstLegLabel(row.metrics)
                : "on track";
          const meta = [
            worst,
            row.metrics.scheduleReady && row.metrics.ScheduleSlipDays > 0
              ? `${row.metrics.ScheduleSlipDays}d slip`
              : row.metrics.scheduleReady
                ? null
                : "slip —",
            row.metrics.marginReady
              ? money(row.metrics.CurrentContractValue)
              : "contract —",
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <EntityCard
              key={row.project.ProjectID}
              href={`/projects/${row.project.ProjectID}`}
              kicker={row.client}
              title={row.project.ProjectName}
              meta={meta}
              rag={row.metrics.OverallRAG}
              tone={ragTone(row.metrics.OverallRAG)}
              figure={
                row.metrics.marginReady
                  ? pct(row.metrics.ForecastMarginPct)
                  : "—"
              }
              figureLabel="Margin"
              figureTone={
                row.metrics.marginReady && row.metrics.ForecastMarginPct < 0
                  ? "bad"
                  : "neutral"
              }
            />
          );
        })}
        {rows.length === 0 ? (
          <p className="card-tile text-[15px] text-[var(--ink-2)]">
            No projects match these filters.{" "}
            <Link href="/projects" className="font-normal text-[var(--accent)]">
              Clear filters
            </Link>
            .
          </p>
        ) : null}
      </CardStack>
    </AppShell>
  );
}
