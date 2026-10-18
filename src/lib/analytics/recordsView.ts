import type { League } from "../types";
import { winPct } from "./format";
import type { NamesakeRow } from "./players";
import { seasonRace } from "./race";
import type { MarginRow, PlayoffRow, SeedHistory, SeedSeasonRow } from "./records";
import type { AlternateStandings } from "./whatIf";

/**
 * Presentation shapes for the Records page. Everything here reshapes or picks from the outputs of the
 * existing analytics (records, race, whatIf, scorelines, players); no new formulas.
 */

export interface SeedStripSeason extends SeedSeasonRow {
  /** Playoff spots that season, from the bracket. */
  spots: number;
}

/** Each season's playoff field size next to its champion's seed, for the champion-seed strip. */
export function seedStrip(league: League, seeds: SeedHistory): SeedStripSeason[] {
  const spots = new Map(league.seasons.map((s) => [s.year, seasonRace(s).spots]));
  return seeds.seasons.map((s) => ({ ...s, spots: spots.get(s.year) ?? 0 }));
}

export interface SeedTiles {
  /** Seasons with a champion. */
  decided: number;
  lowestSeed: number | null;
  /** Every season won from the lowest seed. */
  lowest: SeedSeasonRow[];
  avgChampionSeed: number | null;
}

export function seedTiles(seeds: SeedHistory): SeedTiles {
  const decided = seeds.seasons.filter((s) => s.championSeed !== null);
  if (!decided.length) return { decided: 0, lowestSeed: null, lowest: [], avgChampionSeed: null };
  const lowestSeed = Math.max(...decided.map((s) => s.championSeed!));
  return {
    decided: decided.length,
    lowestSeed,
    lowest: decided.filter((s) => s.championSeed === lowestSeed),
    avgChampionSeed: decided.reduce((a, s) => a + s.championSeed!, 0) / decided.length,
  };
}

/** The last regular-season week of each season, for placing streaks on a week axis. */
export function regularWeeks(league: League): Record<number, number> {
  return Object.fromEntries(league.seasons.map((s) => [s.year, seasonRace(s).weeks.at(-1) ?? 0]));
}

/** Biggest average places gained over seed, among managers with `minTrips`+ playoff trips. */
export function biggestRiser(rows: PlayoffRow[], minTrips = 3): PlayoffRow | null {
  return [...rows].filter((r) => r.appearances >= minTrips).sort((a, b) => b.avgOverSeed - a.avgOverSeed)[0] ?? null;
}

/** Best record in one-category weeks, among managers with `minGames`+ of them. */
export function iceInTheVeins(rows: MarginRow[], minGames = 20): { row: MarginRow; pct: number } | null {
  const ranked = rows
    .filter((r) => r.closeWins + r.closeLosses >= minGames)
    .map((row) => ({ row, pct: winPct(row.closeWins, row.closeLosses, 0) ?? 0 }))
    .sort((a, b) => b.pct - a.pct);
  return ranked[0] ?? null;
}

/** Blowout threshold: the default `marginRecords` uses (won by 7+ categories). */
export const BLOWOUT = 7;

export type ScorelineKind = "close" | "mid" | "blowout" | "sweep";

/** Which colour band a final score ("6-3", "5-3-1") falls in: one category or level, 2-6, a 7+ blowout, or a clean sweep. */
export function scorelineKind(score: string): ScorelineKind {
  const [won, lost, tied = 0] = score.split("-").map(Number);
  const margin = won - lost;
  if (lost === 0 && tied === 0 && won > 0) return "sweep";
  if (margin <= 1) return "close";
  if (margin >= BLOWOUT) return "blowout";
  return "mid";
}

/** Seasons where the other ranking changes the playoff field or first place. */
export const changedAlternates = (alternates: AlternateStandings[]) =>
  alternates.filter((a) => a.out.length || a.altTop.teamId !== a.actualTop.teamId);

export type NamesakeOwnership = "kept" | "lost" | "later" | "rival" | "never";

/** Did the team have its namesake: drafted and kept, drafted and lost, picked up later, a rival had him, or nobody did. */
export function namesakeOwnership(r: NamesakeRow): NamesakeOwnership {
  if (r.draftedBy === "them") return r.ownedAtEnd ? "kept" : "lost";
  if (r.ownedAtEnd) return "later";
  return r.draftedBy ? "rival" : "never";
}
