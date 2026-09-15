/** Missing figure. Never a fake 0, and never a dash. */
export const EMPTY_FIGURE = "n/a";

export function moneyExact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  return `${sign}$${Math.round(abs).toLocaleString("en-CA")}`;
}

/** Compact money: $1.94M under $10M, $16.2M at $10M+, $445k for $10k–$1M. */
export function moneyCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 10_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const two = m.toFixed(2).replace(/0$/, "").replace(/\.0$/, ".0");
    return `${sign}$${two}M`;
  }
  if (abs >= 10_000) {
    return `${sign}$${Math.round(abs / 1_000)}k`;
  }
  return moneyExact(n);
}

/**
 * Default display money. Millions compact with enough decimals to keep $1.94M;
 * everything under $1M is exact so Pulse and Money do not drift.
 */
export function money(n: number): string {
  if (Math.abs(n) >= 1_000_000) return moneyCompact(n);
  return moneyExact(n);
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function pts(n: number): string {
  const v = n * 100;
  return `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} pts`.replace(
    "−−",
    "−",
  );
}

export function formatAsOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatHoldUntil(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const startNow = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const startThen = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const days = Math.round((startThen - startNow) / 86_400_000);
  const pretty = date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return pretty;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return EMPTY_FIGURE;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return EMPTY_FIGURE;
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
