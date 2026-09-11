import Link from "next/link";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { formatAsOf, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
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
  if (status) {
    rows = rows.filter((r) => r.metrics.UtilizationStatus === status);
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
    return (
      b.metrics.CurrentAllocationPct - a.metrics.CurrentAllocationPct
    );
  });

  const chips = [
    { label: "All", href: "/people" },
    { label: "Overallocated", href: "/people?status=Overallocated" },
    { label: "Under-utilized", href: "/people?status=Under-utilized" },
    { label: "Healthy", href: "/people?status=Healthy" },
  ];

  const kpis = payload.metrics.portfolio;

  return (
    <AppShell active="people" title="People" asOf={formatAsOf(payload.asOfDate)}>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--surface)] px-4 text-[15px] text-[var(--ink-2)]"
          >
            {c.label}
          </Link>
        ))}
      </div>

      <p className="px-1 text-[15px] text-[var(--ink-2)]">
        {kpis.overallocated} overallocated · {kpis.underUtilized} under-utilized
        · {Math.round(kpis.benchCapacityHrs)} hrs/week free
      </p>

      <div className="overflow-hidden rounded-[14px] bg-[var(--surface)]">
        {rows.map((row, idx) => (
          <Link
            key={row.resource.EmployeeID}
            href={`/people/${row.resource.EmployeeID}`}
            className={`flex min-h-14 items-center gap-3 px-4 py-3 ${
              idx === rows.length - 1 ? "" : "border-b border-[var(--hairline)]"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[17px] font-semibold leading-[22px]">
                {row.resource.FullName}
              </div>
              <div className="truncate text-[15px] text-[var(--ink-2)]">
                {row.resource.Role} · {row.resource.Department}
              </div>
            </div>
            <div
              className="text-[15px] font-medium"
              style={{
                color:
                  row.metrics.UtilizationStatus === "Overallocated"
                    ? "var(--off-track-text)"
                    : row.metrics.UtilizationStatus === "Under-utilized"
                      ? "var(--watch)"
                      : "var(--ink-2)",
              }}
            >
              {row.metrics.UtilizationStatus}
            </div>
            <div className="w-14 text-right text-[15px] font-semibold">
              {pct(row.metrics.CurrentAllocationPct, 0)}
            </div>
          </Link>
        ))}
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-[15px] text-[var(--ink-2)]">
            No people match this filter.{" "}
            <Link href="/people" className="text-[var(--accent)]">
              Show all
            </Link>
            .
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
