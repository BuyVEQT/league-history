import type { League, ManagerId } from "../types";
import { managerSeasons, type YearRange } from "./career";
import { winPct } from "./format";
import { GOAT_LABELS, GOAT_WEIGHTS, type GoatRow } from "./goat";

/**
 * Display-only reshaping for the leaderboard and overview. No new formulas: values come from
 * goatScores / managerSeasons (and format's winPct, the tie-as-half rule used everywhere).
 */

export interface GoatSlice {
  key: keyof typeof GOAT_WEIGHTS;
  label: string;
  /** The part's weight, 0-1. */
  weight: number;
  /** The manager's scaled value for the part, 0-1 (worst to best qualifying manager). */
  part: number;
  /** Points this part adds to the 0-100 score: weight × part × 100. The slices add up to the score. */
  points: number;
}

/** A GOAT score split into its six weighted parts, in weight order, for a stacked bar. */
export function goatStack(row: GoatRow): GoatSlice[] {
  return (Object.keys(GOAT_WEIGHTS) as (keyof typeof GOAT_WEIGHTS)[]).map((key) => ({
    key,
    label: GOAT_LABELS[key],
    weight: GOAT_WEIGHTS[key],
    part: row.parts[key],
    points: 100 * GOAT_WEIGHTS[key] * row.parts[key],
  }));
}

export interface FinishPoint {
  year: number;
  label: string;
  teamName: string;
  final: number;
  teams: number;
  result: string;
  /** Category win % that season (ties count half). */
  catPct: number | null;
  /** Matchup win % that season. */
  winPct: number | null;
}

/** One point per season a manager played (oldest first), for finish sparklines and the bump chart. */
export function finishHistory(league: League, managerId: ManagerId, range: YearRange = {}): FinishPoint[] {
  return managerSeasons(league, managerId, range).map((s) => ({
    year: s.year,
    label: s.label,
    teamName: s.teamName,
    final: s.finalRank,
    teams: s.teamCount,
    result: s.playoffResult,
    catPct: winPct(s.catWins, s.catLosses, s.catTies),
    winPct: s.winPct,
  }));
}
