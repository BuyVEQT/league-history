import type { League, ManagerId, Matchup, Season, Stage } from "../types";
import { matchupWinner, teamIndex } from "./season";

const categoryCount = (season: Season, m: Matchup) => season.categories.length || m.homeCats + m.awayCats + m.tiedCats;

/** "6-3", or "5-3-1" when categories were tied; winner's count first. */
export const scoreline = (m: Matchup) =>
  `${Math.max(m.homeCats, m.awayCats)}-${Math.min(m.homeCats, m.awayCats)}${m.tiedCats ? `-${m.tiedCats}` : ""}`;

export interface ScorelineSummary {
  rows: { score: string; count: number; share: number }[];
  matchups: number;
  /** Matchups where at least one category ended level. */
  withTiedCategory: number;
}

/** How often each final score happens, regular season and playoffs. */
export function scorelines(league: League): ScorelineSummary {
  const counts = new Map<string, number>();
  let matchups = 0;
  let withTiedCategory = 0;
  for (const season of league.seasons) {
    for (const m of season.matchups) {
      matchups++;
      if (m.tiedCats) withTiedCategory++;
      counts.set(scoreline(m), (counts.get(scoreline(m)) ?? 0) + 1);
    }
  }
  const rows = [...counts.entries()]
    .map(([score, count]) => ({ score, count, share: count / (matchups || 1) }))
    .sort((a, b) => b.count - a.count || a.score.localeCompare(b.score));
  return { rows, matchups, withTiedCategory };
}

export interface SweepRow {
  year: number;
  label: string;
  week: number;
  stage: Stage;
  score: string;
  winnerManagerId: ManagerId;
  winnerTeam: string;
  loserManagerId: ManagerId;
  loserTeam: string;
}

/** Matchups where one side won every category (9-0 in a nine-category league). Latest first. */
export function sweeps(league: League): SweepRow[] {
  const rows: SweepRow[] = [];
  for (const season of league.seasons) {
    const teams = teamIndex(season);
    for (const m of season.matchups) {
      const n = categoryCount(season, m);
      if (n === 0 || Math.max(m.homeCats, m.awayCats) !== n) continue;
      const winner = teams.get(matchupWinner(m)!)!;
      const loser = teams.get(winner.id === m.homeTeamId ? m.awayTeamId : m.homeTeamId)!;
      rows.push({
        year: season.year,
        label: season.label,
        week: m.week,
        stage: m.stage,
        score: scoreline(m),
        winnerManagerId: winner.managerId,
        winnerTeam: winner.name,
        loserManagerId: loser.managerId,
        loserTeam: loser.name,
      });
    }
  }
  return rows.sort((a, b) => b.year - a.year || b.week - a.week);
}

export interface MarginAverageRow {
  year: number;
  label: string;
  managerId: ManagerId;
  teamName: string;
  wins: number;
  /** Mean categories won by, in matchups won. Null without a win. */
  avgWinMargin: number | null;
  losses: number;
  /** Mean categories lost by, in matchups lost. Null without a loss. */
  avgLossMargin: number | null;
}

/**
 * Average margin of victory and defeat per team-season, playoffs included —
 * the way Yahoo's record book computes "Season Average" margins (Yahoo also
 * counts consolation games, which are not stored here).
 */
export function marginAverages(league: League): MarginAverageRow[] {
  return league.seasons.flatMap((season) =>
    season.teams.map((t) => {
      const won: number[] = [];
      const lost: number[] = [];
      for (const m of season.matchups) {
        if (m.homeTeamId !== t.id && m.awayTeamId !== t.id) continue;
        const [mine, theirs] = m.homeTeamId === t.id ? [m.homeCats, m.awayCats] : [m.awayCats, m.homeCats];
        if (mine > theirs) won.push(mine - theirs);
        else if (theirs > mine) lost.push(theirs - mine);
      }
      const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
      return {
        year: season.year,
        label: season.label,
        managerId: t.managerId,
        teamName: t.name,
        wins: won.length,
        avgWinMargin: avg(won),
        losses: lost.length,
        avgLossMargin: avg(lost),
      };
    }),
  );
}
