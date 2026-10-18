import type { League, ManagerId, Matchup, Season, TeamId } from "../types";
import { managerSeasons } from "./career";
import { winPct } from "./format";
import { matchupWinner, seasonOutcome, teamIndex, type StandingRow } from "./season";

/** The win % a season's standings are ranked by (category % in categories leagues). */
export const standingPct = (season: Season, r: StandingRow): number | null =>
  season.scoring === "categories" ? winPct(r.catWins, r.catLosses, r.catTies) : r.winPct;

const managerOf = (season: Season) => {
  const teams = teamIndex(season);
  return (id: TeamId) => teams.get(id)!.managerId;
};

export interface PlayoffRow {
  managerId: ManagerId;
  appearances: number;
  avgSeed: number;
  avgFinish: number;
  /** Mean of (seed − final finish): positive = finished better than seeded. */
  avgOverSeed: number;
  playoffWins: number;
  playoffLosses: number;
  finals: number;
  titles: number;
}

export function playoffRecords(league: League): PlayoffRow[] {
  const rows: PlayoffRow[] = [];
  for (const m of league.managers) {
    const apps = managerSeasons(league, m.id).filter((s) => s.playoffResult !== "Missed playoffs");
    if (!apps.length) continue;
    let w = 0;
    let l = 0;
    for (const season of league.seasons) {
      const owner = managerOf(season);
      for (const g of season.matchups.filter((x) => x.stage !== "regular")) {
        const sides = [g.homeTeamId, g.awayTeamId];
        const mine = sides.find((t) => owner(t) === m.id);
        if (!mine) continue;
        if (matchupWinner(g) === mine) w++;
        else l++;
      }
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    rows.push({
      managerId: m.id,
      appearances: apps.length,
      avgSeed: mean(apps.map((s) => s.regularRank)),
      avgFinish: mean(apps.map((s) => s.finalRank)),
      avgOverSeed: mean(apps.map((s) => s.regularRank - s.finalRank)),
      playoffWins: w,
      playoffLosses: l,
      finals: apps.filter((s) => s.finalRank <= 2).length,
      titles: apps.filter((s) => s.finalRank === 1).length,
    });
  }
  return rows.sort((a, b) => b.avgOverSeed - a.avgOverSeed);
}

export interface DroughtRow {
  managerId: ManagerId;
  titles: number;
  lastTitle: string | null;
  /** Seasons played since the last title (or since joining, if never won). */
  current: number;
  seasonsPlayed: number;
}

export function titleDroughts(league: League): DroughtRow[] {
  return league.managers
    .map((m) => {
      const seasons = managerSeasons(league, m.id);
      const lastWin = seasons.map((s) => s.playoffResult).lastIndexOf("Champion");
      return {
        managerId: m.id,
        titles: seasons.filter((s) => s.playoffResult === "Champion").length,
        lastTitle: lastWin >= 0 ? seasons[lastWin].label : null,
        current: seasons.length - 1 - lastWin,
        seasonsPlayed: seasons.length,
      };
    })
    .filter((r) => r.seasonsPlayed > 0)
    .sort((a, b) => b.current - a.current || a.titles - b.titles);
}

export interface MarginRow {
  managerId: ManagerId;
  /** Matchups decided by exactly one category. */
  closeWins: number;
  closeLosses: number;
  /** Margin of 7+ categories. */
  blowoutWins: number;
  blowoutLosses: number;
}

const margin = (m: Matchup) => Math.abs(m.homeCats - m.awayCats);

export function marginRecords(league: League, blowout = 7): MarginRow[] {
  const rows = new Map<ManagerId, MarginRow>();
  const row = (id: ManagerId) =>
    rows.get(id) ?? rows.set(id, { managerId: id, closeWins: 0, closeLosses: 0, blowoutWins: 0, blowoutLosses: 0 }).get(id)!;
  for (const season of league.seasons) {
    const owner = managerOf(season);
    for (const g of season.matchups) {
      const winner = matchupWinner(g);
      if (!winner || g.homeCats === g.awayCats) continue;
      const loser = winner === g.homeTeamId ? g.awayTeamId : g.homeTeamId;
      if (margin(g) === 1) {
        row(owner(winner)).closeWins++;
        row(owner(loser)).closeLosses++;
      } else if (margin(g) >= blowout) {
        row(owner(winner)).blowoutWins++;
        row(owner(loser)).blowoutLosses++;
      }
    }
  }
  return [...rows.values()].sort(
    (a, b) => (winPct(b.closeWins, b.closeLosses, 0) ?? 0) - (winPct(a.closeWins, a.closeLosses, 0) ?? 0) || b.closeWins - a.closeWins,
  );
}

export interface TeamSeasonRow {
  year: number;
  label: string;
  managerId: ManagerId;
  teamName: string;
  pct: number;
  record: string;
  finalRank: number;
}

/** Every team-season ranked by the win % its league ranks standings by. */
export function teamSeasons(league: League): TeamSeasonRow[] {
  return league.seasons
    .flatMap((season) => {
      const outcome = seasonOutcome(season);
      const cats = season.scoring === "categories";
      return outcome.standings.map((r) => ({
        year: season.year,
        label: season.label,
        managerId: r.managerId,
        teamName: r.teamName,
        pct: standingPct(season, r) ?? 0,
        record: cats ? `${r.catWins}-${r.catLosses}-${r.catTies}` : `${r.wins}-${r.losses}-${r.ties}`,
        finalRank: outcome.finalRank.get(r.teamId)!,
      }));
    })
    .sort((a, b) => b.pct - a.pct);
}

export interface ConsistencyRow {
  managerId: ManagerId;
  seasons: number;
  /** Average finish as a percentile of the league: 0 = always first, 1 = always last. */
  avgPercentile: number;
  /** Standard deviation of that percentile; lower = steadier. */
  spread: number;
}

/** Finish percentiles make 10- and 12-team seasons comparable. */
export function consistency(league: League, minSeasons = 3): ConsistencyRow[] {
  return league.managers
    .map((m) => {
      const ps = managerSeasons(league, m.id).map((s) => (s.finalRank - 1) / (s.teamCount - 1));
      const avg = ps.reduce((a, b) => a + b, 0) / (ps.length || 1);
      const sd = Math.sqrt(ps.reduce((a, p) => a + (p - avg) ** 2, 0) / (ps.length || 1));
      return { managerId: m.id, seasons: ps.length, avgPercentile: avg, spread: sd };
    })
    .filter((r) => r.seasons >= minSeasons)
    .sort((a, b) => a.spread - b.spread);
}

export interface SeedSeasonRow {
  year: number;
  label: string;
  /** The champion's regular-season rank (its playoff seed). Null before a champion is decided. */
  championSeed: number | null;
  championManagerId: ManagerId | null;
  topSeedManagerId: ManagerId;
  topSeedTeam: string;
  topSeedFinish: number;
}

export interface SeedHistory {
  seasons: SeedSeasonRow[];
  /** Championship-bracket games (quarterfinals, semifinals, finals) won by the higher seed. */
  higherSeedWins: number;
  bracketGames: number;
  topSeedTitles: number;
}

/** Seeds are regular-season ranks, which match the source's playoff seeding. */
export function seedHistory(league: League): SeedHistory {
  let higherSeedWins = 0;
  let bracketGames = 0;
  const seasons: SeedSeasonRow[] = [];
  for (const season of league.seasons) {
    const outcome = seasonOutcome(season);
    if (!outcome.playoffTeamIds.size) continue;
    const seed = new Map(outcome.standings.map((r) => [r.teamId, r.rank]));
    for (const g of season.matchups) {
      if (g.stage === "regular" || g.stage === "third_place") continue;
      const higher = seed.get(g.homeTeamId)! < seed.get(g.awayTeamId)! ? g.homeTeamId : g.awayTeamId;
      bracketGames++;
      if (matchupWinner(g) === higher) higherSeedWins++;
    }
    const top = outcome.standings[0];
    const champ = outcome.championTeamId;
    seasons.push({
      year: season.year,
      label: season.label,
      championSeed: champ ? seed.get(champ)! : null,
      championManagerId: champ ? managerOf(season)(champ) : null,
      topSeedManagerId: top.managerId,
      topSeedTeam: top.teamName,
      topSeedFinish: outcome.finalRank.get(top.teamId)!,
    });
  }
  return { seasons, higherSeedWins, bracketGames, topSeedTitles: seasons.filter((s) => s.championSeed === 1).length };
}

export interface ParityRow {
  year: number;
  label: string;
  teams: number;
  /** Standard deviation of the standings win %: lower = more even league. */
  spread: number;
  best: number;
  worst: number;
  /** Win % gap between first place and the last playoff seed. */
  bubbleGap: number | null;
}

/** How even each season was, by the win % its standings are ranked on. */
export function parity(league: League): ParityRow[] {
  return league.seasons.map((season) => {
    const outcome = seasonOutcome(season);
    const pcts = outcome.standings.map((r) => standingPct(season, r) ?? 0);
    const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const spots = outcome.playoffTeamIds.size;
    return {
      year: season.year,
      label: season.label,
      teams: season.teams.length,
      spread: Math.sqrt(pcts.reduce((a, p) => a + (p - mean) ** 2, 0) / pcts.length),
      best: pcts[0],
      worst: pcts.at(-1)!,
      bubbleGap: spots ? pcts[0] - pcts[spots - 1] : null,
    };
  });
}
