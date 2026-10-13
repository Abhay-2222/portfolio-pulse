import { AppShell } from "@/components/shell/AppShell";
import { CardStack, EntityCard, ragTone } from "@/components/ui/ListCard";
import { requireSession } from "@/lib/pmo/auth";
import { getStatus, loadFailed } from "@/lib/pmo/queries";
import { formatAsOf } from "@/lib/format";
import { signOut } from "@/app/signin/actions";
import { btnDefer } from "@/components/ui/Button";
import { pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const me = await requireSession();
  const status = getStatus();

  return (
    <AppShell
      active="status"
      title="Data"
      asOf={formatAsOf(status.asOf)}
      meName={me.name}
      refreshFailed={loadFailed()}
    >
      <div className="px-1">
        <p className="page-title">Data status</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
          Signed in as {me.name} ({me.role}
          {me.canViewFinancials ? "" : ", no financials"}).
        </p>
      </div>

      <section className="card-tile">
        <p className="kicker">As of</p>
        <p className="mt-1 text-[16px] leading-5">{formatAsOf(status.asOf)}</p>
        <p className="mt-1.5 text-[13px] text-[var(--ink-2)]">
          Last load {status.lastLoad.status.toLowerCase()} from{" "}
          {status.lastLoad.sourceSystem}
        </p>
      </section>

      <section className="card-tile">
        <p className="kicker">Health rules</p>
        <ul className="mt-2 space-y-1 text-[13px] leading-5 text-[var(--ink-2)]">
          <li>
            Schedule: up to {status.rules.scheduleGreenDays}d late Green, up to{" "}
            {status.rules.scheduleAmberDays}d Amber
          </li>
          <li>
            Cost: up to {pct(status.rules.costGreenPct, 0)} over Green, up to{" "}
            {pct(status.rules.costAmberPct, 0)} Amber
          </li>
          <li>
            Issues: any Critical is Red. {status.rules.highIssuesForAmber}+ High
            is Amber
          </li>
          <li>Stale after {status.rules.staleDays} days without a PM update</li>
        </ul>
      </section>

      <section className="space-y-2">
        <p className="kicker px-1">Loads</p>
        <CardStack>
          {status.recentLoads.map((l) => (
            <EntityCard
              key={l.loadId}
              kicker={`${l.sourceType ?? "SQL"} · ${formatAsOf(l.dataAsOf)}`}
              title={l.sourceSystem}
              meta={l.notes ?? l.status}
              tone={ragTone(
                l.status === "Failed"
                  ? "Red"
                  : l.status === "Partial"
                    ? "Amber"
                    : "Green",
              )}
            />
          ))}
        </CardStack>
      </section>

      <form action={signOut}>
        <button type="submit" className={`${btnDefer} w-full`}>
          Sign out
        </button>
      </form>
    </AppShell>
  );
}
