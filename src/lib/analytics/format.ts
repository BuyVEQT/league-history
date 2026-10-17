export const DASH = "—";

/** Win% treating a tie as half a win. Null when no games were played. */
export function winPct(wins: number, losses: number, ties: number): number | null {
  const games = wins + losses + ties;
  return games === 0 ? null : (wins + 0.5 * ties) / games;
}

export function formatPct(value: number | null, digits = 1): string {
  return value === null ? DASH : `${(value * 100).toFixed(digits)}%`;
}

export function formatRecord(w: number, l: number, t: number): string {
  return `${w}-${l}-${t}`;
}

export function formatNumber(value: number | null, digits = 1): string {
  return value === null ? DASH : value.toFixed(digits);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
