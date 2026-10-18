import type { League, ManagerId } from "../types";
import { leaguePicks, seasonPicks, type DraftImpact } from "./draft";

/**
 * Presentation-only reshaping of ./draft outputs for the draft pages' charts.
 * No new formulas: everything here reads values the draft analytics already compute.
 */

export type DraftGrade = "A" | "B" | "C" | "D" | "F";

/** Grade cut-offs on value per pick vs the league average (managerDraftStats().vsLeague). Placeholders for the league to tune. */
export const GRADE_CUTOFFS = { A: 0.3, B: 0.1, D: -0.1, F: -0.3 } as const;

/** Letter grade for a value-vs-league figure: A ≥ +0.30, B ≥ +0.10, C within ±0.10, D ≤ −0.10, F ≤ −0.30. */
export function draftGrade(vsLeague: number): DraftGrade {
  if (vsLeague >= GRADE_CUTOFFS.A) return "A";
  if (vsLeague >= GRADE_CUTOFFS.B) return "B";
  if (vsLeague > GRADE_CUTOFFS.D) return "C";
  if (vsLeague > GRADE_CUTOFFS.F) return "D";
  return "F";
}

/** Share of the standings the draft explains: r² of draftImpact's correlation (what the site has always shown). */
export const impactShare = (impact: DraftImpact) => impact.correlation ** 2;

export interface RoundOneSlot {
  managerId: ManagerId;
  year: number;
  label: string;
  /** Round-one pick number. */
  slot: number;
  playerName: string;
  /** Null when the player finished outside the top 300, or the season hasn't been played. */
  actualRank: number | null;
  /** True for the drafted-but-unplayed upcoming season. */
  next: boolean;
}

/** Every round-one slot each manager has drawn, played seasons first, then the upcoming draft. */
export function roundOneSlots(league: League): RoundOneSlot[] {
  const played = leaguePicks(league).filter((p) => p.round === 1);
  const upcoming = league.upcoming?.draft?.length ? seasonPicks(league.upcoming).filter((p) => p.round === 1) : [];
  return [
    ...played.map((p) => ({ managerId: p.managerId, year: p.year, label: p.label, slot: p.pick, playerName: p.playerName, actualRank: p.actualRank, next: false })),
    ...upcoming.map((p) => ({ managerId: p.managerId, year: p.year, label: p.label, slot: p.pick, playerName: p.playerName, actualRank: null, next: true })),
  ];
}
