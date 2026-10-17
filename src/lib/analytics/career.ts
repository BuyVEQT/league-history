import type { League, ManagerId } from "../types";
import { winPct } from "./format";
import { seasonOutcome } from "./season";

export interface YearRange {
  from?: number;
  to?: number;
}

export interface CareerRow {
  managerId: ManagerId;
  name: string;
  seasons: number;
  firstYear: number | null;
  lastYear: number | null;
  titles: number;
  runnerUps: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number | null;
  catWins: number;
  catLosses: number;
  catTies: number;
  avgFinish: number | null;
  bestFinish: number | null;
  playoffApps: number;
  playoffPct: number | null;
}

export interface ManagerSeasonRow {
  year: number;
  label: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  catWins: number;
  catLosses: number;
  catTies: number;
  winPct: number | null;
  regularRank: number;
  finalRank: number;
  teamCount: number;
  playoffResult: "Champion" | "Runner-up" | "3rd place" | "4th place" | "Missed playoffs";
}

function playoffResult(finalRank: number, madePlayoffs: boolean): ManagerSeasonRow["playoffResult"] {
  if (!madePlayoffs) return "Missed playoffs";
  return (["Champion", "Runner-up", "3rd place", "4th place"] as const)[finalRank - 1] ?? "Missed playoffs";
}

function inRange(year: number, range: YearRange): boolean {
  return (range.from === undefined || year >= range.from) && (range.to === undefined || year <= range.to);
}

/** Every season a manager played, oldest first, with all values derived from matchups. */
export function managerSeasons(league: League, managerId: ManagerId, range: YearRange = {}): ManagerSeasonRow[] {
  const rows: ManagerSeasonRow[] = [];
  for (const season of league.seasons) {
    if (!inRange(season.year, range)) continue;
    const team = season.teams.find((t) => t.managerId === managerId);
    if (!team) continue;
    const outcome = seasonOutcome(season);
    const standing = outcome.standings.find((s) => s.teamId === team.id)!;
    const finalRank = outcome.finalRank.get(team.id)!;
    rows.push({
      year: season.year,
      label: season.label,
      teamName: team.name,
      wins: standing.wins,
      losses: standing.losses,
      ties: standing.ties,
      catWins: standing.catWins,
      catLosses: standing.catLosses,
      catTies: standing.catTies,
      winPct: standing.winPct,
      regularRank: standing.rank,
      finalRank,
      teamCount: season.teams.length,
      playoffResult: playoffResult(finalRank, outcome.playoffTeamIds.has(team.id)),
    });
  }
  return rows;
}

export function careerFromSeasons(managerId: ManagerId, name: string, seasons: ManagerSeasonRow[]): CareerRow {
  const sum = (f: (s: ManagerSeasonRow) => number) => seasons.reduce((a, s) => a + f(s), 0);
  const wins = sum((s) => s.wins);
  const losses = sum((s) => s.losses);
  const ties = sum((s) => s.ties);
  const finishes = seasons.map((s) => s.finalRank);
  const playoffApps = seasons.filter((s) => s.playoffResult !== "Missed playoffs").length;
  return {
    managerId,
    name,
    seasons: seasons.length,
    firstYear: seasons[0]?.year ?? null,
    lastYear: seasons.at(-1)?.year ?? null,
    titles: seasons.filter((s) => s.playoffResult === "Champion").length,
    runnerUps: seasons.filter((s) => s.playoffResult === "Runner-up").length,
    wins,
    losses,
    ties,
    winPct: winPct(wins, losses, ties),
    catWins: sum((s) => s.catWins),
    catLosses: sum((s) => s.catLosses),
    catTies: sum((s) => s.catTies),
    avgFinish: finishes.length ? finishes.reduce((a, b) => a + b, 0) / finishes.length : null,
    bestFinish: finishes.length ? Math.min(...finishes) : null,
    playoffApps,
    playoffPct: seasons.length ? playoffApps / seasons.length : null,
  };
}

/** All-time (or year-ranged) career rows for every manager who played in the range. */
export function careerStats(league: League, range: YearRange = {}): CareerRow[] {
  const rows: CareerRow[] = [];
  for (const manager of league.managers) {
    const seasons = managerSeasons(league, manager.id, range);
    if (seasons.length === 0) continue;
    rows.push(careerFromSeasons(manager.id, manager.name, seasons));
  }
  return rows;
}

/** Default leaderboard order: titles, then runner-ups, then win%, then name. */
export function defaultCompare(a: CareerRow, b: CareerRow): number {
  return (
    b.titles - a.titles ||
    b.runnerUps - a.runnerUps ||
    (b.winPct ?? -1) - (a.winPct ?? -1) ||
    a.name.localeCompare(b.name)
  );
}
