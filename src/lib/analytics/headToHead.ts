import type { League, ManagerId, Stage } from "../types";
import type { YearRange } from "./career";
import { matchupWinner, teamIndex } from "./season";

export interface H2HGame {
  year: number;
  week: number;
  stage: Stage;
  aCats: number;
  bCats: number;
  tiedCats: number;
  /** Manager who won; null = tied (regular season only). */
  winner: ManagerId | null;
  aTeamName: string;
  bTeamName: string;
}

export interface Tally {
  aWins: number;
  bWins: number;
  ties: number;
}

export interface H2HResult extends Tally {
  a: ManagerId;
  b: ManagerId;
  games: H2HGame[];
  regular: Tally;
  playoff: Tally;
  playoffMeetings: number;
  finalMeetings: number;
  aCatWins: number;
  bCatWins: number;
  catTies: number;
  byYear: ({ year: number } & Tally)[];
}

const emptyTally = (): Tally => ({ aWins: 0, bWins: 0, ties: 0 });

function add(t: Tally, winner: ManagerId | null, a: ManagerId) {
  if (winner === null) t.ties++;
  else if (winner === a) t.aWins++;
  else t.bWins++;
}

/**
 * Head-to-head built only from actual matchups between the two managers.
 * Seasons where they did not both play simply contribute nothing.
 */
export function headToHead(league: League, a: ManagerId, b: ManagerId, range: YearRange = {}): H2HResult {
  const result: H2HResult = {
    a,
    b,
    ...emptyTally(),
    games: [],
    regular: emptyTally(),
    playoff: emptyTally(),
    playoffMeetings: 0,
    finalMeetings: 0,
    aCatWins: 0,
    bCatWins: 0,
    catTies: 0,
    byYear: [],
  };
  if (a === b) return result;

  for (const season of league.seasons) {
    if (range.from !== undefined && season.year < range.from) continue;
    if (range.to !== undefined && season.year > range.to) continue;
    const teams = teamIndex(season);
    const yearTally = emptyTally();
    for (const m of season.matchups) {
      const home = teams.get(m.homeTeamId)!;
      const away = teams.get(m.awayTeamId)!;
      const isPair =
        (home.managerId === a && away.managerId === b) || (home.managerId === b && away.managerId === a);
      if (!isPair) continue;
      const aIsHome = home.managerId === a;
      const winnerTeam = matchupWinner(m);
      const winner = winnerTeam === null ? null : teams.get(winnerTeam)!.managerId;
      const aCats = aIsHome ? m.homeCats : m.awayCats;
      const bCats = aIsHome ? m.awayCats : m.homeCats;

      result.games.push({
        year: season.year,
        week: m.week,
        stage: m.stage,
        aCats,
        bCats,
        tiedCats: m.tiedCats,
        winner,
        aTeamName: (aIsHome ? home : away).name,
        bTeamName: (aIsHome ? away : home).name,
      });
      add(result, winner, a);
      add(yearTally, winner, a);
      add(m.stage === "regular" ? result.regular : result.playoff, winner, a);
      if (m.stage !== "regular") result.playoffMeetings++;
      if (m.stage === "final") result.finalMeetings++;
      result.aCatWins += aCats;
      result.bCatWins += bCats;
      result.catTies += m.tiedCats;
    }
    if (yearTally.aWins + yearTally.bWins + yearTally.ties > 0) {
      result.byYear.push({ year: season.year, ...yearTally });
    }
  }
  return result;
}

export interface RivalRecord {
  opponentId: ManagerId;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  games: number;
}

/** A manager's record against every opponent they have actually faced. */
export function opponentRecords(league: League, managerId: ManagerId): RivalRecord[] {
  const out: RivalRecord[] = [];
  for (const other of league.managers) {
    if (other.id === managerId) continue;
    const h = headToHead(league, managerId, other.id);
    const games = h.aWins + h.bWins + h.ties;
    if (games === 0) continue;
    out.push({
      opponentId: other.id,
      wins: h.aWins,
      losses: h.bWins,
      ties: h.ties,
      winPct: (h.aWins + 0.5 * h.ties) / games,
      games,
    });
  }
  return out;
}

export interface H2HCell {
  wins: number;
  losses: number;
  ties: number;
}

/**
 * Every pair's head-to-head record in one pass, from the row manager's side
 * (regular season and playoffs). Only managers who played appear.
 */
export function h2hMatrix(league: League): { ids: ManagerId[]; cells: Record<ManagerId, Record<ManagerId, H2HCell>> } {
  const cells: Record<ManagerId, Record<ManagerId, H2HCell>> = {};
  const cell = (a: ManagerId, b: ManagerId) => ((cells[a] ??= {})[b] ??= { wins: 0, losses: 0, ties: 0 });
  for (const season of league.seasons) {
    const teams = teamIndex(season);
    for (const m of season.matchups) {
      const home = teams.get(m.homeTeamId)!.managerId;
      const away = teams.get(m.awayTeamId)!.managerId;
      const w = matchupWinner(m);
      if (w === null) {
        cell(home, away).ties++;
        cell(away, home).ties++;
      } else {
        const [winner, loser] = w === m.homeTeamId ? [home, away] : [away, home];
        cell(winner, loser).wins++;
        cell(loser, winner).losses++;
      }
    }
  }
  return { ids: league.managers.map((m) => m.id).filter((id) => cells[id]), cells };
}

export interface RivalryPair {
  a: ManagerId;
  b: ManagerId;
  /** From a's side. */
  wins: number;
  losses: number;
  ties: number;
  games: number;
  /** a's win %, a tie counting half. */
  pct: number;
  playoffMeetings: number;
  finalMeetings: number;
}

/** Every pair of managers who have met, once each (a before b in league order). */
export function rivalryPairs(league: League): RivalryPair[] {
  const { ids, cells } = h2hMatrix(league);
  const playoff = new Map<string, { po: number; fin: number }>();
  for (const season of league.seasons) {
    const teams = teamIndex(season);
    for (const m of season.matchups) {
      if (m.stage === "regular") continue;
      const key = [teams.get(m.homeTeamId)!.managerId, teams.get(m.awayTeamId)!.managerId].sort().join("|");
      const p = playoff.get(key) ?? { po: 0, fin: 0 };
      playoff.set(key, { po: p.po + 1, fin: p.fin + (m.stage === "final" ? 1 : 0) });
    }
  }
  const out: RivalryPair[] = [];
  ids.forEach((a, i) =>
    ids.slice(i + 1).forEach((b) => {
      const c = cells[a]?.[b];
      const games = c ? c.wins + c.losses + c.ties : 0;
      if (!c || !games) return;
      const p = playoff.get([a, b].sort().join("|"));
      out.push({ a, b, ...c, games, pct: (c.wins + c.ties / 2) / games, playoffMeetings: p?.po ?? 0, finalMeetings: p?.fin ?? 0 });
    }),
  );
  return out;
}
