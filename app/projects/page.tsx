import { AppShell } from "@/components/shell/AppShell";
import { CardStack } from "@/components/ui/ListCard";
import { FilterChips } from "@/components/ui/FilterChips";
import { ProjectRow } from "@/components/pmo/ProjectRow";
import { requireSession } from "@/lib/pmo/auth";
import { listProjects, loadFailed, latestAsOf } from "@/lib/pmo/queries";
import { formatAsOf } from "@/lib/format";
import type { Lifecycle, Rag } from "@/lib/pmo/types";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    programId?: string;
    rag?: string;
    lifecycle?: string;
    stale?: string;
    health?: string;
    q?: string;
  }>;
}) {
  const me = await requireSession();
  const params = await searchParams;
  const { items } = listProjects(me.userId, {
    programId: params.programId,
    calculatedRag: (params.rag as Rag | undefined) || undefined,
    lifecycle: (params.lifecycle as Lifecycle | undefined) || undefined,
    stale: params.stale === "1",
    healthCheck:
      params.health === "watermelon"
        ? "Reported better than data"
        : params.health === "none"
          ? "No status reported"
          : undefined,
    q: params.q,
    limit: 200,
    sort: "severity",
  });

  const base = params.programId ? `?programId=${params.programId}&` : "?";
  const chips = [
    { label: "All live", href: `${base}lifecycle=Active`, active: !params.rag && !params.stale && !params.health && params.lifecycle !== "On Hold" },
    { label: "Red", href: `${base}rag=Red`, active: params.rag === "Red" },
    { label: "Amber", href: `${base}rag=Amber`, active: params.rag === "Amber" },
    { label: "Stale", href: `${base}stale=1`, active: params.stale === "1" },
    { label: "Watermelon", href: `${base}health=watermelon`, active: params.health === "watermelon" },
  ];

  return (
    <AppShell
      active="projects"
      title="Projects"
      asOf={formatAsOf(latestAsOf())}
      meName={me.name}
      refreshFailed={loadFailed()}
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 text-[13px] text-[var(--ink-2)]">
          {items.length} project{items.length === 1 ? "" : "s"}
        </p>
        <FilterChips label="Projects" chips={chips} />
      </div>
      <CardStack>
        {items.map((p) => (
          <ProjectRow key={p.code} project={p} />
        ))}
      </CardStack>
    </AppShell>
  );
}
