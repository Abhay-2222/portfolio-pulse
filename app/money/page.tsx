import Link from "next/link";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { computeInvoiceMetrics } from "@/lib/metrics/finance";
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

  const overdue = invoices.filter((i) => i.metrics.Status === "Overdue");
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
      <section className="rounded-[28px] bg-[var(--surface)] p-5 md:p-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Forecast margin"
            value={pct(kpis.forecastMarginPct)}
            detail={pts(marginGap)}
            bad={marginGap < 0}
          />
          <Stat label="Active contract" value={money(kpis.activeContractValue)} />
          <Stat
            label="Overdue AR"
            value={money(kpis.overdueReceivables)}
            detail={`of ${money(kpis.outstandingReceivables)}`}
            bad={kpis.overdueReceivables > 0}
          />
          <Stat
            label="Unbilled WIP"
            value={money(kpis.unbilledWipActive)}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-[15px] text-[var(--ink-2)] md:grid-cols-3">
          <div>Budget {money(kpis.activeBudget)}</div>
          <div>Spent {money(kpis.actualCostActive)}</div>
          <div>EAC {money(kpis.eacActive)}</div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Chip href="/money" label="Overview" active={!focus} />
        <Chip
          href="/money?focus=overdue"
          label="Overdue"
          active={focus === "overdue"}
        />
        <Chip
          href="/money?focus=unbilled"
          label="Unbilled"
          active={focus === "unbilled"}
        />
      </div>

      {focus !== "unbilled" ? (
        <Section title={focus === "overdue" ? "Overdue invoices" : "Open invoices"}>
          {(focus === "overdue" ? overdue : invoices).length === 0 ? (
            <Empty>No open invoices in this view.</Empty>
          ) : (
            (focus === "overdue" ? overdue : invoices)
              .slice(0, 12)
              .map((row, idx, arr) => (
                <Link
                  key={row.invoice.InvoiceID}
                  href={`/projects/${row.invoice.ProjectID}`}
                  className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${
                    idx === arr.length - 1
                      ? ""
                      : "border-b border-[var(--hairline)]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[17px] font-semibold">
                      {row.project?.ProjectName ?? row.invoice.ProjectID}
                    </div>
                    <div className="text-[15px] text-[var(--ink-2)]">
                      {row.invoice.InvoiceID} · due{" "}
                      {formatDate(row.metrics.DueDate)} · {row.metrics.Status}
                      {row.metrics.DaysOverdue > 0
                        ? ` · ${row.metrics.DaysOverdue}d`
                        : ""}
                    </div>
                  </div>
                  <div
                    className="text-[17px] font-semibold"
                    style={{
                      color:
                        row.metrics.Status === "Overdue"
                          ? "var(--off-track-text)"
                          : "var(--ink)",
                    }}
                  >
                    {money(row.invoice.Amount)}
                  </div>
                </Link>
              ))
          )}
        </Section>
      ) : null}

      {focus !== "overdue" ? (
        <Section title="Earned, not yet invoiced">
          {unbilledRows.length === 0 ? (
            <Empty>No unbilled WIP on active projects.</Empty>
          ) : (
            unbilledRows.map((m, idx) => {
              const project = projects.get(m.ProjectID)!;
              return (
                <Link
                  key={m.ProjectID}
                  href={`/projects/${m.ProjectID}`}
                  className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${
                    idx === unbilledRows.length - 1
                      ? ""
                      : "border-b border-[var(--hairline)]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[17px] font-semibold">
                      {project.ProjectName}
                    </div>
                    <div className="text-[15px] text-[var(--ink-2)]">
                      Invoiced {money(m.InvoicedToDate)}
                    </div>
                  </div>
                  <div className="text-[17px] font-semibold">
                    {money(m.UnbilledWIP)}
                  </div>
                </Link>
              );
            })
          )}
        </Section>
      ) : null}

      {!focus ? (
        <Section title="Thinnest margins">
          {marginRows.map((m, idx) => {
            const project = projects.get(m.ProjectID)!;
            return (
              <Link
                key={m.ProjectID}
                href={`/projects/${m.ProjectID}`}
                className={`flex min-h-14 items-center gap-3 px-4 py-3 ${
                  idx === marginRows.length - 1
                    ? ""
                    : "border-b border-[var(--hairline)]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-semibold">
                    {project.ProjectName}
                  </div>
                  <div className="text-[15px] text-[var(--ink-2)]">
                    Contract {money(m.CurrentContractValue)}
                  </div>
                </div>
                <StatusGlyph rag={m.MarginRAG} />
                <div
                  className="w-16 text-right text-[15px] font-semibold"
                  style={{
                    color:
                      m.ForecastMarginPct < 0
                        ? "var(--off-track-text)"
                        : "var(--ink)",
                  }}
                >
                  {pct(m.ForecastMarginPct)}
                </div>
              </Link>
            );
          })}
        </Section>
      ) : null}
    </AppShell>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center rounded-full px-4 text-[15px] ${
        active
          ? "bg-[var(--accent-tint)] font-semibold text-[var(--accent)]"
          : "bg-[var(--surface)] text-[var(--ink-2)]"
      }`}
    >
      {label}
    </Link>
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
