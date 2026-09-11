import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { formatAsOf, formatDate, money, pct } from "@/lib/format";

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

  return (
    <AppShell
      active="people"
      title={resource.FullName}
      asOf={formatAsOf(payload.asOfDate)}
      backHref="/people"
    >
      <section className="rounded-[28px] bg-[var(--surface)] p-5 md:p-8">
        <p className="text-[15px] text-[var(--ink-2)]">
          {resource.Role} · {resource.Level} · {resource.Location}
        </p>
        <p className="mt-1 text-[15px] text-[var(--ink-2)]">
          {resource.Department}
          {manager ? ` · reports to ${manager.FullName}` : ""}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Allocation"
            value={pct(metrics.CurrentAllocationPct, 0)}
            bad={metrics.UtilizationStatus === "Overallocated"}
          />
          <Stat label="Status" value={metrics.UtilizationStatus} />
          <Stat
            label="Free this week"
            value={`${metrics.AvailableHrsPerWeek}h`}
          />
          <Stat
            label="Billable YTD"
            value={`${Math.round(metrics.BillableHoursYTD)}h`}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-[15px] text-[var(--ink-2)] md:grid-cols-4">
          <div>Cost {money(resource.CostRateHr)}/hr</div>
          <div>Bill {money(resource.BillRateHr)}/hr</div>
          <div>Capacity {resource.WeeklyCapacityHrs}h/wk</div>
          <div>Started {formatDate(resource.StartDate)}</div>
        </div>
      </section>

      <Section title="Current allocations">
        {current.length === 0 ? (
          <Empty>No active allocations as of {formatAsOf(payload.asOfDate)}.</Empty>
        ) : (
          current.map((a, idx) => {
            const project = projects.get(a.ProjectID);
            const pm = projectMetrics.get(a.ProjectID);
            return (
              <Link
                key={a.AllocationID}
                href={`/projects/${a.ProjectID}`}
                className={`flex min-h-14 items-center gap-3 px-4 py-3 ${
                  idx === current.length - 1
                    ? ""
                    : "border-b border-[var(--hairline)]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-semibold">
                    {project?.ProjectName ?? a.ProjectID}
                  </div>
                  <div className="text-[15px] text-[var(--ink-2)]">
                    {a.ProjectRole} · through {formatDate(a.EndDate)}
                  </div>
                </div>
                {pm ? <StatusGlyph rag={pm.OverallRAG} /> : null}
                <div className="text-[15px] font-semibold">
                  {pct(a.AllocationPct, 0)}
                </div>
              </Link>
            );
          })
        )}
      </Section>

      <Section title="All assignments">
        {allocations.length === 0 ? (
          <Empty>No allocation history.</Empty>
        ) : (
          allocations.slice(0, 12).map((a, idx) => {
            const project = projects.get(a.ProjectID);
            return (
              <Link
                key={a.AllocationID}
                href={`/projects/${a.ProjectID}`}
                className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${
                  idx === Math.min(allocations.length, 12) - 1
                    ? ""
                    : "border-b border-[var(--hairline)]"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-[17px] font-semibold">
                    {project?.ProjectName ?? a.ProjectID}
                  </div>
                  <div className="text-[15px] text-[var(--ink-2)]">
                    {formatDate(a.StartDate)} – {formatDate(a.EndDate)}
                  </div>
                </div>
                <div className="text-[15px] font-semibold">
                  {pct(a.AllocationPct, 0)}
                </div>
              </Link>
            );
          })
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
    <section>
      <h2 className="mb-3 px-1 text-[20px] font-semibold leading-[25px]">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[14px] bg-[var(--surface)]">
        {children}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  bad,
}: {
  label: string;
  value: string;
  bad?: boolean;
}) {
  return (
    <div className="rounded-[14px] bg-[var(--surface-2)] px-3 py-3">
      <div className="text-[13px] text-[var(--ink-3)]">{label}</div>
      <div
        className="mt-1 text-[17px] font-semibold"
        style={{ color: bad ? "var(--off-track-text)" : "var(--ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-5 text-[15px] text-[var(--ink-2)]">{children}</p>;
}
