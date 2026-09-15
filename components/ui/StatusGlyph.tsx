import { severityLabel, severityToRag } from "@/lib/metrics/labels";

export function StatusGlyph({
  rag,
  size = 14,
  showLabel = false,
  label: labelOverride,
}: {
  rag: string;
  size?: number;
  showLabel?: boolean;
  label?: string;
}) {
  const mapped = severityToRag(rag);
  const color =
    mapped === "Red"
      ? "var(--off-track)"
      : mapped === "Amber"
        ? "var(--watch)"
        : mapped === "Green"
          ? "var(--on-track)"
          : "var(--not-started)";
  const label = labelOverride ?? (["Red", "Amber", "Green", "N/A"].includes(rag)
    ? severityLabel(rag)
    : rag);

  const glyph =
    mapped === "Amber" ? (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
        <polygon points="7,1.2 13,7 7,12.8 1,7" fill={color} />
      </svg>
    ) : mapped === "Red" ? (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
        <polygon points="7,1.5 12.5,12.5 1.5,12.5" fill={color} />
      </svg>
    ) : mapped === "Green" ? (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
        <circle
          cx="7"
          cy="7"
          r="5"
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
      </svg>
    ) : (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
        <circle
          cx="7"
          cy="7"
          r="5"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />
      </svg>
    );

  if (!showLabel) {
    return (
      <span className="inline-flex" title={label} aria-label={label}>
        {glyph}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      {glyph}
      <span className="text-[12px] text-[var(--ink)]">{label}</span>
    </span>
  );
}
