import Link from "next/link";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { FilterChips } from "@/components/ui/FilterChips";
import { MeterBar } from "@/components/ui/Meter";
import { CardStack, EntityCard } from "@/components/ui/ListCard";
import { PeopleSearch } from "@/components/people/PeopleSearch";
import { formatAsOf, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

function peopleHref(status?: string, q?: string) {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  if (q) p.set("q", q);
  const s = p.toString();
  return s ? `/people?${s}` : "/people";
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const payload = await getPortfolioPayload();
  const resources = new Map(
    payload.dataset.resources.map((r) => [r.EmployeeID, r]),
  );

  let rows = payload.metrics.resources.map((m) => ({
    metrics: m,
    resource: resources.get(m.EmployeeID)!,
  }));

  const status = params.status;
  const q = (params.q ?? "").trim();
  if (status) {
    rows = rows.filter((r) => r.metrics.UtilizationStatus === status);
  }
  const segmentN = rows.length;
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => {
      const hay = [
        r.resource.FullName,
        r.resource.Role,
        r.resource.Department,
        r.resource.PrimarySkill,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }

  rows.sort((a, b) => {
    const rank = (s: string) =>
      s === "Overallocated"
        ? 0
        : s === "Under-utilized"
          ? 1
          : s === "Healthy"
            ? 2
            : 3;
    const d =
      rank(a.metrics.UtilizationStatus) - rank(b.metrics.UtilizationStatus);
    if (d !== 0) return d;
    return b.metrics.CurrentAllocationPct - a.metrics.CurrentAllocationPct;
  });

  const chips = [
    { label: "All", href: peopleHref(undefined, q), active: !status },
    {
      label: "Over",
      href: peopleHref("Overallocated", q),
      active: status === "Overallocated",
    },
    {
      label: "Bench",
      href: peopleHref("Under-utilized", q),
      active: status === "Under-utilized",
    },
    {
      label: "Healthy",
      href: peopleHref("Healthy", q),
      active: status === "Healthy",
    },
  ];

  const swaps = payload.findings.filter(
    (f) => f.ruleId === "people.overallocated_with_swap",
  );
  const swapByPerson = new Map<string, (typeof swaps)[number]>();
  for (const f of swaps) {
    swapByPerson.set(f.subject.id, f);
    for (const r of f.related) {
      if (r.type === "person") swapByPerson.set(r.id, f);
    }
  }
  const kpis = payload.metrics.portfolio;
  const n = rows.length;
  const countCopy = q
    ? `${n} of ${segmentN} · named`
    : status === "Overallocated"
      ? `${n} overallocated`
      : status === "Under-utilized"
        ? `${n} on the bench · ${Math.round(kpis.benchCapacityHrs)} hrs/week free`
        : status === "Healthy"
          ? `${n} healthy`
          : `${kpis.overallocated} overallocated · ${kpis.underUtilized} on the bench · ${Math.round(kpis.benchCapacityHrs)} hrs/week free`;

  return (
    <AppShell active="people" title="People" asOf={formatAsOf(payload.asOfDate)}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <PeopleSearch status={status} q={q} />
        </div>
        <FilterChips label="People" chips={chips} />
      </div>

      {swaps[0] && !q ? (
        <Link
          href={swaps[0].href}
          className="card-tile block border-l-[3px] border-l-[var(--accent)]"
        >
          <p className="kicker">
            {swaps[0].kicker ?? "These people · swap"}
          </p>
          <p className="mt-1 text-[15px] font-normal leading-5">
            {swaps[0].move ?? swaps[0].headline}
          </p>
          {swaps[0].consequence ? (
            <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
              {swaps[0].consequence}
            </p>
          ) : null}
        </Link>
      ) : null}

      <p className="px-1 text-[13px] text-[var(--ink-2)]">{countCopy}</p>

      <CardStack>
        {rows.map((row) => {
          const alloc = row.metrics.CurrentAllocationPct;
          const tone =
            row.metrics.UtilizationStatus === "Overallocated"
              ? "bad"
              : row.metrics.UtilizationStatus === "Under-utilized"
                ? "watch"
                : "good";
          const swap = swapByPerson.get(row.resource.EmployeeID);
          const swapNote =
            swap && swap.subject.id === row.resource.EmployeeID
              ? swap.move
              : swap
                ? `Can take work from ${swap.subject.label}`
                : null;
          return (
            <EntityCard
              key={row.resource.EmployeeID}
              href={`/people/${row.resource.EmployeeID}`}
              kicker={row.resource.Role}
              title={row.resource.FullName}
              meta={[row.resource.PrimarySkill, swapNote]
                .filter(Boolean)
                .join(" · ")}
              tone={tone}
              figure={pct(alloc, 0)}
              figureLabel="Alloc"
              figureTone={
                row.metrics.UtilizationStatus === "Overallocated"
                  ? "bad"
                  : "neutral"
              }
            >
              <MeterBar
                value={alloc * 100}
                reference={100}
                tone={tone}
                label="Total allocation"
                formatValue={() => pct(alloc, 0)}
                showValue={false}
              />
            </EntityCard>
          );
        })}
        {rows.length === 0 ? (
          <p className="card-tile text-[15px] text-[var(--ink-2)]">
            {q ? (
              <>
                No one matches “{q}”.{" "}
                <Link href={peopleHref(status)} className="text-[var(--accent)]">
                  Clear search
                </Link>
                .
              </>
            ) : (
              <>
                No people match this filter.{" "}
                <Link href="/people" className="text-[var(--accent)]">
                  Show all
                </Link>
                .
              </>
            )}
          </p>
        ) : null}
      </CardStack>
    </AppShell>
  );
}
