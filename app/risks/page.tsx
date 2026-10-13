import { AppShell } from "@/components/shell/AppShell";
import { CardStack, EntityCard, ragTone } from "@/components/ui/ListCard";
import { FilterChips } from "@/components/ui/FilterChips";
import { requireSession } from "@/lib/pmo/auth";
import { latestAsOf, listRisks, loadFailed } from "@/lib/pmo/queries";
import { formatAsOf, formatDate } from "@/lib/format";
import type { RaidItem } from "@/lib/pmo/types";

export const dynamic = "force-dynamic";

export default async function RisksPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; severity?: string }>;
}) {
  const me = await requireSession();
  const params = await searchParams;
  const rows = listRisks(
    me.userId,
    (params.type as RaidItem["type"] | undefined) || undefined,
    (params.severity as RaidItem["severity"] | undefined) || undefined,
  );

  const chips = [
    { label: "All open", href: "/risks", active: !params.type && !params.severity },
    { label: "Risks", href: "/risks?type=Risk", active: params.type === "Risk" },
    { label: "Issues", href: "/risks?type=Issue", active: params.type === "Issue" },
    {
      label: "Critical",
      href: "/risks?severity=Critical",
      active: params.severity === "Critical",
    },
  ];

  return (
    <AppShell
      active="risks"
      title="Risks"
      asOf={formatAsOf(latestAsOf())}
      meName={me.name}
      refreshFailed={loadFailed()}
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 text-[13px] text-[var(--ink-2)]">
          {rows.length} open
        </p>
        <FilterChips label="RAID" chips={chips} />
      </div>
      <CardStack>
        {rows.map((r) => (
          <EntityCard
            key={r.raidId}
            href={`/projects/${r.projectCode}`}
            kicker={`${r.type} · ${r.projectCode}`}
            title={r.title}
            meta={[r.owner, r.dueDate ? formatDate(r.dueDate) : null, r.status]
              .filter(Boolean)
              .join(" · ")}
            rag={r.severity ?? undefined}
            tone={ragTone(r.severity ?? undefined)}
          />
        ))}
      </CardStack>
    </AppShell>
  );
}
