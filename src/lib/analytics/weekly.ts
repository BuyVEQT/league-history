import type { League, ManagerId } from "../types";
import { managerSeasons } from "./career";
import { seasonOutcome, teamIndex } from "./season";

export interface WeeklyProfile {
  /** Weeks in which the manager won k categories, k = 0..categories (regular season and playoffs). */
  dist: number[];
  /** The same count over every team in the league, for comparison. */
  leagueDist: number[];
  weeks: number;
  avgCats: number;
  /** Weeks they won every category, and weeks an opponent did it to them. */
  sweeps: number;
  swept: number;
}

/** How many categories a manager typically wins in a week, against the league's typical week. */
export function weeklyProfile(league: League, managerId: ManagerId): WeeklyProfile {
  const cats = Math.max(...league.seasons.map((s) => s.categories.length));
  const dist = Array<number>(cats + 1).fill(0);
  const leagueDist = Array<number>(cats + 1).fill(0);
  let sweeps = 0;
  let swept = 0;
  for (const season of league.seasons) {
    const teams = teamIndex(season);
    const n = season.categories.length;
    for (const m of season.matchups) {
      for (const [mine, theirs, teamId] of [
        [m.homeCats, m.awayCats, m.homeTeamId],
        [m.awayCats, m.homeCats, m.awayTeamId],
      ] as const) {
        leagueDist[mine]++;
        if (teams.get(teamId)!.managerId !== managerId) continue;
        dist[mine]++;
        if (mine === n) sweeps++;
        if (theirs === n) swept++;
      }
    }
  }
  const weeks = dist.reduce((a, b) => a + b, 0);
  return { dist, leagueDist, weeks, avgCats: weeks ? dist.reduce((a, c, k) => a + c * k, 0) / weeks : 0, sweeps, swept };
}

export interface RaceRow {
  managerId: ManagerId;
  /** Regular-season categories won. */
  catWins: number;
  /** Regular-season matchups won. */
  wins: number;
  titles: number;
  /** Top-3 final finishes. */
  podiums: number;
  seasons: number;
}

/** Running all-time totals after each season, one frame per season (oldest first). Managers appear once they've played. */
export function allTimeRace(league: League): { year: number; label: string; rows: RaceRow[] }[] {
  const totals = new Map<ManagerId, RaceRow>();
  return league.seasons.map((season) => {
    const outcome = seasonOutcome(season);
    for (const s of outcome.standings) {
      const r = totals.get(s.managerId) ?? { managerId: s.managerId, catWins: 0, wins: 0, titles: 0, podiums: 0, seasons: 0 };
      const final = outcome.finalRank.get(s.teamId)!;
      totals.set(s.managerId, {
        ...r,
        catWins: r.catWins + s.catWins,
        wins: r.wins + s.wins,
        titles: r.titles + (outcome.championTeamId === s.teamId ? 1 : 0),
        podiums: r.podiums + (final <= 3 ? 1 : 0),
        seasons: r.seasons + 1,
      });
    }
    return { year: season.year, label: season.label, rows: [...totals.values()] };
  });
}

/** One point per season a manager played: regular-season seed and final finish. */
export const careerPath = (league: League, managerId: ManagerId) =>
  managerSeasons(league, managerId).map((s) => ({
    year: s.year,
    label: s.label,
    teamName: s.teamName,
    seed: s.regularRank,
    final: s.finalRank,
    teams: s.teamCount,
    result: s.playoffResult,
    winPct: s.winPct,
  }));
