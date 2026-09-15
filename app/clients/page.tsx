import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { CardStack, EntityCard, ragTone } from "@/components/ui/ListCard";
import { formatAsOf, money } from "@/lib/format";
import { computeInvoiceMetrics } from "@/lib/metrics/finance";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const payload = await getPortfolioPayload();
  const projects = payload.dataset.projects;
  const invoices = payload.dataset.invoices;

  const rows = payload.dataset.clients.map((client) => {
    const cps = projects.filter((p) => p.ClientID === client.ClientID);
    const outstanding = invoices
      .filter((i) => cps.some((p) => p.ProjectID === i.ProjectID))
      .filter((i) => {
        const m = computeInvoiceMetrics(i, payload.dataset);
        return m.Status !== "Paid";
      })
      .reduce((s, i) => s + i.Amount, 0);
    const rags = payload.metrics.projects.filter((m) =>
      cps.some((p) => p.ProjectID === m.ProjectID && p.Status === "Active"),
    );
    const worst = rags.some((r) => r.OverallRAG === "Red")
      ? "Red"
      : rags.some((r) => r.OverallRAG === "Amber")
        ? "Amber"
        : rags.length
          ? "Green"
          : "N/A";
    return { client, outstanding, count: cps.length, worst };
  }).sort((a, b) => b.outstanding - a.outstanding);

  return (
    <AppShell active="clients" title="Clients" asOf={formatAsOf(payload.asOfDate)}>
      <p className="px-1 text-[13px] text-[var(--ink-2)]">
        {rows.length} clients · tap a row for the client brief.
      </p>
      <CardStack>
        {rows.map((row) => (
          <EntityCard
            key={row.client.ClientID}
            href={`/clients/${row.client.ClientID}`}
            kicker={`${row.client.Tier} · ${row.client.PaymentTermsDays}d terms`}
            title={row.client.ClientName}
            meta={`${row.count} project${row.count === 1 ? "" : "s"}`}
            rag={row.worst}
            tone={ragTone(row.worst)}
            figure={money(row.outstanding)}
            figureLabel="AR"
          />
        ))}
      </CardStack>
    </AppShell>
  );
}
