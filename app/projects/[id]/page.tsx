import { notFound } from "next/navigation";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { CopyBriefButton } from "@/components/ui/CopyBriefButton";
import { ExpandableTile } from "@/components/ui/ExpandableTile";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { CardStack, EntityCard, ragTone } from "@/components/ui/ListCard";
import { StatGrid } from "@/components/ui/StatGrid";
import { MeterBar } from "@/components/ui/Meter";
import { EntityLink } from "@/components/ui/EntityLink";
import { SourceLink } from "@/components/ui/Provenance";
import { capTier4, findingsForSubject } from "@/lib/findings";
import { FindingCard } from "@/components/overlay/FindingCard";
import { exportFindingMarkdown } from "@/lib/overlay/export";
import { isQueueFinding } from "@/lib/overlay/apply";
import {
  contingencyRemaining,
  healthContributors,
  healthWhyLine,
} from "@/lib/metrics/derived";
import {
  computeInvoiceMetrics,
  computeMilestoneStatus,
} from "@/lib/metrics/finance";
import { computeRaidMetrics } from "@/lib/metrics/risk";
import { formatAsOf, formatDate, money, pct } from "@/lib/format";
import { ProjectMore } from "@/components/book/ProjectMore";
import { entityCoverage, hasEntityMore } from "@/lib/data/coverage";

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

  const asOf = new Date(payload.asOfDate);
  const team = payload.dataset.allocations
    .filter(
      (a) =>
        a.ProjectID === id &&
        a.StartDate.getTime() <= asOf.getTime() &&
        asOf.getTime() <= a.EndDate.getTime(),
    )
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

  const pin = [
    "people.overallocated_with_swap",
    "money.milestone_passed_unbilled",
    "money.margin_below_floor",
  ];
  const findings = capTier4(
    findingsForSubject(payload.findings, "project", id).filter(isQueueFinding),
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
  const remainingContingency = contingencyRemaining(payload.dataset, id);
  const uninvoicedHere = payload.derived.uninvoicedMilestones.filter(
    (m) => m.ProjectID === id,
  );
  const more = entityCoverage(payload.coverage, id);
  const contributors = healthContributors(project, metrics, payload.dataset);
  const why = healthWhyLine(metrics, contributors);
  const copy = [
    `# ${project.ProjectName}`,
    findings.map((f) => exportFindingMarkdown(f)).join("\n\n"),
    `${why} EAC uses the CPI method.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <AppShell
      active="projects"
      title={project.ProjectName}
      asOf={formatAsOf(payload.asOfDate)}
      backHref="/projects"
    >
      <section id="health" className="card-tile space-y-3 scroll-mt-16">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kicker">
              {client ? (
                <EntityLink
                  type="client"
                  id={client.ClientID}
                  className="font-normal text-[var(--ink-2)]"
                >
                  {client.ClientName}
                </EntityLink>
              ) : (
                project.ClientID
              )}{" "}
              · {project.Portfolio}
            </p>
            <p className="mt-3 kicker">PM</p>
            <p className="mt-0.5 text-[15px] font-normal leading-5 text-[var(--ink)]">
              {pm ? (
                <EntityLink
                  type="person"
                  id={pm.EmployeeID}
                  className="text-[15px] font-normal text-[var(--ink)]"
                >
                  {pm.FullName}
                </EntityLink>
              ) : (
                project.ProjectManagerID
              )}
            </p>
            <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
              {project.Status} · {project.Phase}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            <CopyBriefButton text={copy} />
            <div className="text-right">
              <div className="kicker">Health</div>
              <div
                className="figure mt-0.5"
                style={{
                  color:
                    (metrics.HealthScore ?? 100) < 50
                      ? "var(--off-track-text)"
                      : "var(--ink)",
                }}
              >
                {metrics.HealthScore ?? "—"}
              </div>
            </div>
          </div>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          <li className="flex items-center gap-1.5">
            <StatusGlyph rag={metrics.CostRAG} size={12} />
            <span className="text-[12px] font-normal leading-4">Cost</span>
          </li>
          <li className="flex items-center gap-1.5">
            <StatusGlyph rag={metrics.ScheduleRAG} size={12} />
            <span className="text-[12px] font-normal leading-4">Schedule</span>
          </li>
          <li className="flex items-center gap-1.5">
            <StatusGlyph rag={metrics.MarginRAG} size={12} />
            <span className="text-[12px] font-normal leading-4">Margin</span>
          </li>
        </ul>

        {metrics.HealthScore != null ? (
          <MeterBar
            value={metrics.HealthScore}
            reference={100}
            tone={
              metrics.OverallRAG === "Red"
                ? "bad"
                : metrics.OverallRAG === "Amber"
                  ? "watch"
                  : "good"
            }
            label="0–100"
            showValue={false}
            className=""
            formatValue={(n) => String(Math.round(n))}
          />
        ) : null}

        {metrics.HealthScore != null ? (
          <p className="text-[15px] font-normal leading-5">{why}</p>
        ) : null}

        {metrics.HealthScore != null ? (
          <ExpandableTile
            flush
            summary={
              <span className="text-[13px] font-normal">Contributors</span>
            }
            detail={
              <ul className="space-y-2">
                {contributors.map((c) => (
                  <li key={c.label}>
                    {c.label}: −{c.deduction.toFixed(1)} pts · {c.detail}
                    {c.deduction === 0 ? " (no penalty)" : ""}
                    <SourceLink refs={c.provenance} compact />
                  </li>
                ))}
                <li className="pt-1">
                  EAC uses the CPI method: remaining work at today&apos;s
                  efficiency.
                </li>
              </ul>
            }
          />
        ) : null}
      </section>

      {findings.length > 0 ? (
        <section className="space-y-2">
          <p className="kicker px-1">Urgent</p>
          <CardStack>
            {findings.map((f) => (
              <div
                key={f.id}
                className="card-tile card-tile--bad"
              >
                <FindingCard finding={f} linked={false} compact />
              </div>
            ))}
          </CardStack>
        </section>
      ) : null}

      <StatGrid
        cells={[
          {
            label: "Contract",
            value: metrics.marginReady ? money(metrics.CurrentContractValue) : "—",
          },
          {
            label: "Forecast margin",
            value: metrics.marginReady ? pct(metrics.ForecastMarginPct) : "—",
            tone:
              metrics.marginReady && metrics.ForecastMarginPct < 0
                ? "bad"
                : "neutral",
          },
          {
            label: "Complete",
            value: (project.absent ?? []).includes("PctComplete")
              ? "—"
              : pct(project.PctComplete),
          },
          {
            label: "Slip",
            value: metrics.scheduleReady ? `${metrics.ScheduleSlipDays}d` : "—",
            tone:
              metrics.scheduleReady && metrics.ScheduleSlipDays > 14
                ? "bad"
                : "neutral",
          },
        ]}
      />

      <Section title="Team">
        {team.length === 0 ? (
          <Empty>No allocations on this project.</Empty>
        ) : (
          <CardStack>
            {team.map(({ allocation, person }) => {
            const total = payload.metrics.resources.find(
              (r) => r.EmployeeID === allocation.EmployeeID,
            );
            const otherReds = payload.dataset.allocations.filter((a) => {
              if (a.EmployeeID !== allocation.EmployeeID) return false;
              if (a.ProjectID === id) return false;
              if (
                a.StartDate.getTime() > asOf.getTime() ||
                asOf.getTime() > a.EndDate.getTime()
              ) {
                return false;
              }
              return (
                payload.metrics.projects.find((m) => m.ProjectID === a.ProjectID)
                  ?.OverallRAG === "Red"
              );
            });
            return (
              <EntityCard
                key={allocation.AllocationID}
                href={person ? `/people/${person.EmployeeID}` : "/people"}
                kicker={allocation.ProjectRole}
                title={person?.FullName ?? allocation.EmployeeID}
                meta={
                  otherReds.length > 0
                    ? `also on ${otherReds.length} other off-track project${otherReds.length === 1 ? "" : "s"}`
                    : undefined
                }
                tone={
                  total?.UtilizationStatus === "Overallocated"
                    ? "bad"
                    : "neutral"
                }
                figure={pct(allocation.AllocationPct, 0)}
                figureLabel="Here"
                figureTone={
                  total?.UtilizationStatus === "Overallocated"
                    ? "bad"
                    : "neutral"
                }
              >
                {total ? (
                  <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
                    {pct(total.CurrentAllocationPct, 0)} total
                  </p>
                ) : null}
              </EntityCard>
            );
          })}
          </CardStack>
        )}
      </Section>

      <Section title="Money" id="money">
        <div className="card-tile space-y-1 !p-0 overflow-hidden">
        <div className="px-3.5 pt-3.5">
          <MeterBar
            value={metrics.EAC}
            reference={metrics.CurrentBudget}
            tone={metrics.EAC > metrics.CurrentBudget ? "bad" : "good"}
            label="EAC vs budget (CPI method)"
            formatValue={(n) => money(n)}
          />
        </div>
        {metrics.EAC > metrics.CurrentBudget ? (
          <Row
            lead
            label="This project · expected overrun"
            value={money(metrics.EAC - metrics.CurrentBudget)}
          />
        ) : null}
        {uninvoicedHere.length > 0 ? (
          <Row
            lead
            label="This project · passed billing milestones, never invoiced"
            value={money(uninvoicedHere.reduce((s, m) => s + m.amount, 0))}
          />
        ) : null}
        {remainingContingency > 0 ? (
          <Row
            lead
            label="Unused contingency"
            value={money(remainingContingency)}
          />
        ) : null}
        <Row label="Budget (BAC)" value={money(metrics.CurrentBudget)} />
        <Row label="Spent so far" value={money(metrics.ActualCost)} />
        <Row
          label="Expected total cost (CPI method)"
          value={money(metrics.EAC)}
        />
        <Row label="Still to spend" value={money(metrics.ETC)} />
        <Row label="Invoiced" value={money(metrics.InvoicedToDate)} />
        {metrics.UnbilledWIP >= 0 ? (
          <Row
            label="Earned, not invoiced"
            value={money(metrics.UnbilledWIP)}
            last
          />
        ) : (
          <Row
            label="Over-billed vs earned"
            value={money(Math.abs(metrics.UnbilledWIP))}
            last
          />
        )}
        </div>
      </Section>

      <Section title="Milestones">
        {milestones.length === 0 ? (
          <Empty>No milestones on this project.</Empty>
        ) : (
          <CardStack>
            {milestones.map(({ milestone, status }) => (
              <EntityCard
                key={milestone.MilestoneID}
                kicker="Milestone"
                title={milestone.MilestoneName}
                meta={`Forecast ${formatDate(milestone.ForecastDate)}`}
                figure={status}
                figureTone={status === "Overdue" ? "bad" : "neutral"}
                tone={
                  status === "Overdue"
                    ? "bad"
                    : status === "At Risk"
                      ? "watch"
                      : status === "Completed"
                        ? "good"
                        : "neutral"
                }
              />
            ))}
          </CardStack>
        )}
      </Section>

      <Section title="Open risks & issues">
        {risks.length === 0 ? (
          <Empty>
            {payload.dataset.raid.length === 0
              ? "RAID is not in this book."
              : "RAID unavailable for this project."}
          </Empty>
        ) : (
          <CardStack>
            {risks.slice(0, 8).map(({ item, metrics: rm }) => (
              <EntityCard
                key={item.RAIDID}
                href={`/risks/${item.RAIDID}`}
                kicker={`${item.Type} · ${rm.Severity}`}
                title={item.Title}
                figure={money(rm.ExpectedExposure)}
                figureLabel="Exposure"
                figureTone={
                  rm.Severity === "Critical" || rm.Severity === "High"
                    ? "bad"
                    : "neutral"
                }
                tone={ragTone(rm.Severity)}
              />
            ))}
          </CardStack>
        )}
      </Section>

      <Section title="Invoices">
        {invoices.length === 0 ? (
          <Empty>No invoices yet.</Empty>
        ) : (
          <CardStack>
            {invoices.slice(0, 8).map(({ invoice, metrics: im }) => (
              <EntityCard
                key={invoice.InvoiceID}
                href={`/money/${invoice.InvoiceID}`}
                kicker={im.Status}
                title={invoice.InvoiceID}
                meta={`Invoiced ${formatDate(invoice.InvoiceDate)}`}
                figure={money(invoice.Amount)}
                figureLabel="Amount"
                figureTone={im.Status === "Overdue" ? "bad" : "neutral"}
                tone={ragTone(im.Status)}
              />
            ))}
          </CardStack>
        )}
      </Section>

      {hasEntityMore(more) && more ? <ProjectMore entity={more} /> : null}

      <p className="px-1 text-[13px] text-[var(--ink-3)]">
        Read-only from the workbook. EAC is the CPI method. Currency CAD.
      </p>
    </AppShell>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`space-y-2 ${id ? "scroll-mt-16" : ""}`}
    >
      <h2 className="px-1 text-[15px] font-normal leading-5">{title}</h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  last,
  lead,
}: {
  label: string;
  value: string;
  last?: boolean;
  lead?: boolean;
}) {
  return (
    <div
      className={`flex min-h-12 items-center justify-between gap-4 px-3 py-2.5 ${
        last ? "" : "border-b border-[var(--hairline)]"
      }`}
    >
      <div className={lead ? "text-[15px] font-normal" : "text-[13px] text-[var(--ink-2)]"}>
        {label}
      </div>
      <div className={lead ? "text-[15px] font-normal" : "text-[13px] font-normal"}>
        {value}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card-tile text-[15px] text-[var(--ink-2)]">{children}</p>;
}
