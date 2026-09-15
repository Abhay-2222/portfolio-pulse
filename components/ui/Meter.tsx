export function MeterBar({
  value,
  reference,
  label,
  tone = "neutral",
  formatValue,
  showValue = true,
  className = "mt-1.5",
}: {
  value: number;
  reference: number;
  label: string;
  tone?: "good" | "watch" | "bad" | "neutral";
  formatValue?: (n: number) => string;
  showValue?: boolean;
  className?: string;
}) {
  const scale = Math.max(value, reference, 1) * (value > reference ? 1.08 : 1);
  const fill = Math.max(2, (Math.max(0, value) / scale) * 100);
  const mark = (reference / scale) * 100;
  const color =
    tone === "bad"
      ? "var(--off-track)"
      : tone === "watch"
        ? "var(--watch)"
        : tone === "good"
          ? "var(--on-track)"
          : "var(--ink)";
  const shown = formatValue ? formatValue(value) : String(value);
  return (
    <div className={className}>
      {showValue ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="kicker">{label}</span>
          <span className="text-[11px] font-normal text-[var(--ink-2)]">
            {shown}
          </span>
        </div>
      ) : (
        <span className="sr-only">{label}</span>
      )}
      <div
        className={`relative h-2 w-full overflow-visible rounded-full bg-[var(--surface-2)] ${
          showValue ? "mt-1.5" : ""
        }`}
        role="img"
        aria-label={`${label} ${shown}, mark at ${reference}`}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(fill, 100)}%`, background: color }}
        />
        <div
          className="absolute top-[-3px] h-3.5 w-px bg-[var(--ink)]"
          style={{ left: `${Math.min(Math.max(mark, 0), 100)}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

/** @deprecated Prefer MeterBar with a visible label and reference mark. */
export function Meter({
  value,
  max = 100,
  tone = "neutral",
  label,
}: {
  value: number;
  max?: number;
  tone?: "good" | "watch" | "bad" | "neutral";
  label?: string;
}) {
  return (
    <MeterBar
      value={value}
      reference={max}
      label={label ?? "Value"}
      tone={tone}
    />
  );
}

export function SplitBar({
  left,
  right,
  leftLabel,
  rightLabel,
  title,
}: {
  left: number;
  right: number;
  leftLabel: string;
  rightLabel: string;
  title?: string;
}) {
  const total = left + right;
  if (total <= 0) return null;
  return (
    <div className="mt-0">
      {title ? (
        <p className="font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-[var(--ink-2)]">
          {title}
        </p>
      ) : null}
      <div
        className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"
        role="img"
        aria-label={`${title ? `${title}: ` : ""}${leftLabel}, ${rightLabel}`}
      >
        {left > 0 ? (
          <div
            className="h-full bg-[var(--ink)]"
            style={{ width: `${(left / total) * 100}%` }}
          />
        ) : null}
        {right > 0 ? (
          <div
            className="h-full bg-[var(--off-track)]"
            style={{ width: `${(right / total) * 100}%` }}
          />
        ) : null}
      </div>
      <p className="mt-2 text-[12px] leading-4 text-[var(--ink-2)]">
        {leftLabel} · {rightLabel}
      </p>
    </div>
  );
}
