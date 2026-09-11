import Link from "next/link";

const TABS = [
  { href: "/", label: "Pulse", id: "pulse" },
  { href: "/projects", label: "Projects", id: "projects" },
  { href: "/people", label: "People", id: "people" },
  { href: "/money", label: "Money", id: "money" },
  { href: "/risks", label: "Risks", id: "risks" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

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
    <div className="min-h-screen bg-[var(--canvas)] pb-24 text-[var(--ink)]">
      <header className="sticky top-0 z-20 border-b border-[var(--hairline)] bg-[var(--material)] backdrop-blur-[18px]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            {backHref ? (
              <Link
                href={backHref}
                className="text-[13px] font-medium text-[var(--accent)]"
              >
                ← Back
              </Link>
            ) : (
              <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)] opacity-70">
                Portfolio Pulse
              </p>
            )}
            <h1 className="truncate text-[24px] font-semibold leading-7 tracking-[-0.02em]">
              {title}
            </h1>
          </div>
          {asOf ? (
            <div className="shrink-0 text-right text-[12px] text-[var(--ink-2)]">
              <div>As of {asOf}</div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 px-3 py-4 md:space-y-4 md:px-4 md:py-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--hairline)] bg-[var(--material)] backdrop-blur-[18px]">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2 py-2 text-center text-[11px]">
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

