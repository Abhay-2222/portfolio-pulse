export type StatCell = {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  tone?: "bad" | "neutral" | "good";
};

export function StatGrid({
  cells,
  columns = 2,
}: {
  cells: StatCell[];
  columns?: 2 | 3;
}) {
  return (
    <div
      className={`grid gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}
    >
      {cells.map((c) => (
        <StatCellView
          key={c.label}
          {...c}
          size={columns === 3 ? "sm" : "md"}
        />
      ))}
    </div>
  );
}

export function StatCellView({
  label,
  value,
  sub,
  delta,
  tone = "neutral",
  size = "md",
}: StatCell & { size?: "sm" | "md" }) {
  const color =
    tone === "bad"
      ? "var(--off-track-text)"
      : tone === "good"
        ? "var(--on-track)"
        : "var(--ink)";
  const tile =
    tone === "bad"
      ? "card-tile card-tile--bad"
      : tone === "good"
        ? "card-tile card-tile--good"
        : "card-tile";
  return (
    <div className={tile}>
      <div className="kicker">{label}</div>
      <div
        className={`mt-1 figure ${
          size === "sm" ? "!text-[16px] !leading-5" : ""
        }`}
        style={{ color }}
      >
        {value}
      </div>
      {delta || sub ? (
        <div className="mt-1 text-[12px] leading-4 text-[var(--ink-2)]">
          {[delta, sub].filter(Boolean).join(" · ")}
        </div>
      ) : null}
    </div>
  );
}
