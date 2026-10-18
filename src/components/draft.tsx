import type { PickValue } from "@/lib/analytics/draft";

export const rankLabel = (rank: number | null) => (rank === null ? "300+" : `#${rank}`);
export const signed = (n: number, digits = 0) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(digits)}`;

/**
 * Draft board chip tone (`.pick` classes) for a pick's value (z-score points vs the slot):
 * blue beat the slot, red fell short, solid at 3+ points either way.
 */
export function pickTone(value: number): "big-pos" | "pos" | "neg" | "big-neg" {
  if (value >= 3) return "big-pos";
  if (value >= 0) return "pos";
  if (value > -3) return "neg";
  return "big-neg";
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
        <div className={p.value >= 0 ? "text-positive" : "text-negative"}>{signed(p.value, 1)}</div>
        <div className="text-xs text-muted">finished {rankLabel(p.actualRank)}</div>
      </div>
    </li>
  );
}
