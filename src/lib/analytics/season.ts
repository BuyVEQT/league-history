import type { Matchup, Season, Team, TeamId } from "../types";
import { winPct } from "./format";

export interface StandingRow {
  teamId: TeamId;
  managerId: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  catWins: number;
  catLosses: number;
  catTies: number;
  winPct: number | null;
  rank: number;
}

/** Winner of a matchup, or null for a tie (regular season only). */
export function matchupWinner(m: Matchup): TeamId | null {
  if (m.homeCats > m.awayCats) return m.homeTeamId;
  if (m.awayCats > m.homeCats) return m.awayTeamId;
  return m.tiebreakWinnerTeamId ?? null;
}

export function teamIndex(season: Season): Map<TeamId, Team> {
  return new Map(season.teams.map((t) => [t.id, t]));
}

/**
 * What standings are ranked by: category win % ("categories") or matchup win % ("matchups").
 * A season's own method follows its scoring type.
 */
export type RankMethod = "categories" | "matchups";
export const rankMethod = (season: Season): RankMethod => (season.scoring === "categories" ? "categories" : "matchups");

export interface StandingsOptions {
  /** Only count regular-season weeks up to and including this one (the standings as they stood then). */
  throughWeek?: number;
  /** Rank by a method other than the season's own (for "what if" comparisons). */
  method?: RankMethod;
}

/**
 * Regular-season standings, derived purely from regular-season matchups.
 * "most_categories" leagues rank by matchup win%; "categories" leagues rank by
 * category win% (Yahoo's Head-to-Head - Categories). Ties in either fall back
 * to category differential, category wins, the source's seed order, then team id
 * (always deterministic).
 */
export function seasonStandings(season: Season, { throughWeek = Infinity, method = rankMethod(season) }: StandingsOptions = {}): StandingRow[] {
  const rows = new Map<TeamId, StandingRow>(
    season.teams.map((t) => [
      t.id,
      {
        teamId: t.id,
        managerId: t.managerId,
        teamName: t.name,
        wins: 0,
        losses: 0,
        ties: 0,
        catWins: 0,
        catLosses: 0,
        catTies: 0,
        winPct: null,
        rank: 0,
      },
    ]),
  );

  for (const m of season.matchups) {
    if (m.stage !== "regular" || m.week > throughWeek) continue;
    const home = rows.get(m.homeTeamId)!;
    const away = rows.get(m.awayTeamId)!;
    home.catWins += m.homeCats;
    home.catLosses += m.awayCats;
    home.catTies += m.tiedCats;
    away.catWins += m.awayCats;
    away.catLosses += m.homeCats;
    away.catTies += m.tiedCats;
    if (m.homeCats === m.awayCats) {
      home.ties++;
      away.ties++;
    } else if (m.homeCats > m.awayCats) {
      home.wins++;
      away.losses++;
    } else {
      away.wins++;
      home.losses++;
    }
  }

  const list = [...rows.values()];
  for (const r of list) r.winPct = winPct(r.wins, r.losses, r.ties);
  const rankPct = (r: StandingRow) => (method === "categories" ? winPct(r.catWins, r.catLosses, r.catTies) : r.winPct) ?? -1;
  const seed = (id: TeamId) => {
    const i = season.sourceSeedOrder?.indexOf(id) ?? -1;
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  list.sort(
    (a, b) =>
      rankPct(b) - rankPct(a) ||
      b.catWins - b.catLosses - (a.catWins - a.catLosses) ||
      b.catWins - a.catWins ||
      seed(a.teamId) - seed(b.teamId) ||
      a.teamId.localeCompare(b.teamId),
  );
  list.forEach((r, i) => (r.rank = i + 1));
  return list;
}

export interface SeasonOutcome {
  standings: StandingRow[];
  /** Null when the season has no completed championship game yet. */
  championTeamId: TeamId | null;
  runnerUpTeamId: TeamId | null;
  playoffTeamIds: Set<TeamId>;
  /**
   * Final placement for every team. Uses the source's official ranks when the
   * season has them; otherwise playoff games decide 1-4 and the rest keep their
   * regular-season rank.
   */
  finalRank: Map<TeamId, number>;
}

export function seasonOutcome(season: Season): SeasonOutcome {
  const standings = seasonStandings(season);
  const finalRank = new Map<TeamId, number>(standings.map((r) => [r.teamId, r.rank]));
  const playoffTeamIds = new Set<TeamId>();
  let championTeamId: TeamId | null = null;
  let runnerUpTeamId: TeamId | null = null;

  for (const m of season.matchups) {
    if (m.stage === "regular") continue;
    playoffTeamIds.add(m.homeTeamId);
    playoffTeamIds.add(m.awayTeamId);
    const winner = matchupWinner(m);
    if (!winner) continue;
    const loser = winner === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
    if (m.stage === "final") {
      championTeamId = winner;
      runnerUpTeamId = loser;
      finalRank.set(winner, 1);
      finalRank.set(loser, 2);
    } else if (m.stage === "third_place") {
      finalRank.set(winner, 3);
      finalRank.set(loser, 4);
    }
  }
  if (season.finalRanks) {
    for (const [teamId, rank] of Object.entries(season.finalRanks)) finalRank.set(teamId, rank);
  }
  return { standings, championTeamId, runnerUpTeamId, playoffTeamIds, finalRank };
}
