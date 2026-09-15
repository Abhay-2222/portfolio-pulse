import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { CardStack, EntityCard, ragTone } from "@/components/ui/ListCard";
import { crAfterPosition, daysInReview } from "@/lib/metrics/derived";
import { formatAsOf, money, pct } from "@/lib/format";
import { StatGrid } from "@/components/ui/StatGrid";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  const payload = await getPortfolioPayload();
  const asOf = new Date(payload.asOfDate);
  const projects = new Map(
    payload.dataset.projects.map((p) => [p.ProjectID, p]),
  );
  const pm = new Map(payload.metrics.projects.map((m) => [m.ProjectID, m]));

  const rows = payload.dataset.changeRequests
    .filter((c) => c.Status === "Draft" || c.Status === "Submitted")
    .map((cr) => {
      const metrics = pm.get(cr.ProjectID);
      const after = metrics ? crAfterPosition(metrics, cr) : null;
      return {
        cr,
        project: projects.get(cr.ProjectID),
        metrics,
        after,
        days: daysInReview(cr.RaisedDate, asOf),
      };
    })
    .sort((a, b) => b.days - a.days);

  const pendingCost = rows.reduce((s, r) => s + r.cr.CostImpact, 0);

  return (
    <AppShell
      active="decisions"
      title="Decisions"
      asOf={formatAsOf(payload.asOfDate)}
    >
      <StatGrid
        cells={[
          { label: "Pending CRs", value: String(rows.length) },
          { label: "Cost at stake", value: money(pendingCost) },
        ]}
      />
      <p className="px-1 text-[12px] leading-4 text-[var(--ink-2)]">
        Pending change requests with the project&apos;s position if approved.
      </p>
      <CardStack>
        {rows.map((row) => (
          <EntityCard
            key={row.cr.CRID}
            href={`/projects/${row.cr.ProjectID}`}
            kicker={`${row.cr.Status} · ${row.days}d in review`}
            title={row.cr.Title}
            meta={row.project?.ProjectName}
            rag={row.metrics?.OverallRAG}
            tone={ragTone(row.metrics?.OverallRAG)}
            figure={money(row.cr.CostImpact)}
            figureLabel="Cost"
            figureTone={row.cr.CostImpact > 0 ? "bad" : "neutral"}
          >
            {row.metrics && row.after ? (
              <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
                {pct(row.metrics.ForecastMarginPct)} → {pct(row.after.marginPct)}{" "}
                · +{row.cr.ScheduleImpactDays}d
              </p>
            ) : null}
          </EntityCard>
        ))}
      </CardStack>
    </AppShell>
  );
}
