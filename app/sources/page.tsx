import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { formatAsOf } from "@/lib/format";
import { confirmGrouping, dismissGrouping } from "@/app/sources/actions";
import type { ColumnBinding, FileRecord, Grouping } from "@/lib/resolver/types";
import { StatGrid } from "@/components/ui/StatGrid";
import { CardStack } from "@/components/ui/ListCard";
import { btnCommit, btnDefer } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const payload = await getPortfolioPayload();
  const report = payload.resolver;

  return (
    <AppShell
      active="sources"
      title="Sources"
      asOf={formatAsOf(payload.asOfDate)}
    >
      <p className="px-1 text-[13px] leading-5 text-[var(--ink-2)]">
        Mapping demo over shredded copies of the current book. Confirm
        groupings here; change which workbook Pulse reads on{" "}
        <a href="/book" className="text-[var(--accent)]">
          Book
        </a>
        .
      </p>

      {!report ? (
        <section className="card-tile text-[13px] text-[var(--ink-2)]">
          Resolver did not run. Check the workbook path.
        </section>
      ) : (
        <>
          <StatGrid
            cells={[
              { label: "Files", value: String(report.files.length) },
              { label: "Rejected", value: String(report.scores.rejected) },
              { label: "Duplicates", value: String(report.scores.duplicates) },
              {
                label: "To confirm",
                value: String(report.scores.confirmationsNeeded),
              },
            ]}
          />
          <p className="px-1 text-[12px] leading-4 text-[var(--ink-3)]">
            Binding accuracy{" "}
            {Math.round(report.scores.bindingAccuracy * 100)}% ·{" "}
            {report.folder}
          </p>

          <Section title="Confirm groupings">
            {report.groupings.filter((g) => g.status === "proposed").length ===
            0 ? (
              <p className="card-tile text-[13px] text-[var(--ink-2)]">
                Nothing waiting. All proposed files are grouped.
              </p>
            ) : (
              <CardStack>
                {report.groupings
                  .filter((g) => g.status === "proposed")
                  .map((g) => <GroupingRow key={g.id} grouping={g} />)}
              </CardStack>
            )}
          </Section>

          <Section title="Files">
            <CardStack>
              {report.files.map((f) => (
                <FileRow
                  key={f.fileId}
                  file={f}
                  binds={report.bindings[f.fileId] ?? []}
                />
              ))}
            </CardStack>
          </Section>
        </>
      )}
    </AppShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[15px] font-normal leading-5">{title}</h2>
      {children}
    </section>
  );
}

function GroupingRow({ grouping }: { grouping: Grouping }) {
  return (
    <div className="card-tile flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="text-[15px] font-normal leading-5">{grouping.sourceLabel}</div>
        <div className="text-[12px] leading-4 text-[var(--ink-2)]">
          {grouping.fileId} → {grouping.projectName ?? "unmatched"} (
          {grouping.confidence}) · {grouping.evidence}
        </div>
      </div>
      {grouping.projectId ? (
        <div className="flex gap-2">
          <form action={confirmGrouping}>
            <input type="hidden" name="id" value={grouping.id} />
            <input type="hidden" name="projectId" value={grouping.projectId} />
            <button
              type="submit"
              className={`${btnCommit} rounded-[10px] px-3`}
            >
              Confirm
            </button>
          </form>
          <form action={dismissGrouping}>
            <input type="hidden" name="id" value={grouping.id} />
            <input type="hidden" name="projectId" value={grouping.projectId} />
            <button
              type="submit"
              className={`${btnDefer} rounded-[10px] px-3`}
            >
              Not this
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function FileRow({
  file,
  binds,
}: {
  file: FileRecord;
  binds: ColumnBinding[];
}) {
  const bound = binds.filter((b) => b.canonical);
  return (
    <div className="card-tile">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[15px] font-normal leading-5">{file.name}</div>
        <span className="text-[11px] font-normal text-[var(--ink-3)]">
          {file.disposition}
          {file.duplicateOf ? ` of ${file.duplicateOf}` : ""}
          {file.version.kind !== "unknown" ? ` · ${file.version.kind}` : ""}
        </span>
      </div>
      {file.reason ? (
        <p className="mt-1 text-[12px] leading-4 text-[var(--ink-2)]">{file.reason}</p>
      ) : null}
      {bound.length > 0 ? (
        <p className="mt-1 text-[12px] text-[var(--ink-3)]">
          {bound
            .slice(0, 6)
            .map((b) => `${b.sourceHeader}→${b.canonical}`)
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
