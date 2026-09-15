import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { computeRaidMetrics } from "@/lib/metrics/risk";
import { FilterChips } from "@/components/ui/FilterChips";
import { NotInBook } from "@/components/book/NotInBook";
import { formatAsOf, money } from "@/lib/format";
import { StatGrid } from "@/components/ui/StatGrid";
import { CardStack, EntityCard, ragTone, SectionLabel } from "@/components/ui/ListCard";

export const dynamic = "force-dynamic";

export default async function RisksPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; severity?: string }>;
}) {
  const params = await searchParams;
  const payload = await getPortfolioPayload();
  const kpis = payload.metrics.portfolio;
  const projects = new Map(
    payload.dataset.projects.map((p) => [p.ProjectID, p]),
  );
  const people = new Map(
    payload.dataset.resources.map((r) => [r.EmployeeID, r]),
  );

  let raid = payload.dataset.raid
    .filter((r) => r.Status !== "Closed")
    .map((item) => ({
      item,
      metrics: computeRaidMetrics(item, payload.dataset),
      project: projects.get(item.ProjectID),
      owner: people.get(item.OwnerID),
    }));

  if (params.type) {
    raid = raid.filter((r) => r.item.Type === params.type);
  }
  if (params.severity) {
    raid = raid.filter((r) => r.metrics.Severity === params.severity);
  }

  raid.sort((a, b) => {
    const rank = (s: string) =>
      s === "Critical" ? 0 : s === "High" ? 1 : s === "Medium" ? 2 : 3;
    const d = rank(a.metrics.Severity) - rank(b.metrics.Severity);
    if (d !== 0) return d;
    return b.metrics.ExpectedExposure - a.metrics.ExpectedExposure;
  });

  const chips = [
    { label: "Open", href: "/risks", active: !params.type && !params.severity },
    {
      label: "Critical",
      href: "/risks?severity=Critical",
      active: params.severity === "Critical",
    },
    { label: "Risks", href: "/risks?type=Risk", active: params.type === "Risk" },
    {
      label: "Issues",
      href: "/risks?type=Issue",
      active: params.type === "Issue",
    },
    {
      label: "Dependencies",
      href: "/risks?type=Dependency",
      active: params.type === "Dependency",
    },
    {
      label: "Assumptions",
      href: "/risks?type=Assumption",
      active: params.type === "Assumption",
    },
  ];

  const n = raid.length;
  const countCopy =
    params.severity === "Critical"
      ? `${n} critical`
      : params.type
        ? `${n} open ${params.type.toLowerCase()}s`
        : `${n} open`;

  return (
    <AppShell active="risks" title="Risks" asOf={formatAsOf(payload.asOfDate)}>
      <StatGrid
        cells={[
          {
            label: "Critical open",
            value: String(kpis.openCriticalRisks),
            tone: kpis.openCriticalRisks > 0 ? "bad" : "neutral",
          },
          {
            label: "Risk exposure",
            value: money(kpis.weightedOpenRiskExposure),
          },
        ]}
      />
      <p className="mt-2 px-1 text-[12px] leading-4 text-[var(--ink-2)]">
        Change requests live on Decisions. Overdue delivery dates are on
        Projects.
      </p>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 text-[13px] text-[var(--ink-canvas)]">{countCopy}</p>
        <FilterChips label="Risks" chips={chips} />
      </div>

      <section className="space-y-2">
        <SectionLabel kicker="Open RAID" />
        <CardStack>
          {payload.dataset.raid.length === 0 ? (
            <NotInBook view="Risks" />
          ) : raid.length === 0 ? (
            <p className="card-tile text-[13px] text-[var(--ink-2)]">
              No open items match these filters.
            </p>
          ) : (
            raid.map((row) => (
              <EntityCard
                key={row.item.RAIDID}
                href={`/risks/${row.item.RAIDID}`}
                kicker={`${row.item.Type} · ${row.metrics.Severity}`}
                title={row.item.Title}
                meta={[
                  row.project?.ProjectName ?? row.item.ProjectID,
                  row.owner?.FullName,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                rag={row.metrics.Severity}
                tone={ragTone(row.metrics.Severity)}
                figure={money(row.metrics.ExpectedExposure)}
                figureLabel="Exposure"
                figureTone={
                  row.metrics.Severity === "Critical" ? "bad" : "neutral"
                }
              />
            ))
          )}
        </CardStack>
      </section>
    </AppShell>
  );
}
