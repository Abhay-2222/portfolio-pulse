import Link from "next/link";
import type { ReactNode } from "react";
import { StatusGlyph } from "@/components/ui/StatusGlyph";

export function CardStack({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export function SectionLabel({
  kicker,
  children,
}: {
  kicker: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-1">
      <p className="kicker">{kicker}</p>
      {children ? (
        <p className="mt-1 text-[12px] leading-4 text-[var(--ink-2)]">
          {children}
        </p>
      ) : null}
    </div>
  );
}

export function ragTone(
  rag: string | undefined,
): "bad" | "watch" | "good" | "neutral" {
  if (rag === "Red" || rag === "Critical" || rag === "Overdue") return "bad";
  if (rag === "Amber" || rag === "High" || rag === "Watch") return "watch";
  if (rag === "Green" || rag === "On track") return "good";
  return "neutral";
}

const toneClass = {
  bad: "card-tile card-tile--bad",
  watch: "card-tile card-tile--watch",
  good: "card-tile card-tile--good",
  neutral: "card-tile",
} as const;

export function EntityCard({
  href,
  kicker,
  title,
  meta,
  figure,
  figureLabel,
  figureTone,
  tone = "neutral",
  rag,
  children,
}: {
  href?: string;
  kicker?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  figure?: ReactNode;
  figureLabel?: string;
  figureTone?: "bad" | "neutral";
  tone?: "bad" | "watch" | "good" | "neutral";
  rag?: string;
  children?: ReactNode;
}) {
  const inner = (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <p
          className={`text-[16px] font-normal leading-5 tracking-[-0.02em] ${
            kicker ? "mt-1" : ""
          }`}
        >
          {title}
        </p>
        {meta || rag ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-4 text-[var(--ink-2)]">
            {rag ? <StatusGlyph rag={rag} size={12} /> : null}
            {meta ? <span>{meta}</span> : null}
          </div>
        ) : null}
        {children}
      </div>
      {figure != null ? (
        <div className="shrink-0 text-right">
          {figureLabel ? <p className="kicker">{figureLabel}</p> : null}
          <p
            className={`font-normal tabular-nums tracking-[-0.03em] ${
              figureLabel ? "mt-1 text-[16px] leading-5" : "text-[16px] leading-5"
            }`}
            style={{
              color:
                figureTone === "bad" ? "var(--off-track-text)" : "var(--ink)",
            }}
          >
            {figure}
          </p>
        </div>
      ) : null}
    </div>
  );

  const className = `${toneClass[tone]} block`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
