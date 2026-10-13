import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { CardStack, EntityCard, ragTone } from "@/components/ui/ListCard";
import { StatGrid } from "@/components/ui/StatGrid";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { requireSession } from "@/lib/pmo/auth";
import { getHistory, getProject, loadFailed, latestAsOf } from "@/lib/pmo/queries";
import { EMPTY_FIGURE, formatAsOf, formatDate, money, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const me = await requireSession();
  const { code } = await params;
  const project = getProject(me.userId, decodeURIComponent(code), me.canViewFinancials);
  if (project === "not_found") notFound();
  const history = getHistory(me.userId, project.code, 26);
  const weeks = history === "not_found" ? [] : history;

  return (
    <AppShell
      active="projects"
      title={project.name}
      backHref="/projects"
      asOf={formatAsOf(latestAsOf())}
      meName={me.name}
      refreshFailed={loadFailed()}
    >
      <div className="px-1">
        <p className="kicker">{project.code} · {project.programName}</p>
        <h2 className="page-title mt-1">{project.name}</h2>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-[var(--ink-2)]">
          <StatusGlyph rag={project.calculatedRag ?? "N/A"} showLabel />
          {project.reportedRag ? `PM said ${project.reportedRag}` : "No status"}
          {project.healthCheck ? ` · ${project.healthCheck}` : ""}
        </p>
        {project.healthReason ? (
          <p className="mt-2 text-[13px] leading-5">{project.healthReason}</p>
        ) : null}
        {project.dataGaps ? (
          <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
            Data gap: {project.dataGaps}
          </p>
        ) : null}
      </div>

      <StatGrid
        cells={[
          {
            label: "Calculated",
            value: project.calculatedRag ?? EMPTY_FIGURE,
            tone: ragTone(project.calculatedRag ?? undefined) === "bad" ? "bad" : "neutral",
          },
          {
            label: "Reported",
            value: project.reportedRag ?? "No status",
          },
          {
            label: "Slip",
            value:
              project.dates.slipDays == null
                ? EMPTY_FIGURE
                : `${project.dates.slipDays}d`,
            tone:
              (project.dates.slipDays ?? 0) > 45 ? "bad" : "neutral",
          },
          {
            label: "Complete",
            value:
              project.pctComplete == null ? EMPTY_FIGURE : pct(project.pctComplete),
          },
        ]}
      />

      <section className="card-tile">
        <p className="kicker">Dates</p>
        <p className="mt-2 text-[13px] leading-5 text-[var(--ink-2)]">
          Baseline finish {formatDate(project.dates.baselineFinish)} · Forecast{" "}
          {formatDate(project.dates.forecastFinish)}
        </p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
          Baseline v{project.dates.baselineVersion}
          {project.dates.baselineVersion > 1
            ? ` · ${project.dates.slipVsOriginalDays ?? EMPTY_FIGURE}d vs original`
            : ""}
        </p>
      </section>

      {weeks.length > 0 ? (
        <section className="card-tile">
          <p className="kicker">26 weeks</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {weeks.map((w) => (
              <span
                key={w.weekEnding}
                title={`${w.weekEnding}: reported ${w.reportedRag ?? "none"}, calculated ${w.calculatedRag ?? "n/a"}`}
                className="h-3 w-3 rounded-[2px]"
                style={{
                  background:
                    w.calculatedRag === "Red"
                      ? "var(--off-track)"
                      : w.calculatedRag === "Amber"
                        ? "var(--watch)"
                        : w.calculatedRag === "Green"
                          ? "var(--on-track)"
                          : "var(--ink-3)",
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {project.money ? (
        <section className="card-tile">
          <p className="kicker">Money</p>
          <p className="mt-2 text-[16px] leading-5">
            {project.money.forecastAtCompletion != null
              ? money(project.money.forecastAtCompletion)
              : EMPTY_FIGURE}{" "}
            forecast
          </p>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">
            Budget{" "}
            {project.money.approvedBudget != null
              ? money(project.money.approvedBudget)
              : EMPTY_FIGURE}
            {project.money.costVarPct != null
              ? ` · ${pct(project.money.costVarPct)} vs budget`
              : ""}
          </p>
        </section>
      ) : null}

      {project.raid.length > 0 ? (
        <section className="space-y-2">
          <p className="kicker px-1">RAID</p>
          <CardStack>
            {project.raid.map((r) => (
              <EntityCard
                key={r.raidId}
                kicker={`${r.type} · ${r.status}`}
                title={r.title}
                meta={[r.owner, r.dueDate ? formatDate(r.dueDate) : null]
                  .filter(Boolean)
                  .join(" · ")}
                rag={r.severity ?? undefined}
                tone={ragTone(r.severity ?? undefined)}
              />
            ))}
          </CardStack>
        </section>
      ) : null}

      {project.team.length > 0 ? (
        <section className="space-y-2">
          <p className="kicker px-1">Team</p>
          <CardStack>
            {project.team.map((t) => (
              <EntityCard
                key={`${t.name}-${t.projectRole}`}
                title={t.name}
                meta={t.projectRole ?? undefined}
                figure={pct(t.ftePct, 0)}
                figureLabel="FTE"
              />
            ))}
          </CardStack>
        </section>
      ) : null}

      {project.commentary.statusCommentary || project.commentary.nextSteps ? (
        <section className="card-tile space-y-2">
          <p className="kicker">Commentary</p>
          {project.commentary.statusCommentary ? (
            <p className="text-[13px] leading-5">{project.commentary.statusCommentary}</p>
          ) : null}
          {project.commentary.nextSteps ? (
            <p className="text-[13px] leading-5 text-[var(--ink-2)]">
              Next: {project.commentary.nextSteps}
            </p>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}
