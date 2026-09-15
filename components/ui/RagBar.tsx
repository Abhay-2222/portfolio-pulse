import { money } from "@/lib/format";

export function RagBar({
  off,
  watch,
  on,
}: {
  off: number;
  watch: number;
  on: number;
}) {
  const total = off + watch + on;
  if (total <= 0) return null;
  return (
    <div
      className="mt-4"
      role="img"
      aria-label={`${off} off track, ${watch} watch, ${on} on track`}
    >
      <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        {off > 0 ? (
          <div
            className="h-full bg-[var(--off-track)]"
            style={{ width: `${(off / total) * 100}%` }}
          />
        ) : null}
        {watch > 0 ? (
          <div
            className="h-full bg-[var(--watch)]"
            style={{ width: `${(watch / total) * 100}%` }}
          />
        ) : null}
        {on > 0 ? (
          <div
            className="h-full bg-[var(--on-track)]"
            style={{ width: `${(on / total) * 100}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

export function AgingBar({
  current,
  d30,
  d60,
  d90,
}: {
  current: number;
  d30: number;
  d60: number;
  d90: number;
}) {
  const total = current + d30 + d60 + d90;
  if (total <= 0) return null;
  const segs = [
    { id: "current", n: current, color: "var(--on-track)" },
    { id: "d30", n: d30, color: "var(--watch)" },
    { id: "d60", n: d60, color: "var(--off-track)" },
    { id: "d90", n: d90, color: "var(--off-track-text)" },
  ].filter((s) => s.n > 0);
  return (
    <div className="mt-1.5">
      <div
        className="flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]"
        role="img"
        aria-label={`Current ${money(current)}, 1 to 30 ${money(d30)}, 31 to 60 ${money(d60)}, 60 plus ${money(d90)}`}
      >
        {segs.map((s) => (
          <div
            key={s.id}
            className="h-full"
            style={{ width: `${(s.n / total) * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-4 text-[var(--ink-2)]">
        <AgingLegend color="var(--on-track)" label={`Current ${money(current)}`} />
        <AgingLegend color="var(--watch)" label={`1–30 ${money(d30)}`} />
        <AgingLegend color="var(--off-track)" label={`31–60 ${money(d60)}`} />
        <AgingLegend color="var(--off-track-text)" label={`60+ ${money(d90)}`} />
      </div>
    </div>
  );
}

function AgingLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

