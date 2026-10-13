"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { PulseMark } from "@/components/ui/PulseMark";
import { IconBack, IconRefresh, IconSettings, iconHit } from "@/components/ui/Icons";
import { refreshBriefing } from "@/app/refresh/actions";
import { signOut } from "@/app/signin/actions";

const PRIMARY = [
  { href: "/", label: "Home", id: "pulse" },
  { href: "/projects", label: "Projects", id: "projects" },
  { href: "/people", label: "People", id: "people" },
  { href: "/money", label: "Money", id: "money" },
  { href: "/risks", label: "Risks", id: "risks" },
] as const;

const SIDE = [
  { href: "/briefing", label: "Briefing", id: "briefing" },
  { href: "/status", label: "Data", id: "status" },
  { href: "/guide", label: "Guide", id: "guide" },
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
  asOf,
  meName,
  refreshFailed,
  children,
}: {
  active: TabId;
  title: string;
  backHref?: string;
  asOf?: string;
  meName?: string;
  refreshFailed?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runRefresh() {
    startTransition(async () => {
      await refreshBriefing();
      router.refresh();
    });
  }

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
        <form action={signOut} className="mt-auto p-3">
          <button
            type="submit"
            className="w-full rounded-[8px] px-3 py-2 text-left text-[12px] text-[var(--ink-2)]"
          >
            Sign out{meName ? ` · ${meName}` : ""}
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1 pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-[var(--hairline)] bg-[var(--material)] backdrop-blur-[18px]">
          {refreshFailed ? (
            <p className="bg-[color-mix(in_srgb,var(--off-track)_12%,white)] px-3 py-1.5 text-center text-[12px] text-[var(--off-track-text)]">
              Newest load failed. Numbers are from the last successful refresh.
            </p>
          ) : null}
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
            {asOf && !backHref ? (
              <p className="min-w-0 flex-1 truncate text-[12px] text-[var(--ink-2)]">
                As of {asOf}
              </p>
            ) : null}
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
              <Link href="/status" className={iconHit} aria-label="Data status">
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
