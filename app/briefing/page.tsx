import { AppShell } from "@/components/shell/AppShell";
import { CardStack } from "@/components/ui/ListCard";
import { ProjectRow } from "@/components/pmo/ProjectRow";
import { requireSession } from "@/lib/pmo/auth";
import { getBriefing, loadFailed } from "@/lib/pmo/queries";
import { formatAsOf } from "@/lib/format";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  newlyRed: "Newly red",
  reportedBetterThanData: "Reported better than data",
  stale: "Stale",
  noStatusReported: "No status reported",
};

export default async function BriefingPage() {
  const me = await requireSession();
  const briefing = getBriefing(me.userId);

  return (
    <AppShell
      active="briefing"
      title="Briefing"
      asOf={formatAsOf(briefing.asOf)}
      meName={me.name}
      refreshFailed={loadFailed()}
    >
      <div className="px-1">
        <p className="page-title">Briefing</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
          This week&apos;s exceptions across projects you can see.
        </p>
      </div>
      {briefing.groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <p className="kicker px-1">
            {LABELS[g.key] ?? g.key} · {g.total}
          </p>
          {g.items.length === 0 ? (
            <p className="px-1 text-[13px] text-[var(--ink-2)]">None.</p>
          ) : (
            <CardStack>
              {g.items.map((p) => (
                <ProjectRow key={p.code} project={p} />
              ))}
            </CardStack>
          )}
        </section>
      ))}
    </AppShell>
  );
}
