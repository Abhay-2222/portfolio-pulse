import type { ReactNode } from "react";

export function BentoCard({
  label,
  children,
  tone = "default",
  className = "",
}: {
  label: string;
  children: ReactNode;
  tone?: "default" | "soft" | "accent";
  className?: string;
}) {
  const toneClass =
    tone === "accent"
      ? "border-transparent bg-[linear-gradient(150deg,rgba(46,109,180,0.88),#2E6DB4)] text-white"
      : tone === "soft"
        ? "border-[rgba(46,109,180,0.12)] bg-[var(--surface)]"
        : "border-[var(--tile-border)] bg-[var(--surface)]";

  const labelClass = tone === "accent" ? "text-white/55" : "";

  return (
    <section
      className={`rounded-[16px] border p-4 md:p-[18px] ${toneClass} ${className}`}
    >
      <div className={`kicker mb-3 ${labelClass}`}>
        {label}
      </div>
      {children}
    </section>
  );
}

export function MetricStat({
  value,
  unit,
  inverted = false,
}: {
  value: string;
  unit: string;
  inverted?: boolean;
}) {
  return (
    <div>
      <div
        className={`figure ${
          inverted ? "text-white" : "text-[var(--accent)]"
        }`}
      >
        {value}
      </div>
      <div
        className={`kicker mt-1 ${
          inverted ? "text-white/55" : ""
        }`}
      >
        {unit}
      </div>
    </div>
  );
}
