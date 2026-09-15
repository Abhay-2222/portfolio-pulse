import type { EntityCoverage } from "@/lib/data/coverage";

export function ProjectMore({ entity }: { entity: EntityCoverage }) {
  if (
    entity.missingLegs.length === 0 &&
    entity.extraColumns.length === 0 &&
    entity.notes.length === 0
  ) {
    return null;
  }
  return (
    <section className="card-tile space-y-3">
      <p className="kicker">More on this project</p>
      {entity.missingLegs.length > 0 ? (
        <p className="text-[13px] leading-5 text-[var(--ink-2)]">
          Unavailable here: {entity.missingLegs.join(" · ")}
        </p>
      ) : null}
      {entity.extraColumns.length > 0 ? (
        <div>
          <p className="text-[13px] font-normal leading-5">
            In this row, not in Pulse
          </p>
          <ul className="mt-1 space-y-1 text-[13px] leading-5 text-[var(--ink-2)]">
            {entity.extraColumns.map((col) => (
              <li key={col.header}>
                {col.header}
                {col.sample ? ` · ${col.sample}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {entity.notes.length > 0 ? (
        <ul className="space-y-1 text-[13px] leading-5 text-[var(--ink-2)]">
          {entity.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
