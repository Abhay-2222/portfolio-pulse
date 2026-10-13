import { AppShell } from "@/components/shell/AppShell";
import { CardStack, EntityCard } from "@/components/ui/ListCard";
import { requireSession } from "@/lib/pmo/auth";
import { getPeopleLoad, latestAsOf, loadFailed } from "@/lib/pmo/queries";
import { formatAsOf, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const me = await requireSession();
  const rows = getPeopleLoad(me.userId);

  return (
    <AppShell
      active="people"
      title="People"
      asOf={formatAsOf(latestAsOf())}
      meName={me.name}
      refreshFailed={loadFailed()}
    >
      <p className="px-1 text-[13px] text-[var(--ink-2)]">
        Current load on projects you can see. Over 100% is over-allocated.
      </p>
      <CardStack>
        {rows.map((p) => (
          <EntityCard
            key={p.personId}
            kicker={p.role}
            title={p.name}
            meta={`${p.projectCount} project${p.projectCount === 1 ? "" : "s"}`}
            figure={pct(p.totalFte, 0)}
            figureLabel="FTE"
            figureTone={p.overAllocated ? "bad" : "neutral"}
            tone={p.overAllocated ? "bad" : "neutral"}
          />
        ))}
      </CardStack>
    </AppShell>
  );
}
