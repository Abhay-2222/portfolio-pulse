import Link from "next/link";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { formatAsOf } from "@/lib/format";
import { CardStack, EntityCard } from "@/components/ui/ListCard";
import { btnCommit, btnDefer } from "@/components/ui/Button";
import { hasBookMore } from "@/lib/data/coverage";
import { loadUserSource, REQUIRED_SHEETS } from "@/lib/data/user-source";
import { UploadForm } from "@/app/book/UploadForm";
import { LinkForm } from "@/app/book/LinkForm";
import { BookMore } from "@/components/book/BookMore";
import { MappingCard } from "@/components/book/MappingCard";
import {
  copyDemoBook,
  dropUploadedBook,
  useDemoBook,
  useUploadedBook,
} from "@/app/book/actions";

export const dynamic = "force-dynamic";

function Chip({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] leading-4 text-[var(--ink-2)]">
      {children}
    </span>
  );
}

export default async function BookPage() {
  const payload = await getPortfolioPayload();
  const library = await loadUserSource();
  const envLocked = Boolean(process.env.DATA_FILE_PATH);
  const issues = payload.issues.slice(0, 24);
  const coverage = payload.coverage;
  const kindChip =
    payload.book.kind === "demo"
      ? "Demo"
      : payload.book.kind === "sheet"
        ? "Google Sheet"
        : payload.book.kind === "url"
          ? "Linked file"
          : "Uploaded";

  return (
    <AppShell
      active="book"
      title="Your book"
      asOf={formatAsOf(payload.asOfDate)}
      refreshMinutes={payload.dataset.settings.AutoRefreshMinutes}
    >
      <div className="px-1">
        <p className="page-title">Your book</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--ink-2)]">
          Pulse reads one workbook. It never writes Excel.{" "}
          <Link href="/guide" className="text-[var(--accent)]">
            How to use
          </Link>
        </p>
      </div>

      <section className="card-tile">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kicker">Now briefing</p>
            <p className="mt-1 text-[16px] font-normal leading-5 tracking-[-0.02em]">
              {payload.book.label}
            </p>
          </div>
          {payload.book.href ? (
            <a
              href={payload.book.href}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[13px] leading-5 text-[var(--accent)]"
            >
              Open
            </a>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip>{`${payload.dataset.projects.length} projects`}</Chip>
          <Chip>{`As of ${formatAsOf(payload.asOfDate)}`}</Chip>
          <Chip>{kindChip}</Chip>
        </div>
        {payload.book.ephemeral ? (
          <p className="mt-3 text-[12px] leading-4 text-[var(--ink-3)]">
            Uploads on this host reset on restart. Run locally to keep them.
          </p>
        ) : null}
        {payload.book.kind !== "demo" ? (
          <form action={useDemoBook} className="mt-3">
            <button type="submit" className={`${btnDefer} w-full`}>
              Back to demo book
            </button>
          </form>
        ) : null}
      </section>

      {envLocked ? (
        <p className="px-1 text-[13px] leading-5 text-[var(--off-track-text)]">
          DATA_FILE_PATH is set. Unset it to upload or paste a link.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="card-tile flex flex-col gap-3">
            <div>
              <p className="kicker">Start from the template</p>
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--ink-2)]">
                Keep sheet names and headers. Replace the demo rows with yours.
              </p>
            </div>
            <a href="/book/template" className={`${btnCommit} w-full`}>
              Download template
            </a>
            <form action={copyDemoBook}>
              <button type="submit" className={`${btnDefer} w-full`}>
                Copy demo into My books
              </button>
            </form>
          </section>

          <section className="card-tile flex flex-col gap-3">
            <div>
              <p className="kicker">Bring your own</p>
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--ink-2)]">
                One workbook. Close cousins map. Uneven rows still brief.
              </p>
            </div>
            <UploadForm envLocked={envLocked} />
            <LinkForm envLocked={envLocked} />
          </section>
        </div>
      )}

      {coverage.mapped ? <MappingCard coverage={coverage} /> : null}
      {hasBookMore(coverage) ? <BookMore coverage={coverage} /> : null}

      {library.files.length > 0 ? (
        <section className="space-y-2">
          <p className="kicker px-1">My books</p>
          <CardStack>
            {library.files.map((file) => (
              <EntityCard
                key={file.id}
                kicker={
                  file.id === library.activeId
                    ? file.originKind === "sheet"
                      ? "Active · Sheet"
                      : file.originKind === "url"
                        ? "Active · Link"
                        : "Active"
                    : file.originKind === "sheet"
                      ? "Sheet"
                      : file.originKind === "url"
                        ? "Link"
                        : "Ready"
                }
                title={file.originalName}
                meta={`${file.projects} projects${
                  file.issueCount ? ` · ${file.issueCount} parse notes` : ""
                }`}
              >
                {file.originUrl ? (
                  <p className="mt-2 text-[12px] leading-4">
                    <a
                      href={file.originUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--accent)]"
                    >
                      Open source
                    </a>
                  </p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  {file.id === library.activeId ? null : (
                    <form action={useUploadedBook} className="min-w-0 flex-1">
                      <input type="hidden" name="id" value={file.id} />
                      <button type="submit" className={`${btnDefer} w-full`}>
                        Brief this
                      </button>
                    </form>
                  )}
                  <form action={dropUploadedBook} className="min-w-0 flex-1">
                    <input type="hidden" name="id" value={file.id} />
                    <button type="submit" className={`${btnDefer} w-full`}>
                      Remove
                    </button>
                  </form>
                </div>
              </EntityCard>
            ))}
          </CardStack>
        </section>
      ) : null}

      <section className="card-tile">
        <p className="kicker">Template sheets</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {REQUIRED_SHEETS.map((sheet) => (
            <Chip key={sheet}>{sheet}</Chip>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-4 text-[var(--ink-3)]">
          Private Sheets stay download then upload.{" "}
          <Link href="/sources" className="text-[var(--accent)]">
            Sources
          </Link>{" "}
          is a mapping demo, not this book.
        </p>
      </section>

      {issues.length > 0 ? (
        <section className="space-y-2">
          <p className="kicker px-1">Parse notes</p>
          <div className="card-tile space-y-2">
            {issues.map((issue, i) => (
              <p
                key={`${issue.table}-${issue.rowNumber}-${issue.column}-${i}`}
                className="text-[13px] leading-5 text-[var(--ink-2)]"
              >
                {issue.table}
                {issue.rowNumber ? ` · row ${issue.rowNumber}` : ""}
                {issue.column ? ` · ${issue.column}` : ""}: {issue.message}
              </p>
            ))}
            {payload.issues.length > issues.length ? (
              <p className="text-[12px] text-[var(--ink-3)]">
                +{payload.issues.length - issues.length} more
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
