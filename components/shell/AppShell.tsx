"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { PulseMark } from "@/components/ui/PulseMark";
import { IconBack, IconRefresh, IconSettings, iconHit } from "@/components/ui/Icons";
import { refreshBriefing } from "@/app/refresh/actions";

const PRIMARY = [
  { href: "/", label: "Home", id: "pulse" },
  { href: "/projects", label: "Projects", id: "projects" },
  { href: "/people", label: "People", id: "people" },
  { href: "/money", label: "Money", id: "money" },
  { href: "/risks", label: "Risks", id: "risks" },
] as const;

const SIDE = [
  { href: "/book", label: "Book", id: "book" },
  { href: "/guide", label: "Guide", id: "guide" },
  { href: "/clients", label: "Clients", id: "clients" },
  { href: "/decisions", label: "Decisions", id: "decisions" },
  { href: "/sources", label: "Sources", id: "sources" },
] as const;

export type TabId =
  | (typeof PRIMARY)[number]["id"]
  | (typeof SIDE)[number]["id"];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  active,
  title,
  backHref,
  refreshMinutes,
  children,
}: {
  active: TabId;
  title: string;
  asOf?: string;
  backHref?: string;
  source?: ReactNode;
  refreshMinutes?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const minutes =
    refreshMinutes != null && refreshMinutes > 0 ? refreshMinutes : 5;

  function runRefresh() {
    if (pendingRef.current) return;
    startTransition(async () => {
      await refreshBriefing();
      router.refresh();
    });
  }

  useEffect(() => {
    const id = window.setInterval(runRefresh, minutes * 60_000);
    return () => window.clearInterval(id);
    // Intentionally only re-arm when the interval length changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes]);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] lg:flex">
      <aside className="hidden lg:flex lg:w-52 lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--hairline)] lg:bg-[var(--material)]">
        <Link
          href="/"
          className="flex items-center px-4 py-5"
          aria-label="Home"
        >
          <PulseMark />
        </Link>
        <nav className="flex flex-col gap-0.5 px-3">
          {[...PRIMARY, ...SIDE].map((tab) => {
            const on = isActive(pathname, tab.href) || tab.id === active;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex min-h-10 items-center rounded-[8px] px-3 text-[13px] ${
                  on
                    ? "bg-[var(--surface)] font-normal text-[var(--ink)]"
                    : "text-[var(--ink-2)]"
                }`}
                aria-current={on ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-[var(--hairline)] bg-[var(--material)] backdrop-blur-[18px]">
          <div className="mx-auto flex max-w-6xl items-center gap-1 px-3 py-1.5 md:px-4">
            {backHref ? (
              <Link href={backHref} className={iconHit} aria-label="Back">
                <IconBack />
              </Link>
            ) : (
              <Link
                href="/"
                className={`${iconHit} lg:hidden`}
                aria-label="Home"
              >
                <PulseMark />
              </Link>
            )}
            <h1
              className={
                backHref
                  ? "min-w-0 flex-1 py-2 text-[17px] font-normal leading-5 tracking-[-0.02em]"
                  : "sr-only"
              }
            >
              {title}
            </h1>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button
                type="button"
                className={iconHit}
                aria-label="Refresh briefing"
                aria-busy={pending}
                disabled={pending}
                onClick={() => runRefresh()}
              >
                <IconRefresh className={pending ? "animate-spin" : undefined} />
              </button>
              <Link href="/book" className={iconHit} aria-label="Your book">
                <IconSettings />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto min-w-0 max-w-6xl space-y-4 px-3 py-3 md:px-4 md:py-5">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--hairline)] bg-[var(--material)] backdrop-blur-[18px] lg:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-1 py-1.5 text-center text-[11px]">
          {PRIMARY.map((tab) => {
            const on = isActive(pathname, tab.href) || tab.id === active;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex min-h-11 items-center justify-center rounded-[8px] px-1 py-2 ${
                  on
                    ? "bg-[var(--surface)] font-normal text-[var(--ink)]"
                    : "text-[var(--ink-2)]"
                }`}
                aria-current={on ? "page" : undefined}
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
