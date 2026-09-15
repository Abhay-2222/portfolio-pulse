import Link from "next/link";
import { getPortfolioPayload } from "@/lib/data/get-portfolio";
import { AppShell } from "@/components/shell/AppShell";
import { formatAsOf } from "@/lib/format";
import { CardStack, EntityCard } from "@/components/ui/ListCard";
import { btnDefer } from "@/components/ui/Button";
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

export default async function BookPage() {
  const payload = await getPortfolioPayload();
  const library = await loadUserSource();
  const envLocked = Boolean(process.env.DATA_FILE_PATH);
  const issues = payload.issues.slice(0, 24);
  const coverage = payload.coverage;

  return (
    <AppShell
      active="book"
      title="Your book"
      asOf={formatAsOf(payload.asOfDate)}
      refreshMinutes={payload.dataset.settings.AutoRefreshMinutes}
    >
      <p className="px-1 text-[13px] leading-5 text-[var(--ink-2)]">
        Start from our template if you can. If your export is close but named
        differently, Pulse will map what it can. Pulse never writes back —
        edit in Excel or Sheets.{" "}
        <Link href="/guide" className="text-[var(--accent)]">
          How to use
        </Link>
        .
      </p>

      <section className="card-tile">
        <p className="kicker">Now briefing</p>
        <p className="mt-1 text-[16px] font-normal leading-5 tracking-[-0.02em]">
          {payload.book.label}
        </p>
        <p className="mt-1.5 text-[12px] leading-4 text-[var(--ink-2)]">
          {payload.dataset.projects.length} projects · as of{" "}
          {formatAsOf(payload.asOfDate)}
          {payload.book.kind === "demo" ? " · demo book" : ""}
          {payload.book.kind === "sheet" ? " · Google Sheet" : ""}
          {payload.book.kind === "url" ? " · linked file" : ""}
          {payload.book.ephemeral
            ? " · this host does not keep sources after restart — run locally to persist"
            : ""}
        </p>
        {payload.book.href ? (
          <p className="mt-2 text-[13px] leading-5">
            <a
              href={payload.book.href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent)]"
            >
              Open source
            </a>
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
        <>
          <section className="space-y-3">
            <p className="kicker px-1">Start from our template</p>
            <p className="px-1 text-[13px] leading-5 text-[var(--ink-2)]">
              Download, replace the demo rows, keep sheet names and headers.
              Or copy the demo into My books and overwrite it after you edit.
            </p>
            <a href="/book/template" className={`${btnDefer} w-full`}>
              Download template
            </a>
            <form action={copyDemoBook}>
              <button type="submit" className={`${btnDefer} w-full`}>
                Copy demo into My books
              </button>
            </form>
          </section>

          <section className="space-y-3">
            <p className="kicker px-1">Bring your own file</p>
            <p className="px-1 text-[13px] leading-5 text-[var(--ink-2)]">
              One workbook. Close cousins are mapped. Uneven rows brief on
              what they have; the rest lands in More.
            </p>
            <UploadForm envLocked={envLocked} />
            <LinkForm envLocked={envLocked} />
          </section>
        </>
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
        <p className="mt-2 text-[13px] leading-5 text-[var(--ink-2)]">
          {REQUIRED_SHEETS.join(" · ")}
        </p>
        <p className="mt-2 text-[12px] leading-4 text-[var(--ink-2)]">
          Prefer the template when you can. Private Sheets stay
          download-then-upload.{" "}
          <Link href="/sources" className="text-[var(--accent)]">
            Sources
          </Link>{" "}
          is a mapping demo. It does not replace this book.
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
                {issue.column ? ` · ${issue.column}` : ""} — {issue.message}
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
