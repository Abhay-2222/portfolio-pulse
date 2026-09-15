"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { Sparkline } from "@/components/ui/Sparkline";
import { EMPTY_FIGURE, money, pct } from "@/lib/format";

export type ProjectBento = {
  id: string;
  name: string;
  client: string;
  health: number | null;
  margin: number | null;
  targetMargin: number;
  contract: number | null;
  slip: number | null;
  rag: string;
  worstLeg: string;
  costRag: string;
  scheduleRag: string;
  marginRag: string;
  unbilled: number;
  spark: number[];
};

export function ProjectBentoCarousel({
  projects,
}: {
  projects: ProjectBento[];
}) {
  const labelId = useId();
  const start = useRef<{ x: number; y: number } | null>(null);
  const [page, setPage] = useState(0);
  const n = projects.length;

  function go(next: number) {
    setPage(Math.max(0, Math.min(n - 1, next)));
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e: React.PointerEvent) {
    const origin = start.current;
    start.current = null;
    if (!origin) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
    if (dx < 0) go(page + 1);
    else go(page - 1);
  }

  if (n === 0) return null;
  const current = projects[page];
  if (!current) return null;

  return (
    <section
      className="space-y-3"
      aria-labelledby={labelId}
      aria-roledescription="carousel"
    >
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <p id={labelId} className="kicker">
            Your projects
          </p>
          <p className="mt-1 text-[12px] leading-4 text-[var(--ink-2)]">
            {page + 1} of {n}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[var(--tile-border)] text-[15px] font-normal text-[var(--ink)] disabled:opacity-40"
            aria-label="Previous project"
            disabled={page === 0}
            onClick={() => go(page - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[var(--tile-border)] text-[15px] font-normal text-[var(--ink)] disabled:opacity-40"
            aria-label="Next project"
            disabled={page >= n - 1}
            onClick={() => go(page + 1)}
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="rounded-[20px] bg-[var(--surface)] p-1.5 shadow-[0_0_0_1px_var(--hairline)]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null;
        }}
      >
        <ProjectSpread project={current} />
      </div>
    </section>
  );
}

function ProjectSpread({ project: p }: { project: ProjectBento }) {
  const health = p.health == null ? EMPTY_FIGURE : String(Math.round(p.health));
  const healthHref = `/projects/${p.id}#health`;
  const moneyHref = `/projects/${p.id}#money`;
  const projectHref = `/projects/${p.id}`;
  const unbilledAbs = money(Math.abs(p.unbilled));

  return (
    <div className="grid grid-cols-2 gap-2">
      <Tile href={projectHref} className="col-span-2 bg-[var(--hero)]">
        <p className="kicker">{p.client}</p>
        <h3 className="mt-1 text-[17px] font-normal leading-5 tracking-[-0.02em]">
          {p.name}
        </h3>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          <Leg label="Cost" rag={p.costRag} />
          <Leg label="Schedule" rag={p.scheduleRag} />
          <Leg label="Margin" rag={p.marginRag} />
        </ul>
      </Tile>

      <Tile href={healthHref} className={healthTileClass(p.health)}>
        <p className="kicker">Health</p>
        <div className="figure mt-1.5" style={{ color: healthInk(p.health) }}>
          {health}
        </div>
      </Tile>

      <Tile href={moneyHref} className="bg-[var(--surface-2)]">
        <p className="kicker">Margin</p>
        <div
          className="figure mt-1.5"
          style={{
            color:
              p.margin == null
                ? "var(--ink)"
                : p.margin < p.targetMargin
                  ? "var(--off-track-text)"
                  : "var(--ink)",
          }}
        >
          {p.margin == null ? EMPTY_FIGURE : pct(p.margin)}
        </div>
        {p.spark.length >= 2 ? (
          <Sparkline values={p.spark} label={`${p.spark.length} mo`} />
        ) : null}
      </Tile>

      <Tile
        href={healthHref}
        className="border border-[var(--hairline)] bg-[var(--surface)]"
      >
        <p className="kicker">Slip</p>
        <div
          className="figure mt-1.5"
          style={{
            color: p.slip != null && p.slip > 0 ? "var(--off-track-text)" : "var(--ink)",
          }}
        >
          {p.slip == null ? EMPTY_FIGURE : `${p.slip}d`}
        </div>
      </Tile>

      <Tile
        href={moneyHref}
        className="border border-[var(--hairline)] bg-[var(--surface)]"
      >
        <p className="kicker">Contract</p>
        <div className="figure mt-1.5">
          {p.contract == null ? EMPTY_FIGURE : money(p.contract)}
        </div>
      </Tile>

      <Tile
        href={moneyHref}
        className="col-span-2 border border-[var(--hairline)] bg-[var(--surface)]"
      >
        <p className="kicker">
          {p.unbilled >= 0 ? "Earned, unbilled" : "Over-billed"}
        </p>
        <div className="figure mt-1.5">
          {p.margin == null ? EMPTY_FIGURE : unbilledAbs}
        </div>
      </Tile>
    </div>
  );
}

function healthTileClass(health: number | null): string {
  if (health == null) return "border border-[var(--hairline)] bg-[var(--surface)]";
  if (health < 50) return "health-tile health-tile--bad";
  if (health < 75) return "health-tile health-tile--watch";
  return "health-tile health-tile--good";
}

function healthInk(health: number | null): string {
  if (health == null) return "var(--ink)";
  if (health < 50) return "var(--off-track-text)";
  if (health < 75) return "var(--watch)";
  return "var(--on-track)";
}

function Tile({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-[16px] p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${className}`}
    >
      {children}
      <span className="sr-only">Open details</span>
    </Link>
  );
}

function Leg({
  label,
  rag,
  onDark = false,
}: {
  label: string;
  rag: string;
  onDark?: boolean;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <StatusGlyph rag={rag} size={12} />
      <span
        className={`text-[12px] font-normal leading-4 ${
          onDark ? "text-white/90" : "text-[var(--ink)]"
        }`}
      >
        {label}
      </span>
    </li>
  );
}
