export function IconBack({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M12.25 4.5 6.75 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconRefresh({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16.5 4.2v4.2h-4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSettings({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M8.2 2.7h3.6l.4 1.8c.5.2.9.4 1.3.7l1.8-.6 1.8 3.2-1.5 1.2c.1.5.1 1 0 1.5l1.5 1.2-1.8 3.2-1.8-.6c-.4.3-.8.5-1.3.7l-.4 1.8H8.2l-.4-1.8c-.5-.2-.9-.4-1.3-.7l-1.8.6-1.8-3.2 1.5-1.2c-.1-.5-.1-1 0-1.5L2.9 7.8l1.8-3.2 1.8.6c.4-.3.8-.5 1.3-.7l.4-1.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconFilter({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3.5 5h13M5.5 10h9M8 15h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const iconHit =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
