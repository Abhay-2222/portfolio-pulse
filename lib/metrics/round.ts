/** Excel ROUND: halves away from zero. */
export function roundHalfAwayFromZero(value: number, digits = 0): number {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const sign = scaled < 0 ? -1 : 1;
  const abs = Math.abs(scaled);
  const truncated = Math.trunc(abs);
  const frac = abs - truncated;
  const away =
    frac > 0.5 ? truncated + 1 : frac < 0.5 ? truncated : truncated + 1;
  return (sign * away) / factor;
}

export function round1(value: number): number {
  return roundHalfAwayFromZero(value, 1);
}
