"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { money } from "@/lib/format";

export type SpectrumProject = {
  id: string;
  name: string;
  client: string;
  health: number;
  value: number;
  rag: string;
  worstLeg: string;
};

function ragFill(rag: string): string {
  if (rag === "Red") return "var(--off-track)";
  if (rag === "Amber") return "var(--watch)";
  if (rag === "Green") return "var(--on-track)";
  return "var(--not-started)";
}

type Placed = SpectrumProject & { r: number; x: number; y: number };

type Cluster = {
  id: string;
  members: Placed[];
  x: number;
  y: number;
  r: number;
};

function placeDots(
  projects: SpectrumProject[],
  width: number,
  height: number,
  padX: number,
  padY: number,
): Placed[] {
  const minV = Math.min(...projects.map((p) => p.value), 1);
  const maxV = Math.max(...projects.map((p) => p.value), minV);
  const placed = projects.map((p) => {
    const t =
      maxV === minV
        ? 0.5
        : (Math.sqrt(p.value) - Math.sqrt(minV)) /
          (Math.sqrt(maxV) - Math.sqrt(minV));
    const r = 12 + t * 16;
    const x =
      padX + (Math.min(100, Math.max(0, p.health)) / 100) * (width - padX * 2);
    const seed = p.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const band = (height - padY * 2) / 2.4;
    const y = height / 2 + ((seed % 11) - 5) * (band / 7);
    return { ...p, r, x, y };
  });

  const ordered = [...placed].sort((a, b) => a.x - b.x);
  for (let i = 0; i < ordered.length; i++) {
    const p = ordered[i]!;
    let y = p.y;
    for (let k = 0; k < 12; k++) {
      const hit = ordered.find(
        (o, j) =>
          j !== i &&
          Math.hypot(o.x - p.x, o.y - y) < o.r + p.r + 4,
      );
      if (!hit) break;
      y += (y <= height / 2 ? -1 : 1) * (p.r * 0.45);
      y = Math.min(height - padY - p.r, Math.max(padY + p.r, y));
    }
    ordered[i] = { ...p, y };
  }
  return ordered;
}

function clusterDots(dots: Placed[], hitR: number): Cluster[] {
  const sorted = [...dots].sort((a, b) => a.x - b.x);
  const groups: Placed[][] = [];
  for (const d of sorted) {
    const last = groups[groups.length - 1];
    if (!last) {
      groups.push([d]);
      continue;
    }
    const anchor = last[last.length - 1]!;
    if (Math.abs(d.x - anchor.x) < hitR * 1.5) last.push(d);
    else groups.push([d]);
  }
  return groups.map((members) => ({
    id: members.map((m) => m.id).join("+"),
    members,
    x: members.reduce((s, m) => s + m.x, 0) / members.length,
    y: members.reduce((s, m) => s + m.y, 0) / members.length,
    r: Math.max(...members.map((m) => m.r)),
  }));
}

