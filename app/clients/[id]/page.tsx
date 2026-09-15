import { notFound } from "next/navigation";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { CopyBriefButton } from "@/components/ui/CopyBriefButton";
import { CardStack, EntityCard, ragTone } from "@/components/ui/ListCard";
import { findingsForSubject, capTier4 } from "@/lib/findings";
import { FindingCard } from "@/components/overlay/FindingCard";
import { exportFindingMarkdown } from "@/lib/overlay/export";
import { computeInvoiceMetrics } from "@/lib/metrics/finance";
import { formatAsOf, money, pct } from "@/lib/format";
import { StatGrid } from "@/components/ui/StatGrid";

export const dynamic = "force-dynamic";

export default async function ClientBriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getPortfolioPayload();
  const client = payload.dataset.clients.find((c) => c.ClientID === id);
  if (!client) notFound();

  const cps = payload.dataset.projects.filter((p) => p.ClientID === id);
  const metrics = payload.metrics.projects.filter((m) =>
    cps.some((p) => p.ProjectID === m.ProjectID),
  );
  const invoices = payload.dataset.invoices.filter((i) =>
    cps.some((p) => p.ProjectID === i.ProjectID),
  );
  const outstanding = invoices
    .filter((i) => computeInvoiceMetrics(i, payload.dataset).Status !== "Paid")
    .reduce((s, i) => s + i.Amount, 0);
  const findings = capTier4(findingsForSubject(payload.findings, "client", id));
  const brief = [
    `# ${client.ClientName}`,
    findings.map((f) => exportFindingMarkdown(f)).join("\n\n"),
    `Outstanding AR ${money(outstanding)}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <AppShell
      active="clients"
      title={client.ClientName}
      asOf={formatAsOf(payload.asOfDate)}
      backHref="/clients"
    >
      <section className="card-tile">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kicker">
              {client.Industry} · {client.Region}
            </p>
            <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
              {client.Tier} · {client.PaymentTermsDays}-day terms
            </p>
          </div>
          <CopyBriefButton text={brief} />
        </div>
      </section>
      <StatGrid
        columns={3}
        cells={[
          { label: "Outstanding AR", value: money(outstanding) },
          { label: "Projects", value: String(cps.length) },
          { label: "Account owner", value: client.AccountOwner },
        ]}
      />

      {findings.length > 0 ? (
        <section className="space-y-2">
          <h2 className="px-1 text-[15px] font-normal leading-5">
            Escalation
          </h2>
          <CardStack>
            {findings.slice(0, 4).map((f) => (
              <div
                key={f.id}
                className="card-tile overflow-hidden !p-0"
              >
                <FindingCard finding={f} />
              </div>
            ))}
          </CardStack>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="px-1 text-[15px] font-normal leading-5">Projects</h2>
        <CardStack>
          {cps.map((p) => {
            const m = metrics.find((x) => x.ProjectID === p.ProjectID);
            return (
              <EntityCard
                key={p.ProjectID}
                href={`/projects/${p.ProjectID}`}
                kicker={`${p.Status} · ${p.Phase}`}
                title={p.ProjectName}
                rag={m?.OverallRAG}
                tone={ragTone(m?.OverallRAG)}
                figure={m ? pct(m.ForecastMarginPct) : undefined}
                figureLabel="Margin"
                figureTone={
                  m && m.ForecastMarginPct < 0 ? "bad" : "neutral"
                }
              />
            );
          })}
        </CardStack>
      </section>
    </AppShell>
  );
}
