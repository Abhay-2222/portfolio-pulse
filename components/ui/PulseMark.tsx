export function PulseMark({
  size = 26,
  pulse = false,
  splash = false,
}: {
  size?: number;
  pulse?: boolean;
  splash?: boolean;
}) {
  const height = Math.round((size * 16) / 22);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 22 16"
      fill="none"
      aria-hidden
      className={splash ? "splash-mark" : pulse ? "pulse-mark-anim" : undefined}
    >
      <line
        x1="1"
        y1="14.5"
        x2="21"
        y2="14.5"
        stroke="#86868b"
        strokeWidth="1"
      />
      <circle cx="5" cy="7" r="3" fill="#c8372d" />
      <circle cx="11" cy="9.2" r="2.4" fill="#c77700" />
      <circle cx="17" cy="5" r="3.2" fill="#1f6b43" />
    </svg>
  );
}
