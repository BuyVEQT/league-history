/**
 * Display reshapes for the manager profile. No new formulas: everything here regroups, sorts or
 * counts outputs of existing analytics (careerStats, eloRatings, matchupLuck) and raw matchup results.
 */
import type { League, ManagerId } from "../types";
import type { CareerRow } from "./career";
import type { EloResult } from "./elo";
import { winPct } from "./format";
import { matchupWinner, teamIndex } from "./season";
import type { LuckRow } from "./whatIf";

/** 1 + the number of managers with a higher career category win %. */
export function catPctRank(careers: CareerRow[], managerId: ManagerId): number {
  const pct = (c: CareerRow) => winPct(c.catWins, c.catLosses, c.catTies) ?? 0;
  const me = careers.find((c) => c.managerId === managerId);
  if (!me) return careers.length;
  return careers.filter((c) => pct(c) > pct(me)).length + 1;
}

export interface FormGame {
  week: number;
  result: "W" | "L" | "T";
  my: number;
  their: number;
}

/** The last `n` regular-season matchups of one manager in each season they played, by year. */
export function lastWeeks(league: League, managerId: ManagerId, n = 5): Record<number, FormGame[]> {
  const out: Record<number, FormGame[]> = {};
  for (const season of league.seasons) {
    const teams = teamIndex(season);
    const games = season.matchups
      .filter((m) => m.stage === "regular" && [m.homeTeamId, m.awayTeamId].some((t) => teams.get(t)?.managerId === managerId))
      .sort((a, b) => a.week - b.week)
      .slice(-n)
      .map((m): FormGame => {
        const home = teams.get(m.homeTeamId)!.managerId === managerId;
        const w = matchupWinner(m);
        const mine = home ? m.homeTeamId : m.awayTeamId;
        return { week: m.week, result: w === null ? "T" : w === mine ? "W" : "L", my: home ? m.homeCats : m.awayCats, their: home ? m.awayCats : m.homeCats };
      });
    if (games.length) out[season.year] = games;
  }
  return out;
}

export interface EloMiniSeason {
  year: number;
  label: string;
  /** Ratings after each week played, with the week number. */
  points: { week: number; rating: number }[];
  start: number;
  end: number;
  high: number;
}

export interface EloMiniData {
  seasons: EloMiniSeason[];
  /** Every season of the league (so gaps show), and the longest season's week count. */
  years: { year: number; label: string }[];
  maxWeek: number;
  /** Lowest and highest rating anyone reached, so every manager's sparkline shares a scale. */
  min: number;
  max: number;
  peak: { year: number; label: string; week: number; rating: number } | null;
  /** Position in the latest season's ratings (1 = best), or null if they didn't play it. */
  rank: number | null;
  of: number;
  current: number | null;
}

/** One manager's power-rating history grouped by season, for a career sparkline. */
export function eloMini(league: League, elo: EloResult, managerId: ManagerId): EloMiniData {
  const hist = elo.history[managerId] ?? [];
  const seasons: EloMiniSeason[] = [];
  for (const p of hist) {
    let s = seasons.at(-1);
    if (!s || s.year !== p.year) {
      s = { year: p.year, label: p.label, points: [], start: p.rating, end: p.rating, high: p.rating };
      seasons.push(s);
    }
    s.points.push({ week: p.week, rating: p.rating });
    s.end = p.rating;
    s.high = Math.max(s.high, p.rating);
  }
  const all = Object.values(elo.history).flatMap((h) => h.map((p) => p.rating));
  const idx = elo.current.findIndex((r) => r.managerId === managerId);
  const peak = elo.peak[managerId];
  return {
    seasons,
    years: league.seasons.map((s) => ({ year: s.year, label: s.label })),
    maxWeek: Math.max(1, ...league.seasons.flatMap((s) => s.matchups.map((m) => m.week))),
    min: all.length ? Math.min(...all) : 1500,
    max: all.length ? Math.max(...all) : 1500,
    peak: peak ? { year: peak.year, label: peak.label, week: peak.week, rating: peak.rating } : null,
    rank: idx >= 0 ? idx + 1 : null,
    of: elo.current.length,
    current: idx >= 0 ? elo.current[idx].rating : null,
  };
}

/** One manager's matchup luck by season (oldest first), plus the league's biggest swing for a shared scale. */
export function luckMini(rows: LuckRow[], managerId: ManagerId) {
  return {
    rows: rows
      .filter((r) => r.managerId === managerId)
      .sort((a, b) => a.year - b.year)
      .map((r) => ({ year: r.year, label: r.label, teamName: r.teamName, actual: r.actual, expected: r.expected, luck: r.luck })),
    maxAbs: Math.max(0, ...rows.map((r) => Math.abs(r.luck))),
  };
}
