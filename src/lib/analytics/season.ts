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
 * Regular-season standings, derived purely from regular-season matchups.
 * Rank order: win% (tie = half a win), then category differential, then
 * category wins, then team id (so the order is always deterministic).
 */
export function seasonStandings(season: Season): StandingRow[] {
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
    if (m.stage !== "regular") continue;
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
  list.sort(
    (a, b) =>
      (b.winPct ?? -1) - (a.winPct ?? -1) ||
      b.catWins - b.catLosses - (a.catWins - a.catLosses) ||
      b.catWins - a.catWins ||
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
  /** Final placement for every team: playoff games decide 1-4, the rest keep their regular-season rank. */
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
  return { standings, championTeamId, runnerUpTeamId, playoffTeamIds, finalRank };
}
