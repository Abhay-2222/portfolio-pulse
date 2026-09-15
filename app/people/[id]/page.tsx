import { notFound } from "next/navigation";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { CopyBriefButton } from "@/components/ui/CopyBriefButton";
import { ExpandableTile } from "@/components/ui/ExpandableTile";
import { CardStack, EntityCard, ragTone } from "@/components/ui/ListCard";
import { EntityLink } from "@/components/ui/EntityLink";
import { capTier4, findingsForSubject } from "@/lib/findings";
import { FindingCard } from "@/components/overlay/FindingCard";
import { exportFindingMarkdown } from "@/lib/overlay/export";
import { isQueueFinding } from "@/lib/overlay/apply";
import { formatAsOf, formatDate, money, pct } from "@/lib/format";
import { StatGrid } from "@/components/ui/StatGrid";

export const dynamic = "force-dynamic";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getPortfolioPayload();
  const resource = payload.dataset.resources.find((r) => r.EmployeeID === id);
  if (!resource) notFound();

  const metrics = payload.metrics.resources.find((m) => m.EmployeeID === id)!;
  const projects = new Map(
    payload.dataset.projects.map((p) => [p.ProjectID, p]),
  );
  const projectMetrics = new Map(
    payload.metrics.projects.map((m) => [m.ProjectID, m]),
  );

  const asOf = new Date(payload.asOfDate);
  const allocations = payload.dataset.allocations
    .filter((a) => a.EmployeeID === id)
    .sort((a, b) => b.EndDate.getTime() - a.EndDate.getTime());

  const current = allocations.filter(
    (a) =>
      a.StartDate.getTime() <= asOf.getTime() &&
      asOf.getTime() <= a.EndDate.getTime(),
  );

  const manager = resource.ManagerID
    ? payload.dataset.resources.find((r) => r.EmployeeID === resource.ManagerID)
    : null;

  const pin = [
    "people.overallocated_with_swap",
    "money.milestone_passed_unbilled",
    "money.margin_below_floor",
  ];
  const findings = capTier4(
    findingsForSubject(payload.findings, "person", id).filter(isQueueFinding),
  )
    .slice()
    .sort((a, b) => {
      const ia = pin.indexOf(a.ruleId);
      const ib = pin.indexOf(b.ruleId);
      const pa = ia === -1 ? 99 : ia;
      const pb = ib === -1 ? 99 : ib;
      if (pa !== pb) return pa - pb;
      return (b.amount ?? 0) - (a.amount ?? 0);
    })
    .slice(0, 4);
  const copy = [
    `# ${resource.FullName}`,
    findings.map((f) => exportFindingMarkdown(f)).join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <AppShell
      active="people"
      title={resource.FullName}
      asOf={formatAsOf(payload.asOfDate)}
      backHref="/people"
    >
      <section className="card-tile">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kicker">
              {resource.Level} · {resource.Location} · {resource.Department}
            </p>
            <p className="mt-1 text-[16px] font-normal leading-5 tracking-[-0.02em]">
              {resource.Role}
            </p>
            {manager ? (
              <>
                <p className="mt-3 kicker">Manager</p>
                <p className="mt-0.5 text-[15px] font-normal leading-5 text-[var(--ink)]">
                  <EntityLink
                    type="person"
                    id={manager.EmployeeID}
                    className="text-[15px] font-normal text-[var(--ink)]"
                  >
                    {manager.FullName}
                  </EntityLink>
                </p>
              </>
            ) : null}
            <p className="mt-3 text-[12px] leading-4 text-[var(--ink-2)]">
              Capacity {resource.WeeklyCapacityHrs}h/wk · Started{" "}
              {formatDate(resource.StartDate)}
            </p>
          </div>
          <CopyBriefButton text={copy} />
        </div>
        <div className="mt-3">
          <ExpandableTile
            summary={
              <span className="text-[13px] font-normal">
                Cost and bill rates (hidden by default)
              </span>
            }
            detail={
              <p>
                Cost {money(resource.CostRateHr)}/hr · Bill{" "}
                {money(resource.BillRateHr)}/hr. Shown only when you ask.
              </p>
            }
          />
        </div>
      </section>
      <StatGrid
        cells={[
          {
            label: "Allocation",
            value: pct(metrics.CurrentAllocationPct, 0),
            tone:
              metrics.UtilizationStatus === "Overallocated" ? "bad" : "neutral",
          },
          { label: "Status", value: metrics.UtilizationStatus },
          {
            label: "Free this week",
            value: `${metrics.AvailableHrsPerWeek}h`,
          },
          {
            label: "Billable YTD",
            value: `${Math.round(metrics.BillableHoursYTD)}h`,
          },
        ]}
      />

      {findings.length > 0 ? (
        <section className="space-y-2">
          <p className="kicker px-1">Urgent</p>
          <CardStack>
            {findings.map((f) => (
              <div
                key={f.id}
                className="card-tile card-tile--bad"
              >
                <FindingCard
                  finding={f}
                  linked={false}
                  compact
                />
              </div>
            ))}
          </CardStack>
        </section>
      ) : null}

      <Section title="Current allocations">
        {current.length === 0 ? (
          <Empty>No active allocations as of {formatAsOf(payload.asOfDate)}.</Empty>
        ) : (
          <CardStack>
            {current.map((a) => {
              const project = projects.get(a.ProjectID);
              const pm = projectMetrics.get(a.ProjectID);
              return (
                <EntityCard
                  key={a.AllocationID}
                  href={`/projects/${a.ProjectID}`}
                  kicker={a.ProjectRole}
                  title={project?.ProjectName ?? a.ProjectID}
                  meta={`through ${formatDate(a.EndDate)}`}
                  rag={pm?.OverallRAG}
                  tone={ragTone(pm?.OverallRAG)}
                  figure={pct(a.AllocationPct, 0)}
                  figureLabel="Here"
                />
              );
            })}
          </CardStack>
        )}
      </Section>

      <Section title="All assignments">
        {allocations.length === 0 ? (
          <Empty>No allocation history.</Empty>
        ) : (
          <CardStack>
            {allocations.slice(0, 12).map((a) => {
              const project = projects.get(a.ProjectID);
              return (
                <EntityCard
                  key={a.AllocationID}
                  href={`/projects/${a.ProjectID}`}
                  kicker={`${formatDate(a.StartDate)} to ${formatDate(a.EndDate)}`}
                  title={project?.ProjectName ?? a.ProjectID}
                  figure={pct(a.AllocationPct, 0)}
                  figureLabel="Alloc"
                />
              );
            })}
          </CardStack>
        )}
      </Section>
    </AppShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[15px] font-normal leading-5">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card-tile text-[15px] text-[var(--ink-2)]">{children}</p>;
}
