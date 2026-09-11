export function StatusGlyph({
  rag,
  size = 14,
}: {
  rag: string;
  size?: number;
}) {
  const color =
    rag === "Red"
      ? "var(--off-track)"
      : rag === "Amber"
        ? "var(--watch)"
        : rag === "Green"
          ? "var(--on-track)"
          : "var(--not-started)";

  if (rag === "Amber") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-label="Watch">
        <polygon points="7,1.5 12.5,12.5 1.5,12.5" fill={color} />
      </svg>
    );
  }
  if (rag === "Red") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-label="Off track">
        <rect x="2" y="2" width="10" height="10" rx="1.5" fill={color} />
      </svg>
    );
  }
  if (rag === "Green") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-label="On track">
        <circle cx="7" cy="7" r="5.5" fill={color} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-label="Not started">
      <circle cx="7" cy="7" r="5" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
