import { notFound } from "next/navigation";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { CopyBriefButton } from "@/components/ui/CopyBriefButton";
import { SourceLink } from "@/components/ui/Provenance";
import { StatGrid } from "@/components/ui/StatGrid";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { CardStack, EntityCard } from "@/components/ui/ListCard";
import { computeRaidMetrics } from "@/lib/metrics/risk";
import { calendarDays } from "@/lib/metrics/dates";
import { pxILine } from "@/lib/metrics/labels";
import { cells } from "@/lib/ledger/cells";
import { formatAsOf, formatDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RaidBriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getPortfolioPayload();
  const item = payload.dataset.raid.find((r) => r.RAIDID === id);
  if (!item) notFound();

  const metrics = computeRaidMetrics(item, payload.dataset);
  const project = payload.dataset.projects.find(
    (p) => p.ProjectID === item.ProjectID,
  );
  const owner = payload.dataset.resources.find(
    (r) => r.EmployeeID === item.OwnerID,
  );
  const asOf = new Date(payload.asOfDate);
  const pastDays =
    item.TargetDate && item.TargetDate.getTime() < asOf.getTime()
      ? calendarDays(item.TargetDate, asOf)
      : null;
  const refs = cells(payload.dataset, [
    ["RAID", item.RAIDID, "Title"],
    ["RAID", item.RAIDID, "Type"],
    ["RAID", item.RAIDID, "Probability"],
    ["RAID", item.RAIDID, "Impact"],
    ["RAID", item.RAIDID, "CostExposure"],
    ["RAID", item.RAIDID, "OwnerID"],
    ["RAID", item.RAIDID, "Mitigation"],
    ["RAID", item.RAIDID, "TargetDate"],
  ]);
  const copy = [
    `# ${item.Title}`,
    `${item.Type} · ${metrics.Severity} · ${money(metrics.ExpectedExposure)} expected.`,
    pxILine(item.Probability, item.Impact),
    owner ? `Owner ${owner.FullName}.` : "",
    item.Mitigation ? `Mitigation: ${item.Mitigation}` : "No mitigation written.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <AppShell
      active="risks"
      title={item.Title}
      asOf={formatAsOf(payload.asOfDate)}
      backHref="/risks"
    >
      <section className="card-tile">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="kicker">
                {item.Type} · {item.Category}
              </p>
              <StatusGlyph
                rag={metrics.Severity}
                showLabel
                label={metrics.Severity}
                size={16}
              />
            </div>
            <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
              {item.Status}
            </p>
          </div>
          <CopyBriefButton text={copy} />
        </div>
        <p className="mt-3 text-[15px] leading-6 text-[var(--ink)]">
          {item.Mitigation ?? "No mitigation is written in the book."}
        </p>
        <div className="mt-2">
          <SourceLink refs={refs} compact quiet />
        </div>
      </section>
      <StatGrid
        cells={[
          {
            label: "Expected exposure",
            value: money(metrics.ExpectedExposure),
            sub: `${money(item.CostExposure)} × ${item.Probability}/5`,
          },
          {
            label: "P × I",
            value: String(item.Probability * item.Impact),
            sub: pxILine(item.Probability, item.Impact),
          },
          {
            label: "Target",
            value: item.TargetDate ? formatDate(item.TargetDate) : "—",
            tone: pastDays != null ? "bad" : "neutral",
            sub:
              pastDays != null
                ? `${pastDays} days past`
                : undefined,
          },
          {
            label: "Days open",
            value:
              item.RaisedDate != null
                ? `${calendarDays(item.RaisedDate, asOf)}d`
                : "—",
          },
        ]}
      />

      <CardStack>
        {owner ? (
          <EntityCard
            href={`/people/${owner.EmployeeID}`}
            kicker="Owner"
            title={owner.FullName}
            meta={owner.Role}
          />
        ) : null}
        {project ? (
          <EntityCard
            href={`/projects/${project.ProjectID}`}
            kicker="Project"
            title={project.ProjectName}
          />
        ) : null}
      </CardStack>
    </AppShell>
  );
}
