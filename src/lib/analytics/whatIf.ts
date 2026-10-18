import type { League, ManagerId, Season, TeamId } from "../types";
import { winPct } from "./format";
import { rankMethod, seasonOutcome, seasonStandings, type RankMethod, type StandingRow } from "./season";

/**
 * Counterfactuals: the same results ranked the other way, and how many
 * matchups a team "should" have won given how many categories it won.
 */

export interface AlternateStandings {
  year: number;
  label: string;
  method: RankMethod;
  altMethod: RankMethod;
  spots: number;
  /** In the real playoff field, out of the alternate one. */
  out: StandingRow[];
  /** Out of the real field, in the alternate one. */
  in: StandingRow[];
  actualTop: StandingRow;
  altTop: StandingRow;
  /** Teams that reached the final but would have missed the alternate playoff field. */
  finalistsOut: TeamId[];
}

/** Standings re-ranked by the other method. Null without a playoff field to compare. */
export function alternateStandings(season: Season): AlternateStandings | null {
  const outcome = seasonOutcome(season);
  const spots = outcome.playoffTeamIds.size;
  if (!spots) return null;
  const method = rankMethod(season);
  const altMethod: RankMethod = method === "categories" ? "matchups" : "categories";
  const actual = outcome.standings;
  const alt = seasonStandings(season, { method: altMethod });
  const actualField = new Set(actual.slice(0, spots).map((r) => r.teamId));
  const altField = new Set(alt.slice(0, spots).map((r) => r.teamId));
  const out = actual.slice(0, spots).filter((r) => !altField.has(r.teamId));
  return {
    year: season.year,
    label: season.label,
    method,
    altMethod,
    spots,
    out,
    in: alt.slice(0, spots).filter((r) => !actualField.has(r.teamId)),
    actualTop: actual[0],
    altTop: alt[0],
    finalistsOut: out.filter((r) => r.teamId === outcome.championTeamId || r.teamId === outcome.runnerUpTeamId).map((r) => r.teamId),
  };
}

export const leagueAlternates = (league: League) =>
  league.seasons.map(alternateStandings).filter((a): a is AlternateStandings => a !== null);

/**
 * Probability of winning more of `n` categories than the opponent when each
 * category is won independently with probability `p`. An even split counts half.
 */
export function matchupWinProbability(p: number, n: number): number {
  let win = 0;
  let coef = 1; // n choose k
  for (let k = 0; k <= n; k++) {
    if (k > 0) coef = (coef * (n - k + 1)) / k;
    const pk = coef * p ** k * (1 - p) ** (n - k);
    if (2 * k > n) win += pk;
    else if (2 * k === n) win += pk / 2;
  }
  return win;
}

/** Log5: the chance A beats B on one category, from each side's season category win %. */
const log5 = (a: number, b: number) => (a * (1 - b) + (1 - a) * b === 0 ? 0.5 : (a * (1 - b)) / (a * (1 - b) + (1 - a) * b));

export interface LuckRow {
  year: number;
  label: string;
  managerId: ManagerId;
  teamName: string;
  games: number;
  /** Matchup wins, ties counting half. */
  actual: number;
  /** Matchup wins expected from the two teams' category win % in each matchup. */
  expected: number;
  /** actual − expected: positive = won more matchups than their category share deserved. */
  luck: number;
}

/** Regular-season matchup luck for every team-season. Luckiest first. */
export function matchupLuck(league: League): LuckRow[] {
  return league.seasons
    .flatMap((season) => {
      const standings = seasonStandings(season);
      const catPct = new Map(standings.map((r) => [r.teamId, winPct(r.catWins, r.catLosses, r.catTies) ?? 0.5]));
      return standings.map((r) => {
        let expected = 0;
        let games = 0;
        for (const m of season.matchups) {
          if (m.stage !== "regular" || (m.homeTeamId !== r.teamId && m.awayTeamId !== r.teamId)) continue;
          const opp = m.homeTeamId === r.teamId ? m.awayTeamId : m.homeTeamId;
          const n = season.categories.length || m.homeCats + m.awayCats + m.tiedCats;
          expected += matchupWinProbability(log5(catPct.get(r.teamId)!, catPct.get(opp)!), n);
          games++;
        }
        const actual = r.wins + r.ties / 2;
        return { year: season.year, label: season.label, managerId: r.managerId, teamName: r.teamName, games, actual, expected, luck: actual - expected };
      });
    })
    .sort((a, b) => b.luck - a.luck);
}

export interface CareerLuckRow {
  managerId: ManagerId;
  seasons: number;
  luck: number;
}

export function careerLuck(league: League): CareerLuckRow[] {
  const rows = new Map<ManagerId, CareerLuckRow>();
  for (const r of matchupLuck(league)) {
    const row = rows.get(r.managerId) ?? { managerId: r.managerId, seasons: 0, luck: 0 };
    row.seasons++;
    row.luck += r.luck;
    rows.set(r.managerId, row);
  }
  return [...rows.values()].sort((a, b) => b.luck - a.luck);
}
