import Link from "next/link";
import { formatPct, ordinal } from "@/lib/analytics/format";
import type { FormGame } from "@/lib/analytics/managerView";
import { tt } from "./viz/tt";

/** Charts inside tables: the same three pieces on the season standings, week standings and manager season table. */

/** Win % as a number plus a bar on a fixed .35–.70 scale (so rows and tables compare); blue at .500+, red below. */
export function PctBar({ p, lo = 0.35, hi = 0.7 }: { p: number | null; lo?: number; hi?: number }) {
  if (p === null) return <span className="text-muted">—</span>;
  const w = Math.max(2, Math.min(100, ((p - lo) / (hi - lo)) * 100));
  return (
    <span className="pctbar">
      <span className="pctbar-n">{formatPct(p)}</span>
      <span className="pctbar-tr" aria-hidden>
        <span className="pctbar-fl" style={{ width: `${w}%`, background: p >= 0.5 ? "var(--pos)" : "var(--neg)" }} />
      </span>
    </span>
  );
}

const RESULT = { W: "Won", L: "Lost", T: "Tied" } as const;

/** Last regular-season weeks as W/L/T squares, oldest first; each opens its week page. `base` is the league root ("/demo"). */
export function FormChips({ games, base, year }: { games: FormGame[]; base: string; year: number }) {
  if (!games.length) return <span className="text-muted">—</span>;
  return (
    <span className="form">
      {games.map((g) => (
        <Link
          key={g.week}
          href={`${base}/seasons/${year}/week/${g.week}`}
          className={`fc ${g.result}`}
          aria-label={`Week ${g.week}: ${RESULT[g.result].toLowerCase()} ${g.my}-${g.their}`}
          data-tt={tt(`Week ${g.week}`, [["Categories", `${g.my}-${g.their}`]], `${RESULT[g.result]} · click for the week`)}
        >
          {g.result}
        </Link>
      ))}
    </span>
  );
}

/** "1 ▼ 5": regular-season seed to final finish. Green wash = finished better than seeded, red = worse. */
export function SeedArrow({ seed, final, title }: { seed: number; final: number; title?: string }) {
  const d = seed - final;
  return (
    <span
      tabIndex={0}
      className={`sa ${d > 0 ? "up" : d < 0 ? "down" : ""}`}
      aria-label={`Seeded ${ordinal(seed)}, finished ${ordinal(final)}`}
      data-tt={tt(title ?? "Seed → final", [
        ["Seed", ordinal(seed)],
        ["Final", ordinal(final)],
      ])}
    >
      <b>{seed}</b>
      <i aria-hidden>{d > 0 ? "▲" : d < 0 ? "▼" : "→"}</i>
      <b>{final}</b>
    </span>
  );
}