export function Spectrum({ projects }: { projects: SpectrumProject[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [cssW, setCssW] = useState(390);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [openCluster, setOpenCluster] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const sync = () => setCssW(Math.max(el.clientWidth, 1));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = 720;
  const height = 260;
  const padX = 36;
  const padY = 40;
  const dots = placeDots(projects, width, height, padX, padY);
  const hitR = 28 * (width / cssW);
  const clusters = clusterDots(dots, hitR);
  const peeked = dots.find((d) => d.id === peekId);
  const clusterOpen = clusters.find((c) => c.id === openCluster);

  return (
    <div ref={box} className="w-full overflow-hidden rounded-[12px] px-0 py-1">
      <svg
        viewBox={`0 0 ${width} ${height + 44}`}
        className="h-auto w-full min-h-[200px] md:min-h-[280px]"
        role="img"
        aria-label="Portfolio health spectrum. X axis is health score 0 to 100. Dot size is contract value. Tap a cluster to peek."
      >
        <line
          x1={padX}
          x2={width - padX}
          y1={height - 4}
          y2={height - 4}
          stroke="var(--hairline)"
          strokeWidth={1}
        />
        {[0, 50, 100].map((tick) => {
          const x = padX + (tick / 100) * (width - padX * 2);
          return (
            <g key={tick}>
              <line
                x1={x}
                x2={x}
                y1={height - 10}
                y2={height}
                stroke="var(--ink-3)"
                strokeWidth={1.25}
              />
              <text
                x={x}
                y={height + 18}
                textAnchor="middle"
                fill="var(--ink-2)"
                fontSize={13}
              >
                {tick}
              </text>
            </g>
          );
        })}
        <text
          x={width / 2}
          y={height + 38}
          textAnchor="middle"
          fill="var(--ink-2)"
          fontSize={13}
        >
          Health score · size is contract value
        </text>
        {clusters.map((c) => {
          const rag = c.members.some((m) => m.rag === "Red")
            ? "Red"
            : c.members.some((m) => m.rag === "Amber")
              ? "Amber"
              : c.members[0]!.rag;
          const selected =
            openCluster === c.id ||
            (c.members.length === 1 && peekId === c.members[0]!.id);
          return (
            <g key={c.id}>
              <circle
                cx={c.x}
                cy={c.y}
                r={hitR}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => {
                  if (c.members.length === 1) {
                    const id = c.members[0]!.id;
                    setOpenCluster(null);
                    setPeekId((cur) => (cur === id ? null : id));
                    return;
                  }
                  setPeekId(null);
                  setOpenCluster((cur) => (cur === c.id ? null : c.id));
                }}
              >
                <title>
                  {c.members.length === 1
                    ? `${c.members[0]!.name}: health ${Math.round(c.members[0]!.health)}`
                    : `${c.members.length} projects near health ${Math.round(c.x)}`}
                </title>
              </circle>
              <circle
                cx={c.x}
                cy={c.y}
                r={c.r}
                fill={ragFill(rag)}
                stroke={selected ? "var(--accent)" : "var(--surface)"}
                strokeWidth={selected ? 2.5 : 1.5}
                pointerEvents="none"
              />
              {c.members.length > 1 ? (
                <text
                  x={c.x}
                  y={c.y + 4}
                  textAnchor="middle"
                  fill="var(--surface)"
                  fontSize={13}
                  fontWeight={600}
                  pointerEvents="none"
                >
                  {c.members.length}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] text-[var(--ink-3)]">
        <span>Smaller = smaller contract</span>
        <span>Larger = more value at risk</span>
      </div>

      {clusterOpen && clusterOpen.members.length > 1 ? (
        <ul className="mx-2 mt-2 overflow-hidden rounded-[12px] border border-[var(--tile-border)] bg-[var(--surface)]">
          {clusterOpen.members.map((m) => (
            <li key={m.id} className="border-b border-[var(--hairline)] last:border-0">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-[14px]"
                onClick={() => setPeekId(m.id)}
              >
                <span className="min-w-0 truncate font-normal">{m.name}</span>
                <StatusGlyph rag={m.rag} showLabel />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {peeked ? (
        <div className="mx-2 mt-2 flex items-center justify-between gap-3 rounded-[12px] border border-[var(--tile-border)] bg-[var(--surface)] px-3 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusGlyph rag={peeked.rag} showLabel />
              <span className="line-clamp-2 text-[14px] font-normal leading-[18px]">
                {peeked.name}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[var(--ink-2)]">
              {peeked.client} · health {Math.round(peeked.health)} · red on{" "}
              {peeked.worstLeg} · {money(peeked.value)}
            </p>
          </div>
          <Link
            href={`/projects/${peeked.id}`}
            className="shrink-0 text-[15px] font-normal text-[var(--accent)]"
          >
            Open
          </Link>
        </div>
      ) : (
        <p className="px-2 text-[12px] text-[var(--ink-3)]">
          Tap a dot for a peek. Open to go to the project.
        </p>
      )}

      <details className="px-2 pt-2">
        <summary className="min-h-11 cursor-pointer text-[13px] font-normal text-[var(--accent)]">
          Read as a list
        </summary>
        <table className="mt-1 w-full text-left text-[13px]">
          <caption className="sr-only">
            Active projects by health score, contract value, and RAG
          </caption>
          <thead>
            <tr className="text-[var(--ink-3)]">
              <th className="py-1 font-normal">Project</th>
              <th className="py-1 font-normal">Health</th>
              <th className="py-1 font-normal">RAG</th>
              <th className="py-1 font-normal">Contract</th>
            </tr>
          </thead>
          <tbody>
            {[...projects]
              .sort((a, b) => a.health - b.health)
              .map((p) => (
                <tr key={p.id} className="border-t border-[var(--hairline)]">
                  <td className="py-2">
                    <Link href={`/projects/${p.id}`} className="font-normal text-[var(--accent)]">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-2">{Math.round(p.health)}</td>
                  <td className="py-2">
                    <StatusGlyph rag={p.rag} showLabel />
                  </td>
                  <td className="py-2">{money(p.value)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
