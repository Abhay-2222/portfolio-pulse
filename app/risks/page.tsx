import Link from "next/link";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { computeRaidMetrics } from "@/lib/metrics/risk";
import { computeMilestoneStatus } from "@/lib/metrics/finance";
import { formatAsOf, formatDate, money } from "@/lib/format";

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

  const overdueMilestones = payload.dataset.milestones
    .map((m) => ({
      milestone: m,
      status: computeMilestoneStatus(m, payload.dataset),
      project: projects.get(m.ProjectID),
    }))
    .filter((m) => m.status === "Overdue");

  const pendingCrs = payload.dataset.changeRequests
    .filter((c) => c.Status === "Submitted" || c.Status === "Draft")
    .map((cr) => ({
      cr,
      project: projects.get(cr.ProjectID),
    }))
    .sort((a, b) => b.cr.CostImpact - a.cr.CostImpact);

  const chips = [
    { label: "All open", href: "/risks" },
    { label: "Critical", href: "/risks?severity=Critical" },
    { label: "Risks", href: "/risks?type=Risk" },
    { label: "Issues", href: "/risks?type=Issue" },
  ];

  return (
    <AppShell active="risks" title="Risks" asOf={formatAsOf(payload.asOfDate)}>
      <section className="rounded-[28px] bg-[var(--surface)] p-5 md:p-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Critical open"
            value={String(kpis.openCriticalRisks)}
            bad={kpis.openCriticalRisks > 0}
          />
          <Stat
            label="Risk exposure"
            value={money(kpis.weightedOpenRiskExposure)}
          />
          <Stat
            label="Pending CRs"
            value={String(kpis.pendingChangeRequests)}
            detail={money(kpis.pendingChangeRequestCost)}
          />
          <Stat
            label="Overdue milestones"
            value={String(kpis.overdueMilestones)}
            bad={kpis.overdueMilestones > 0}
          />
        </div>
      </section>

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

      <Section title="Open RAID">
        {raid.length === 0 ? (
          <Empty>No open items match these filters.</Empty>
        ) : (
          raid.slice(0, 20).map((row, idx) => (
            <Link
              key={row.item.RAIDID}
              href={`/projects/${row.item.ProjectID}`}
              className={`flex min-h-14 items-start justify-between gap-3 px-4 py-3 ${
                idx === Math.min(raid.length, 20) - 1
                  ? ""
                  : "border-b border-[var(--hairline)]"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-[17px] font-semibold">
                  {row.item.Title}
                </div>
                <div className="text-[15px] text-[var(--ink-2)]">
                  {row.item.Type} · {row.metrics.Severity} ·{" "}
                  {row.project?.ProjectName ?? row.item.ProjectID}
                  {row.owner ? ` · ${row.owner.FullName}` : ""}
                </div>
              </div>
              <div
                className="shrink-0 text-[15px] font-semibold"
                style={{
                  color:
                    row.metrics.Severity === "Critical"
                      ? "var(--off-track-text)"
                      : "var(--ink)",
                }}
              >
                {money(row.metrics.ExpectedExposure)}
              </div>
            </Link>
          ))
        )}
      </Section>

      <Section title="Overdue milestones">
        {overdueMilestones.length === 0 ? (
          <Empty>No overdue milestones.</Empty>
        ) : (
          overdueMilestones.slice(0, 10).map((row, idx) => (
            <Link
              key={row.milestone.MilestoneID}
              href={`/projects/${row.milestone.ProjectID}`}
              className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${
                idx === Math.min(overdueMilestones.length, 10) - 1
                  ? ""
                  : "border-b border-[var(--hairline)]"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-[17px] font-semibold">
                  {row.milestone.MilestoneName}
                </div>
                <div className="text-[15px] text-[var(--ink-2)]">
                  {row.project?.ProjectName ?? row.milestone.ProjectID} ·
                  forecast {formatDate(row.milestone.ForecastDate)}
                </div>
              </div>
              <div className="text-[15px] font-semibold text-[var(--off-track-text)]">
                Overdue
              </div>
            </Link>
          ))
        )}
      </Section>

      <Section title="Pending change requests">
        {pendingCrs.length === 0 ? (
          <Empty>No pending change requests.</Empty>
        ) : (
          pendingCrs.slice(0, 10).map((row, idx) => (
            <Link
              key={row.cr.CRID}
              href={`/projects/${row.cr.ProjectID}`}
              className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${
                idx === Math.min(pendingCrs.length, 10) - 1
                  ? ""
                  : "border-b border-[var(--hairline)]"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-[17px] font-semibold">
                  {row.cr.Title}
                </div>
                <div className="text-[15px] text-[var(--ink-2)]">
                  {row.project?.ProjectName ?? row.cr.ProjectID} ·{" "}
                  {row.cr.Status}
                </div>
              </div>
              <div className="text-right text-[15px] font-semibold">
                <div>{money(row.cr.CostImpact)}</div>
                <div className="text-[13px] font-normal text-[var(--ink-2)]">
                  +{row.cr.ScheduleImpactDays}d
                </div>
              </div>
            </Link>
          ))
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
  detail,
  bad,
}: {
  label: string;
  value: string;
  detail?: string;
  bad?: boolean;
}) {
  return (
    <div className="rounded-[14px] bg-[var(--surface-2)] px-3 py-3">
      <div className="text-[13px] text-[var(--ink-3)]">{label}</div>
      <div
        className="mt-1 text-[20px] font-semibold"
        style={{ color: bad ? "var(--off-track-text)" : "var(--ink)" }}
      >
        {value}
      </div>
      {detail ? (
        <div className="mt-1 text-[13px] text-[var(--ink-2)]">{detail}</div>
      ) : null}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-5 text-[15px] text-[var(--ink-2)]">{children}</p>;
}
