import type { PickValue } from "@/lib/analytics/draft";
import { PlayerName } from "./panel/PlayerName";

export const rankLabel = (rank: number | null) => (rank === null ? "300+" : `#${rank}`);
/** "+1.2", "−0.4", or "±0.0" when the value rounds to zero at `digits` (so nothing shows as "−0.0"). */
export const signed = (n: number, digits = 0) => {
  const r = Number(n.toFixed(digits));
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r).toFixed(digits)}`;
};

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
        <div className="truncate font-medium">
          <PlayerName id={p.playerId} name={p.playerName} />
        </div>
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

/**
 * Inline diverging bar for a table cell: the number, then a track with a centre line and a bar growing
 * left (negative) or right (positive), scaled so `max` fills half the track.
 */
export function DivBar({
  value,
  max,
  digits = 1,
  pos = "var(--pos)",
  neg = "var(--neg)",
  tone = true,
  numWidth = 46,
  minWidth = 170,
  tt,
}: {
  value: number;
  max: number;
  digits?: number;
  pos?: string;
  neg?: string;
  /** Colour the number blue/red by sign. */
  tone?: boolean;
  numWidth?: number;
  minWidth?: number;
  /** Tooltip text (see viz/tt). */
  tt?: string;
}) {
  const w = max > 0 ? (Math.min(Math.abs(value), max) / max) * 50 : 0;
  const shown = Number(value.toFixed(digits));
  return (
    <div className="dr-inbar" style={{ minWidth }} data-tt={tt}>
      <span className={`n ${tone ? (shown > 0 ? "dr-pos" : shown < 0 ? "dr-neg" : "") : ""}`} style={{ width: numWidth }}>
        {signed(value, digits)}
      </span>
      <div className="trk div" aria-hidden>
        <div
          className={`fl ${value < 0 ? "lft" : ""}`}
          style={value >= 0 ? { left: "50%", width: `${w}%`, background: pos } : { right: "50%", width: `${w}%`, background: neg }}
        />
      </div>
    </div>
  );
}

/** Inline bar from zero: a label, then a track filled to `share` (0-1). */
export function FillBar({
  label,
  share,
  numWidth = 58,
  minWidth = 150,
  color = "var(--s1)",
  tt,
}: {
  label: string;
  share: number;
  numWidth?: number;
  minWidth?: number;
  color?: string;
  tt?: string;
}) {
  return (
    <div className="dr-inbar" style={{ minWidth }} data-tt={tt}>
      <span className="n" style={{ width: numWidth }}>
        {label}
      </span>
      <div className="trk" aria-hidden>
        <div className="fl" style={{ left: 0, width: `${Math.max(0, Math.min(1, share)) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

/** Navy monogram disc (text from viz/monograms). */
export function Mono({ text }: { text: string }) {
  return (
    <span className="mono" aria-hidden>
      {text}
    </span>
  );
}
