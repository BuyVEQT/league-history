import type { League, ManagerId } from "../types";
import { managerSeasons, type YearRange } from "./career";
import { winPct } from "./format";
import { GOAT_LABELS, GOAT_SPREAD, GOAT_WEIGHTS, type GoatPart, type GoatRow } from "./goat";

/**
 * Display-only reshaping for the leaderboard and overview. No new formulas: values come from
 * goatScores / managerSeasons (and format's winPct, the tie-as-half rule used everywhere).
 */

export interface GoatSlice {
  key: GoatPart;
  label: string;
  /** The part's weight, 0-1. */
  weight: number;
  /** The manager's standard score on the part: 0 = league average, +1 = one standard deviation better. */
  z: number;
  /**
   * Points this part adds to (+) or takes from (−) the average of 50: GOAT_SPREAD × weight × z.
   * 50 plus the slices is the score (before it's kept within 0-100).
   */
  points: number;
}

/** A GOAT score split into its six weighted parts, in weight order, for a bar that grows either way from 50. */
export function goatStack(row: GoatRow): GoatSlice[] {
  return (Object.keys(GOAT_WEIGHTS) as GoatPart[]).map((key) => ({
    key,
    label: GOAT_LABELS[key],
    weight: GOAT_WEIGHTS[key],
    z: row.z[key],
    points: GOAT_SPREAD * GOAT_WEIGHTS[key] * row.z[key],
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
