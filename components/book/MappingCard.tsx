import type { BookCoverage } from "@/lib/data/coverage";
import { btnDefer } from "@/components/ui/Button";
import {
  confirmBinding,
  dismissBinding,
} from "@/app/book/actions";

export function MappingCard({ coverage }: { coverage: BookCoverage }) {
  if (!coverage.mapped) return null;
  const bound = coverage.bound.filter((b) => b.canonical);
  const guesses = bound.filter((b) => b.confidence === "medium");
  const extras = coverage.bound.filter((b) => !b.canonical);
  return (
    <section className="card-tile space-y-3">
      <p className="kicker">Mapping</p>
      <p className="text-[13px] leading-5 text-[var(--ink-2)]">
        Pulse guessed these columns. Numbers still come from the cells, not a
        model.
      </p>
      {bound.length > 0 ? (
        <ul className="space-y-2">
          {bound.slice(0, 16).map((row) => (
            <li
              key={`${row.sourceSheet}-${row.sourceHeader}`}
              className="text-[13px] leading-5"
            >
              <span className="text-[var(--ink)]">
                {row.sourceHeader} → {row.canonical}
              </span>
              <span className="text-[var(--ink-2)]">
                {" "}
                · {row.confidence}
                {row.sample ? ` · ${row.sample}` : ""}
              </span>
              {row.confidence === "medium" && row.canonical && row.table ? (
                <span className="mt-1 flex gap-2">
                  <form action={confirmBinding}>
                    <input
                      type="hidden"
                      name="fingerprint"
                      value={row.fingerprint}
                    />
                    <input
                      type="hidden"
                      name="sourceHeader"
                      value={row.sourceHeader}
                    />
                    <input
                      type="hidden"
                      name="canonical"
                      value={row.canonical}
                    />
                    <input type="hidden" name="table" value={row.table} />
                    <button type="submit" className={`${btnDefer} min-h-9 px-2`}>
                      Confirm
                    </button>
                  </form>
                  <form action={dismissBinding}>
                    <input
                      type="hidden"
                      name="fingerprint"
                      value={row.fingerprint}
                    />
                    <input
                      type="hidden"
                      name="sourceHeader"
                      value={row.sourceHeader}
                    />
                    <input
                      type="hidden"
                      name="canonical"
                      value={row.canonical}
                    />
                    <input type="hidden" name="table" value={row.table ?? ""} />
                    <button type="submit" className={`${btnDefer} min-h-9 px-2`}>
                      Dismiss
                    </button>
                  </form>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {guesses.length === 0 && extras.length > 0 ? (
        <p className="text-[12px] leading-4 text-[var(--ink-2)]">
          Extra columns are in More, not forced into the briefing.
        </p>
      ) : null}
    </section>
  );
}
