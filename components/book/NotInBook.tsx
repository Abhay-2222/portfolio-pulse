export function NotInBook({ view }: { view: string }) {
  return (
    <p className="card-tile text-[13px] leading-5 text-[var(--ink-2)]">
      {view} is not in this book. Pulse will brief it when this file has that
      table.
    </p>
  );
}
