export function Sparkline({
  values,
  label,
  size = "md",
  onDark = false,
}: {
  values: number[];
  label: string;
  size?: "md" | "lg";
  onDark?: boolean;
}) {
  if (values.length < 2) return null;
  const w = size === "lg" ? 320 : 200;
  const h = size === "lg" ? 72 : 44;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 4 - ((v - min) / span) * (h - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const down = values[values.length - 1]! < values[0]!;
  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={size === "lg" ? "h-[72px] w-full" : "h-11 w-full"}
        role="img"
        aria-label={label}
      >
        <polyline
          fill="none"
          stroke={
            onDark
              ? down
                ? "#ffb4ae"
                : "#9ec5ea"
              : down
                ? "var(--off-track)"
                : "var(--accent)"
          }
          strokeWidth={size === "lg" ? 2.25 : 1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
      <p
        className={`text-[12px] leading-4 ${
          onDark ? "text-white/70" : "text-[var(--ink-3)]"
        }`}
      >
        {label}
      </p>
    </div>
  );
}
