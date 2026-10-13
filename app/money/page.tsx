import { AppShell } from "@/components/shell/AppShell";
import { CardStack, EntityCard } from "@/components/ui/ListCard";
import { requireSession } from "@/lib/pmo/auth";
import { getMoney, latestAsOf, loadFailed } from "@/lib/pmo/queries";
import { formatAsOf, money, pct } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const me = await requireSession();
  const rows = me.canViewFinancials ? getMoney(me.userId) : [];

  return (
    <AppShell
      active="money"
      title="Money"
      asOf={formatAsOf(latestAsOf())}
      meName={me.name}
      refreshFailed={loadFailed()}
    >
      {!me.canViewFinancials ? (
        <p className="card-tile text-[13px] leading-5 text-[var(--ink-2)]">
          This account cannot view financials. Sign in as PMO Admin or Finance
          to see budget vs forecast.
        </p>
      ) : (
        <>
          <p className="px-1 text-[13px] text-[var(--ink-2)]">
            Approved budget vs forecast at completion, by program. CAD.
          </p>
          <CardStack>
            {rows.map((r) => (
              <EntityCard
                key={r.programId}
                href={`/projects?programId=${r.programId}`}
                title={r.programName}
                meta={`Budget ${money(r.approvedBudget)}`}
                figure={
                  r.costVarPct == null ? "n/a" : pct(r.costVarPct)
                }
                figureLabel="Variance"
                figureTone={
                  r.costVarPct != null && r.costVarPct > 0.05 ? "bad" : "neutral"
                }
                tone={
                  r.costVarPct != null && r.costVarPct > 0.1
                    ? "bad"
                    : r.costVarPct != null && r.costVarPct > 0.05
                      ? "watch"
                      : "neutral"
                }
              />
            ))}
          </CardStack>
        </>
      )}
      <p className="px-1 text-[12px] text-[var(--ink-3)]">
        <Link href="/guide" className="text-[var(--accent)]">
          Guide
        </Link>
      </p>
    </AppShell>
  );
}
