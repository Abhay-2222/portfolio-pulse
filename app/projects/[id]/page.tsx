import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import {
  computeInvoiceMetrics,
  computeMilestoneStatus,
} from "@/lib/metrics/finance";
import { computeRaidMetrics } from "@/lib/metrics/risk";
import { formatAsOf, formatDate, money, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getPortfolioPayload();
  const project = payload.dataset.projects.find((p) => p.ProjectID === id);
  if (!project) notFound();

  const metrics = payload.metrics.projects.find((m) => m.ProjectID === id)!;
  const client = payload.dataset.clients.find(
    (c) => c.ClientID === project.ClientID,
  );
  const pm = payload.dataset.resources.find(
    (r) => r.EmployeeID === project.ProjectManagerID,
  );

  const team = payload.dataset.allocations
    .filter((a) => a.ProjectID === id)
    .map((a) => {
      const person = payload.dataset.resources.find(
        (r) => r.EmployeeID === a.EmployeeID,
      );
      return { allocation: a, person };
    });

  const milestones = payload.dataset.milestones
    .filter((m) => m.ProjectID === id)
    .map((m) => ({
      milestone: m,
      status: computeMilestoneStatus(m, payload.dataset),
    }));

  const invoices = payload.dataset.invoices
    .filter((i) => i.ProjectID === id)
    .map((i) => ({
      invoice: i,
      metrics: computeInvoiceMetrics(i, payload.dataset),
    }));

  const risks = payload.dataset.raid
    .filter((r) => r.ProjectID === id && r.Status !== "Closed")
    .map((r) => ({ item: r, metrics: computeRaidMetrics(r, payload.dataset) }))
    .sort((a, b) => b.metrics.RiskScore - a.metrics.RiskScore);

  return (
    <AppShell
      active="projects"
      title={project.ProjectName}
      asOf={formatAsOf(payload.asOfDate)}
      backHref="/projects"
    >
      <section className="rounded-[28px] bg-[var(--surface)] p-5 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[15px] text-[var(--ink-2)]">
              {client?.ClientName ?? project.ClientID} · {project.Portfolio}
            </p>
            <p className="mt-1 text-[15px] text-[var(--ink-2)]">
              PM {pm?.FullName ?? project.ProjectManagerID} · {project.Status} ·{" "}
              {project.Phase}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusGlyph rag={metrics.OverallRAG} size={18} />
            <div className="text-right">
              <div className="text-[13px] text-[var(--ink-3)]">Health</div>
              <div className="text-[28px] font-semibold leading-none">
                {metrics.HealthScore ?? "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Contract" value={money(metrics.CurrentContractValue)} />
          <Stat label="Forecast margin" value={pct(metrics.ForecastMarginPct)} bad={metrics.ForecastMarginPct < 0} />
          <Stat label="Complete" value={pct(project.PctComplete)} />
          <Stat label="Slip" value={`${metrics.ScheduleSlipDays}d`} bad={metrics.ScheduleSlipDays > 0} />
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[13px]">
          <Pill label={`Cost ${metrics.CostRAG}`} rag={metrics.CostRAG} />
          <Pill label={`Schedule ${metrics.ScheduleRAG}`} rag={metrics.ScheduleRAG} />
          <Pill label={`Margin ${metrics.MarginRAG}`} rag={metrics.MarginRAG} />
        </div>
      </section>

      <Section title="Money">
        <Row label="Budget (BAC)" value={money(metrics.CurrentBudget)} />
        <Row label="Spent so far" value={money(metrics.ActualCost)} />
        <Row label="Expected total cost" value={money(metrics.EAC)} />
        <Row label="Still to spend" value={money(metrics.ETC)} />
        <Row label="Invoiced" value={money(metrics.InvoicedToDate)} />
        <Row label="Earned, not invoiced" value={money(metrics.UnbilledWIP)} last />
      </Section>

      <Section title="Team">
        {team.length === 0 ? (
          <Empty>No allocations on this project.</Empty>
        ) : (
          team.map(({ allocation, person }, idx) => (
            <Link
              key={allocation.AllocationID}
              href={person ? `/people/${person.EmployeeID}` : "/people"}
              className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${
                idx === team.length - 1 ? "" : "border-b border-[var(--hairline)]"
              }`}
            >
              <div>
                <div className="text-[17px] font-semibold">
                  {person?.FullName ?? allocation.EmployeeID}
                </div>
                <div className="text-[15px] text-[var(--ink-2)]">
                  {allocation.ProjectRole}
                </div>
              </div>
              <div className="text-[15px] font-medium">
                {pct(allocation.AllocationPct, 0)}
              </div>
            </Link>
          ))
        )}
      </Section>

      <Section title="Milestones">
        {milestones.map(({ milestone, status }, idx) => (
          <div
            key={milestone.MilestoneID}
            className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${
              idx === milestones.length - 1 ? "" : "border-b border-[var(--hairline)]"
            }`}
          >
            <div>
              <div className="text-[17px] font-semibold">
                {milestone.MilestoneName}
              </div>
              <div className="text-[15px] text-[var(--ink-2)]">
                Forecast {formatDate(milestone.ForecastDate)}
              </div>
            </div>
            <div className="text-[15px] font-medium">{status}</div>
          </div>
        ))}
      </Section>

      <Section title="Open risks & issues">
        {risks.length === 0 ? (
          <Empty>No open RAID items.</Empty>
        ) : (
          risks.slice(0, 8).map(({ item, metrics: rm }, idx) => (
            <Link
              key={item.RAIDID}
              href="/risks"
              className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${
                idx === Math.min(risks.length, 8) - 1
                  ? ""
                  : "border-b border-[var(--hairline)]"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-[17px] font-semibold">
                  {item.Title}
                </div>
                <div className="text-[15px] text-[var(--ink-2)]">
                  {item.Type} · {rm.Severity}
                </div>
              </div>
              <div className="text-[15px] font-medium">
                {money(rm.ExpectedExposure)}
              </div>
            </Link>
          ))
        )}
      </Section>

      <Section title="Invoices">
        {invoices.length === 0 ? (
          <Empty>No invoices yet.</Empty>
        ) : (
          invoices.slice(0, 8).map(({ invoice, metrics: im }, idx) => (
            <div
              key={invoice.InvoiceID}
              className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${
                idx === Math.min(invoices.length, 8) - 1
                  ? ""
                  : "border-b border-[var(--hairline)]"
              }`}
            >
              <div>
                <div className="text-[17px] font-semibold">
                  {invoice.InvoiceID}
                </div>
                <div className="text-[15px] text-[var(--ink-2)]">
                  {formatDate(invoice.InvoiceDate)} · {im.Status}
                </div>
              </div>
              <div className="text-[15px] font-medium">
                {money(invoice.Amount)}
              </div>
            </div>
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

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex min-h-14 items-center justify-between gap-4 px-4 py-3 ${
        last ? "" : "border-b border-[var(--hairline)]"
      }`}
    >
      <div className="text-[17px]">{label}</div>
      <div className="text-[17px] font-semibold">{value}</div>
    </div>
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
        className="mt-1 text-[20px] font-semibold"
        style={{ color: bad ? "var(--off-track-text)" : "var(--ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

function Pill({ label, rag }: { label: string; rag: string }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 text-[13px]">
      <StatusGlyph rag={rag} size={12} />
      {label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-5 text-[15px] text-[var(--ink-2)]">{children}</p>;
}
