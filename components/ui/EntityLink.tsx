import Link from "next/link";
import type { EntityType } from "@/lib/findings/types";

export function entityHref(type: EntityType | "client", id: string): string {
  if (type === "person") return `/people/${id}`;
  if (type === "project") return `/projects/${id}`;
  if (type === "client") return `/clients/${id}`;
  if (type === "invoice") return `/money/${id}`;
  if (type === "raid") return `/risks/${id}`;
  if (type === "cr") return "/decisions";
  return `/projects/${id}`;
}

export function EntityLink({
  type,
  id,
  children,
  className,
}: {
  type: EntityType | "client";
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={entityHref(type, id)}
      className={className ?? "font-normal text-[var(--accent)]"}
    >
      {children}
    </Link>
  );
}
