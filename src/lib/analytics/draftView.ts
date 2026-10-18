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

/** Slot luck is an average per draft; one draft is too few to rank a manager on it. */
export const MIN_DRAFTS_FOR_SLOT_LUCK = 2;

export interface TopThreeYear {
  year: number;
  label: string;
  next: boolean;
  /** Manager holding round-one picks #1, #2 and #3 (null if the draft had fewer teams captured). */
  picks: [ManagerId | null, ManagerId | null, ManagerId | null];
}

export interface TopThreeCount {
  managerId: ManagerId;
  first: number;
  second: number;
  third: number;
  total: number;
  /** Drafts they were in (round-one slots drawn). */
  drafts: number;
}

/** Who held picks #1-#3 in each draft (newest first), and how often each manager has had one (most first). */
export function topThreePicks(slots: RoundOneSlot[]): { years: TopThreeYear[]; counts: TopThreeCount[] } {
  const years = [...new Map(slots.map((s) => [s.year, s])).values()]
    .sort((a, b) => b.year - a.year)
    .map((s) => ({
      year: s.year,
      label: s.label,
      next: s.next,
      picks: [1, 2, 3].map((n) => slots.find((x) => x.year === s.year && x.slot === n)?.managerId ?? null) as TopThreeYear["picks"],
    }));
  const counts = new Map<ManagerId, TopThreeCount>();
  for (const s of slots) {
    const c = counts.get(s.managerId) ?? { managerId: s.managerId, first: 0, second: 0, third: 0, total: 0, drafts: 0 };
    c.drafts++;
    if (s.slot === 1) c.first++;
    if (s.slot === 2) c.second++;
    if (s.slot === 3) c.third++;
    if (s.slot <= 3) c.total++;
    counts.set(s.managerId, c);
  }
  return {
    years,
    counts: [...counts.values()].sort((a, b) => b.total - a.total || b.first - a.first || b.second - a.second || a.drafts - b.drafts),
  };
}
