import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { FilterChips } from "@/components/ui/FilterChips";
import { AgingBar } from "@/components/ui/RagBar";
import { SplitBar } from "@/components/ui/Meter";
import { StatGrid } from "@/components/ui/StatGrid";
import { CardStack, EntityCard, ragTone, SectionLabel } from "@/components/ui/ListCard";
import { computeInvoiceMetrics } from "@/lib/metrics/finance";
import { collectabilityScore, rankWord } from "@/lib/metrics/derived";
import { formatAsOf, formatDate, money, pct, pts } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const params = await searchParams;
  const payload = await getPortfolioPayload();
  const kpis = payload.metrics.portfolio;
  const projects = new Map(
    payload.dataset.projects.map((p) => [p.ProjectID, p]),
  );
  const marginGap = kpis.forecastMarginPct - kpis.weightedTargetMargin;

  const invoices = payload.dataset.invoices
    .map((invoice) => ({
      invoice,
      metrics: computeInvoiceMetrics(invoice, payload.dataset),
      project: projects.get(invoice.ProjectID),
    }))
    .filter((row) => row.metrics.Status !== "Paid")
    .sort((a, b) => {
      const rank = (s: string) => (s === "Overdue" ? 0 : 1);
      const d = rank(a.metrics.Status) - rank(b.metrics.Status);
      if (d !== 0) return d;
      return b.invoice.Amount - a.invoice.Amount;
    });

  const clients = new Map(
    payload.dataset.clients.map((c) => [c.ClientID, c]),
  );
  const projectMetrics = new Map(
    payload.metrics.projects.map((m) => [m.ProjectID, m]),
  );

  const overdue = invoices
    .filter((i) => i.metrics.Status === "Overdue")
    .slice()
    .sort((a, b) => {
      const score = (row: (typeof invoices)[number]) =>
        collectabilityScore({
          amount: row.invoice.Amount,
          daysOverdue: row.metrics.DaysOverdue,
          clientTier: clients.get(row.project?.ClientID ?? "")?.Tier ?? "",
          projectRag: projectMetrics.get(row.invoice.ProjectID)?.OverallRAG ?? "",
        });
      return score(b) - score(a);
    });
  const focus = params.focus;

  const marginRows = payload.metrics.projects
    .filter((m) => projects.get(m.ProjectID)?.Status === "Active")
    .sort((a, b) => a.ForecastMarginPct - b.ForecastMarginPct)
    .slice(0, 8);

  const unbilledRows = payload.metrics.projects
    .filter(
      (m) =>
        projects.get(m.ProjectID)?.Status === "Active" && m.UnbilledWIP > 0,
    )
    .sort((a, b) => b.UnbilledWIP - a.UnbilledWIP)
    .slice(0, 8);

  return (
    <AppShell active="money" title="Money" asOf={formatAsOf(payload.asOfDate)}>
      <section className="space-y-3">
        <StatGrid
          cells={[
            {
              label: "Forecast margin",
              value: pct(kpis.forecastMarginPct),
              delta: pts(marginGap),
              tone: marginGap < 0 ? "bad" : "neutral",
            },
            {
              label: "Active contract",
              value: money(kpis.activeContractValue),
            },
            {
              label: "Overdue AR",
              value: money(kpis.overdueReceivables),
              sub: `of ${money(kpis.outstandingReceivables)}`,
              tone: kpis.overdueReceivables > 0 ? "bad" : "neutral",
            },
            {
              label: "Earned, unbilled",
              value: money(payload.derived.wipGross),
              sub: `Over-billed ${money(Math.abs(payload.derived.wipOverbilled))}`,
            },
          ]}
        />
        <StatGrid
          columns={3}
          cells={[
            { label: "Budget", value: money(kpis.activeBudget) },
            { label: "Spent", value: money(kpis.actualCostActive) },
            {
              label: "EAC",
              value: money(kpis.eacActive),
              sub: "CPI method",
            },
          ]}
        />
        <div className="card-tile">
        <SplitBar
          title="Unbilled vs over-billed"
          left={payload.derived.wipGross}
          right={Math.abs(payload.derived.wipOverbilled)}
          leftLabel={`Unbilled ${money(payload.derived.wipGross)}`}
          rightLabel={`Over-billed ${money(Math.abs(payload.derived.wipOverbilled))}`}
        />
        {(focus === "overdue" || !focus) ? (
          <>
            <p className="mt-3 kicker">
              Outstanding AR by age
            </p>
            <AgingBar
              current={sumBucket(invoices, "Current")}
              d30={sumBucket(invoices, "1-30")}
              d60={sumBucket(invoices, "31-60")}
              d90={sumBucket(invoices, "60+")}
            />
          </>
        ) : null}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 text-[13px] text-[var(--ink-2)]">
          {focus === "overdue"
            ? "Overdue invoices"
            : focus === "unbilled"
              ? "Earned, unbilled"
              : focus === "uninvoiced"
                ? "Never invoiced"
                : "Cash and margin"}
        </p>
        <FilterChips
          label="Money"
          chips={[
            { label: "Overview", href: "/money", active: !focus },
            {
              label: "Overdue",
              href: "/money?focus=overdue",
              active: focus === "overdue",
            },
            {
              label: "Unbilled",
              href: "/money?focus=unbilled",
              active: focus === "unbilled",
            },
            {
              label: "Milestones",
              href: "/money?focus=uninvoiced",
              active: focus === "uninvoiced",
            },
          ]}
        />
      </div>

      {focus === "uninvoiced" ? (
        <section className="space-y-2">
          <SectionLabel kicker="Never invoiced">
            Portfolio billing milestones with no invoice.
          </SectionLabel>
          <CardStack>
          {payload.derived.uninvoicedMilestones.length === 0 ? (
            <Empty>No passed billing milestones without an invoice.</Empty>
          ) : (
            payload.derived.uninvoicedMilestones.map((row) => (
              <EntityCard
                key={row.MilestoneID}
                href={`/projects/${row.ProjectID}`}
                kicker={projects.get(row.ProjectID)?.ProjectName}
                title={row.MilestoneName}
                meta={`Forecast ${formatDate(row.ForecastDate)}`}
                figure={money(row.amount)}
                figureLabel="Amount"
                figureTone="bad"
                tone="bad"
              />
            ))
          )}
          </CardStack>
        </section>
      ) : null}

      {focus !== "unbilled" && focus !== "uninvoiced" ? (
        <section className="space-y-2">
          <SectionLabel
            kicker={
              focus === "overdue" ? "Overdue invoices" : "Open invoices"
            }
          >
            {focus === "overdue" ? "Ranked by collectability." : undefined}
          </SectionLabel>
          <CardStack>
          {(focus === "overdue" ? overdue : invoices).length === 0 ? (
            <Empty>No open invoices in this view.</Empty>
          ) : (
            (focus === "overdue" ? overdue : invoices)
              .slice(0, 12)
              .map((row, idx) => (
                <EntityCard
                  key={row.invoice.InvoiceID}
                  href={`/money/${row.invoice.InvoiceID}`}
                  kicker={row.invoice.InvoiceID}
                  title={
                    clients.get(row.project?.ClientID ?? "")?.ClientName ??
                    row.project?.ProjectName ??
                    row.invoice.ProjectID
                  }
                  meta={[
                    row.project?.ProjectName,
                    row.metrics.AgingBucket,
                    row.metrics.DaysOverdue > 0
                      ? `${row.metrics.DaysOverdue}d`
                      : null,
                    `due ${formatDate(row.metrics.DueDate)}`,
                    focus === "overdue" ? `chase ${rankWord(idx + 1)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  rag={row.metrics.Status}
                  tone={ragTone(row.metrics.Status)}
                  figure={money(row.invoice.Amount)}
                  figureLabel="Amount"
                  figureTone={
                    row.metrics.Status === "Overdue" ? "bad" : "neutral"
                  }
                />
              ))
          )}
          </CardStack>
        </section>
      ) : null}

      {focus !== "overdue" && focus !== "uninvoiced" ? (
        <section className="space-y-2">
          <SectionLabel kicker="Earned, not yet invoiced" />
          <CardStack>
          {unbilledRows.length === 0 ? (
            <Empty>No unbilled WIP on active projects.</Empty>
          ) : (
            unbilledRows.map((m) => {
              const project = projects.get(m.ProjectID)!;
              return (
                <EntityCard
                  key={m.ProjectID}
                  href={`/projects/${m.ProjectID}`}
                  title={project.ProjectName}
                  meta={`Invoiced ${money(m.InvoicedToDate)}`}
                  figure={money(m.UnbilledWIP)}
                  figureLabel="Unbilled"
                />
              );
            })
          )}
          </CardStack>
        </section>
      ) : null}

      {!focus ? (
        <section className="space-y-2">
          <SectionLabel kicker="Thinnest margins" />
          <CardStack>
          {marginRows.map((m) => {
            const project = projects.get(m.ProjectID)!;
            return (
              <EntityCard
                key={m.ProjectID}
                href={`/projects/${m.ProjectID}`}
                title={project.ProjectName}
                meta={`Contract ${money(m.CurrentContractValue)}`}
                rag={m.MarginRAG}
                tone={ragTone(m.MarginRAG)}
                figure={pct(m.ForecastMarginPct)}
                figureLabel="Margin"
                figureTone={m.ForecastMarginPct < 0 ? "bad" : "neutral"}
              />
            );
          })}
          </CardStack>
        </section>
      ) : null}
    </AppShell>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card-tile text-[15px] text-[var(--ink-2)]">{children}</p>;
}

function sumBucket(
  rows: { invoice: { Amount: number }; metrics: { AgingBucket: string } }[],
  bucket: string,
) {
  return rows
    .filter((r) => r.metrics.AgingBucket === bucket)
    .reduce((s, r) => s + r.invoice.Amount, 0);
}
