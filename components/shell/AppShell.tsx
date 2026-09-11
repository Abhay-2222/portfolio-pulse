import Link from "next/link";

export type TabId = "pulse" | "projects" | "people" | "money" | "risks";

const TABS: { id: TabId; href: string; label: string }[] = [
  { id: "pulse", href: "/", label: "Pulse" },
  { id: "projects", href: "/projects", label: "Projects" },
  { id: "people", href: "/people", label: "People" },
  { id: "money", href: "/money", label: "Money" },
  { id: "risks", href: "/risks", label: "Risks" },
];

export function AppShell({
  active,
  title,
  asOf,
  backHref,
  children,
}: {
  active: TabId;
  title: string;
  asOf?: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 border-b border-[var(--hairline)] bg-[var(--material)] [backdrop-filter:var(--material-blur)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            {backHref ? (
              <Link
                href={backHref}
                className="text-[13px] font-medium text-[var(--accent)]"
              >
                ← Back
              </Link>
            ) : (
              <p className="text-[13px] text-[var(--ink-3)]">Portfolio Pulse</p>
            )}
            <h1 className="truncate text-[22px] font-bold leading-7 tracking-tight md:text-[28px] md:leading-[34px]">
              {title}
            </h1>
          </div>
          {asOf ? (
            <div className="shrink-0 text-right text-[13px] text-[var(--ink-2)]">
              <div>As of {asOf}</div>
              <Link className="text-[var(--accent)]" href="/api/portfolio">
                JSON API
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:px-6 md:py-10">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--hairline)] bg-[var(--material)] [backdrop-filter:var(--material-blur)]">
        <div className="mx-auto grid max-w-5xl grid-cols-5 px-2 py-2 text-center text-[11px]">
          {TABS.map((tab) => {
            const isActive = tab.id === active;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex min-h-11 items-center justify-center rounded-[10px] px-1 py-2 ${
                  isActive
                    ? "bg-[var(--accent-tint)] font-semibold text-[var(--accent)]"
                    : "text-[var(--ink-3)]"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
