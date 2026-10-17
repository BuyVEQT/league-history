import type { PickValue } from "@/lib/analytics/draft";

export const rankLabel = (rank: number | null) => (rank === null ? "300+" : `#${rank}`);
export const signed = (n: number, digits = 0) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(digits)}`;

/** Background tint for a pick's value: green for steals, red for busts. */
export function valueTone(value: number): string {
  if (value >= 60) return "bg-positive/35";
  if (value >= 20) return "bg-positive/20";
  if (value >= 0) return "bg-positive/8";
  if (value > -40) return "bg-negative/10";
  if (value > -100) return "bg-negative/20";
  return "bg-negative/35";
}

export function PickLine({ p, manager }: { p: PickValue; manager: string }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2 text-sm">
      <div className="min-w-0">
        <div className="truncate font-medium">{p.playerName}</div>
        <div className="truncate text-xs text-muted">
          {p.label} · Rd {p.round}, #{p.overall} overall · {manager}
        </div>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <div className={p.value >= 0 ? "text-positive" : "text-negative"}>{signed(p.value)}</div>
        <div className="text-xs text-muted">finished {rankLabel(p.actualRank)}</div>
      </div>
    </li>
  );
}
