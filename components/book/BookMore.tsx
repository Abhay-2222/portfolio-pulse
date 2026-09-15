import type { BookCoverage } from "@/lib/data/coverage";
import { viewLabel } from "@/lib/data/coverage";

export function BookMore({ coverage }: { coverage: BookCoverage }) {
  const notIn = coverage.unavailableViews.map(viewLabel);
  const leftovers = coverage.leftovers;
  const orphans = coverage.orphans;
  const extras = coverage.extraColumns;
  if (
    notIn.length === 0 &&
    leftovers.length === 0 &&
    orphans.length === 0 &&
    extras.length === 0
  ) {
    return null;
  }

  return (
    <section className="card-tile space-y-3">
      <p className="kicker">More</p>
      {notIn.length > 0 ? (
        <div>
          <p className="text-[13px] font-normal leading-5">Not in this book</p>
          <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
            {notIn.join(" · ")}
          </p>
        </div>
      ) : null}
      {leftovers.length > 0 || extras.length > 0 ? (
        <div>
          <p className="text-[13px] font-normal leading-5">
            In the file, not in Pulse
          </p>
          <ul className="mt-1 space-y-1 text-[13px] leading-5 text-[var(--ink-2)]">
            {leftovers.map((row) => (
              <li key={row.sheet}>Sheet “{row.sheet}”</li>
            ))}
            {extras.slice(0, 8).map((row) => (
              <li key={`${row.sheet}-${row.header}`}>
                {row.header}
                {row.sample ? ` · ${row.sample}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {orphans.length > 0 ? (
        <div>
          <p className="text-[13px] font-normal leading-5">Orphans</p>
          <ul className="mt-1 space-y-1 text-[13px] leading-5 text-[var(--ink-2)]">
            {orphans.map((row, i) => (
              <li key={`${row.label}-${i}`}>
                {row.label || "Invoice"}: {row.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-[12px] leading-4 text-[var(--ink-3)]">
        Uneven rows are expected. Missing figures stay empty, never a fake 0.
        Pulse will not invent RAID from a colour or a note.
      </p>
    </section>
  );
}
