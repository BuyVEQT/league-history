import type { League, ManagerId, Season } from "../types";
import { matchupWinner } from "./season";

/**
 * Consecutive regular-season matchup wins or losses within one season (a tie
 * ends both), the way Yahoo's record book counts them.
 */
export interface StreakRow {
  year: number;
  label: string;
  managerId: ManagerId;
  teamName: string;
  kind: "W" | "L";
  length: number;
  fromWeek: number;
  toWeek: number;
}

/** Each team's longest winning and longest losing streak of the season (the first, if tied). */
export function seasonStreaks(season: Season): StreakRow[] {
  const rows: StreakRow[] = [];
  for (const team of season.teams) {
    const games = season.matchups
      .filter((m) => m.stage === "regular" && (m.homeTeamId === team.id || m.awayTeamId === team.id))
      .sort((a, b) => a.week - b.week);
    const best: Partial<Record<StreakRow["kind"], StreakRow>> = {};
    let kind: StreakRow["kind"] | null = null;
    let from = 0;
    let length = 0;
    for (const g of games) {
      const w = matchupWinner(g);
      const k = w === null ? null : w === team.id ? "W" : "L";
      if (k !== null && k === kind) length++;
      else [kind, from, length] = [k, g.week, k === null ? 0 : 1];
      if (kind && length > (best[kind]?.length ?? 0)) {
        best[kind] = { year: season.year, label: season.label, managerId: team.managerId, teamName: team.name, kind, length, fromWeek: from, toWeek: g.week };
      }
    }
    rows.push(...Object.values(best));
  }
  return rows;
}

/** The league's longest streaks of one kind, longest first (latest first when tied). */
export function longestStreaks(league: League, kind: StreakRow["kind"], n = 5): StreakRow[] {
  return league.seasons
    .flatMap(seasonStreaks)
    .filter((r) => r.kind === kind)
    .sort((a, b) => b.length - a.length || b.year - a.year)
    .slice(0, n);
}

/** A manager's longest winning and losing streaks across every season. */
export function managerStreaks(league: League, managerId: ManagerId): { win: StreakRow | null; loss: StreakRow | null } {
  const mine = league.seasons.flatMap(seasonStreaks).filter((r) => r.managerId === managerId);
  const top = (kind: StreakRow["kind"]) =>
    mine.filter((r) => r.kind === kind).sort((a, b) => b.length - a.length || b.year - a.year)[0] ?? null;
  return { win: top("W"), loss: top("L") };
}
