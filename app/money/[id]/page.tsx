import { notFound } from "next/navigation";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { CopyBriefButton } from "@/components/ui/CopyBriefButton";
import { SourceLink } from "@/components/ui/Provenance";
import { StatGrid } from "@/components/ui/StatGrid";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { CardStack, EntityCard, ragTone } from "@/components/ui/ListCard";
import { ChaseActions } from "@/components/money/ChaseActions";
import { computeInvoiceMetrics } from "@/lib/metrics/finance";
import { collectabilityScore, rankWord } from "@/lib/metrics/derived";
import { cells } from "@/lib/ledger/cells";
import { formatAsOf, formatDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoiceBriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getPortfolioPayload();
  const invoice = payload.dataset.invoices.find((i) => i.InvoiceID === id);
  if (!invoice) notFound();

  const metrics = computeInvoiceMetrics(invoice, payload.dataset);
  const project = payload.dataset.projects.find(
    (p) => p.ProjectID === invoice.ProjectID,
  );
  const client = project
    ? payload.dataset.clients.find((c) => c.ClientID === project.ClientID)
    : undefined;
  const projectM = payload.metrics.projects.find(
    (m) => m.ProjectID === invoice.ProjectID,
  );
  const milestone = invoice.MilestoneID
    ? payload.dataset.milestones.find((m) => m.MilestoneID === invoice.MilestoneID)
    : undefined;
  const overdueRanked = payload.dataset.invoices
    .map((inv) => {
      const im = computeInvoiceMetrics(inv, payload.dataset);
      const proj = payload.dataset.projects.find(
        (p) => p.ProjectID === inv.ProjectID,
      );
      const cl = proj
        ? payload.dataset.clients.find((c) => c.ClientID === proj.ClientID)
        : undefined;
      const pm = payload.metrics.projects.find(
        (m) => m.ProjectID === inv.ProjectID,
      );
      return {
        id: inv.InvoiceID,
        status: im.Status,
        score: collectabilityScore({
          amount: inv.Amount,
          daysOverdue: im.DaysOverdue,
          clientTier: cl?.Tier ?? "",
          projectRag: pm?.OverallRAG ?? "",
        }),
      };
    })
    .filter((r) => r.status === "Overdue")
    .sort((a, b) => b.score - a.score);
  const chaseRank =
    overdueRanked.findIndex((r) => r.id === invoice.InvoiceID) + 1;
  const refs = cells(payload.dataset, [
    ["Invoices", invoice.InvoiceID, "Amount"],
    ["Invoices", invoice.InvoiceID, "InvoiceDate"],
    ["Invoices", invoice.InvoiceID, "PaidDate"],
    ["Invoices", invoice.InvoiceID, "Description"],
    ["Clients", project?.ClientID ?? "", "PaymentTermsDays"],
    ["Clients", project?.ClientID ?? "", "Tier"],
  ]);
  const projectRagLabel =
    projectM?.OverallRAG === "Red"
      ? "off track"
      : projectM?.OverallRAG === "Amber"
        ? "watch"
        : "on track";
  const chaseNote = [
    `Chase ${invoice.InvoiceID}`,
    client ? client.ClientName : "",
    money(invoice.Amount),
    metrics.DaysOverdue > 0 ? `${metrics.DaysOverdue} days overdue` : `due ${formatDate(metrics.DueDate)}`,
    metrics.AgingBucket,
    project ? `${project.ProjectName} is ${projectRagLabel}` : "",
    client ? `${client.Tier} client · ${client.PaymentTermsDays}-day terms` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const copy = [
    `# ${invoice.InvoiceID}`,
    `${money(invoice.Amount)} · ${metrics.Status} · ${metrics.AgingBucket}.`,
    project ? `Project ${project.ProjectName}.` : "",
    client
      ? `Client ${client.ClientName}, ${client.PaymentTermsDays}-day terms.`
      : "",
    metrics.DaysOverdue > 0
      ? `${metrics.DaysOverdue} days overdue.`
      : `Due ${formatDate(metrics.DueDate)}.`,
    chaseRank > 0
      ? `Chase this one ${rankWord(chaseRank)} of ${overdueRanked.length}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  const findingId = `money.overdue_ar_ranked:${invoice.InvoiceID}`;

  return (
    <AppShell
      active="money"
      title={invoice.InvoiceID}
      asOf={formatAsOf(payload.asOfDate)}
      backHref="/money"
    >
      <section className="card-tile">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kicker">
              This invoice · {metrics.AgingBucket}
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <span
                className="text-[22px] font-normal leading-7 tracking-[-0.02em]"
                style={{
                  color:
                    metrics.Status === "Overdue"
                      ? "var(--off-track-text)"
                      : "var(--ink)",
                }}
              >
                {money(invoice.Amount)}
              </span>
              <StatusGlyph
                rag={metrics.Status}
                showLabel
                label={metrics.Status}
                size={16}
              />
            </div>
            <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
              {invoice.Description}
            </p>
          </div>
          <CopyBriefButton text={copy} />
        </div>
        {chaseRank > 0 ? (
          <p className="mt-3 text-[15px] font-normal leading-5">
            Chase this one {rankWord(chaseRank)} of {overdueRanked.length}.
          </p>
        ) : null}
        <div className="mt-2">
          <SourceLink refs={refs} compact quiet />
        </div>
        {metrics.Status === "Overdue" ? (
          <ChaseActions findingId={findingId} note={chaseNote} />
        ) : null}
      </section>
      <StatGrid
        columns={3}
        cells={[
          {
            label: "Amount",
            value: money(invoice.Amount),
            tone: metrics.Status === "Overdue" ? "bad" : "neutral",
          },
          { label: "Due", value: formatDate(metrics.DueDate) },
          { label: "Invoiced", value: formatDate(invoice.InvoiceDate) },
        ]}
      />

      {project ? (
        <CardStack>
          <EntityCard
            href={`/projects/${project.ProjectID}`}
            kicker="Project"
            title={project.ProjectName}
            meta={projectM ? `Project is ${projectRagLabel}` : undefined}
            rag={projectM?.OverallRAG}
            tone={ragTone(projectM?.OverallRAG)}
          />
          {client ? (
            <EntityCard
              href={`/clients/${client.ClientID}`}
              kicker="Client"
              title={client.ClientName}
              meta={`${client.Tier} · ${client.PaymentTermsDays}-day terms`}
            />
          ) : null}
          {milestone ? (
            <EntityCard
              kicker="Milestone"
              title={milestone.MilestoneName}
            />
          ) : null}
        </CardStack>
      ) : null}
    </AppShell>
  );
}
