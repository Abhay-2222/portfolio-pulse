type SpectrumProject = {
  id: string;
  name: string;
  health: number;
  value: number;
  rag: string;
};

function ragFill(rag: string): string {
  if (rag === "Red") return "var(--off-track)";
  if (rag === "Amber") return "var(--watch)";
  if (rag === "Green") return "var(--on-track)";
  return "var(--not-started)";
}

export function Spectrum({ projects }: { projects: SpectrumProject[] }) {
  const minV = Math.min(...projects.map((p) => p.value), 1);
  const maxV = Math.max(...projects.map((p) => p.value), minV);
  const width = 720;
  const height = 120;
  const padX = 28;
  const padY = 24;

  const placed = projects.map((p) => {
    const t =
      maxV === minV
        ? 0.5
        : (Math.sqrt(p.value) - Math.sqrt(minV)) /
          (Math.sqrt(maxV) - Math.sqrt(minV));
    const r = 6 + t * 8;
    const x =
      padX +
      (Math.min(100, Math.max(0, p.health)) / 100) * (width - padX * 2);
    return { ...p, r, x, y: height / 2 };
  });

  const rows: Array<typeof placed> = [[], [], [], [], []];
  for (const p of placed.sort((a, b) => a.x - b.x)) {
    let chosen = 2;
    for (const row of [2, 1, 3, 0, 4]) {
      const conflict = rows[row]!.some(
        (o) => Math.abs(o.x - p.x) < o.r + p.r + 2,
      );
      if (!conflict) {
        chosen = row;
        break;
      }
    }
    const y = padY + chosen * ((height - padY * 2) / 4);
    rows[chosen]!.push({ ...p, y });
  }
  const dots = rows.flat();

  return (
    <div className="w-full overflow-hidden rounded-[28px] bg-[var(--surface-2)] px-1 py-2">
      <svg
        viewBox={`0 0 ${width} ${height + 26}`}
        className="h-auto w-full"
        role="img"
        aria-label="Portfolio health spectrum"
      >
        <line
          x1={padX}
          x2={width - padX}
          y1={height - 6}
          y2={height - 6}
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
                y2={height - 2}
                stroke="var(--ink-3)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={height + 12}
                textAnchor="middle"
                fill="var(--ink-3)"
                fontSize={11}
              >
                {tick}
              </text>
            </g>
          );
        })}
        <text
          x={width / 2}
          y={height + 24}
          textAnchor="middle"
          fill="var(--ink-3)"
          fontSize={11}
        >
          Health score
        </text>
        {dots.map((p) => (
          <a key={p.id} href={`/projects/${p.id}`} aria-label={p.name}>
            <title>
              {p.name}: health {Math.round(p.health)}, {p.rag}
            </title>
            <circle cx={p.x} cy={p.y} r={Math.max(22, p.r)} fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={ragFill(p.rag)}
              stroke="var(--surface)"
              strokeWidth={1.5}
            />
          </a>
        ))}
      </svg>
    </div>
  );
}
