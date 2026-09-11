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

  const labelClass =
    tone === "accent"
      ? "text-white/55"
      : "text-[var(--accent)] opacity-70";

  return (
    <section
      className={`rounded-[16px] border p-4 md:p-[18px] ${toneClass} ${className}`}
    >
      <div
        className={`mb-3 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.14em] ${labelClass}`}
      >
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
        className={`text-[36px] font-extrabold leading-none tracking-[-0.04em] ${
          inverted ? "text-white" : "text-[var(--accent)]"
        }`}
      >
        {value}
      </div>
      <div
        className={`mt-1 font-[family-name:var(--font-mono)] text-[9px] font-medium uppercase tracking-[0.1em] ${
          inverted ? "text-white/55" : "text-black/45"
        }`}
      >
        {unit}
      </div>
    </div>
  );
}
