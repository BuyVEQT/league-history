import type { League, ManagerId, Season, TeamId } from "../types";
import { seasonOutcome, seasonStandings } from "./season";

/**
 * The standings race: every team's rank after each regular-season week, ranked
 * exactly like the final standings but counting only the weeks played so far.
 */

export interface RaceLine {
  teamId: TeamId;
  managerId: ManagerId;
  teamName: string;
  /** Rank after each week in `SeasonRace.weeks`. */
  ranks: number[];
  /** Final regular-season rank (= playoff seed for playoff teams). */
  seed: number;
  finalRank: number;
  madePlayoffs: boolean;
  weeksInFirst: number;
}

export interface RaceMoment {
  teamId: TeamId;
  managerId: ManagerId;
  teamName: string;
  /** Worst rank (comebacks) or best rank (collapses) after midseason, and the week it happened. */
  rank: number;
  week: number;
  seed: number;
  finalRank: number;
}

export interface SeasonRace {
  weeks: number[];
  /** Playoff spots, from the bracket. 0 when the season has no playoff games. */
  spots: number;
  lines: RaceLine[];
  /** Made the playoffs despite sitting outside a playoff spot after midseason. Deepest hole first. */
  comebacks: RaceMoment[];
  /** Missed the playoffs despite sitting in the top half of the playoff field after midseason. */
  collapses: RaceMoment[];
  /** In a playoff spot going into the final week, out after it. */
  lastWeekOut: TeamId[];
  /** Out of a playoff spot going into the final week, in after it. */
  lastWeekIn: TeamId[];
}

export function seasonRace(season: Season): SeasonRace {
  const weeks = [...new Set(season.matchups.filter((m) => m.stage === "regular").map((m) => m.week))].sort((a, b) => a - b);
  const outcome = seasonOutcome(season);
  const spots = outcome.playoffTeamIds.size;
  const byWeek = weeks.map((w) => new Map(seasonStandings(season, { throughWeek: w }).map((r) => [r.teamId, r.rank])));

  const lines: RaceLine[] = outcome.standings.map((r) => {
    const ranks = byWeek.map((m) => m.get(r.teamId)!);
    return {
      teamId: r.teamId,
      managerId: r.managerId,
      teamName: r.teamName,
      ranks,
      seed: r.rank,
      finalRank: outcome.finalRank.get(r.teamId)!,
      madePlayoffs: outcome.playoffTeamIds.has(r.teamId),
      weeksInFirst: ranks.filter((x) => x === 1).length,
    };
  });

  const half = Math.floor(weeks.length / 2);
  const moment = (l: RaceLine, pick: (a: number, b: number) => boolean): RaceMoment => {
    let at = half;
    for (let i = half; i < l.ranks.length; i++) if (pick(l.ranks[i], l.ranks[at])) at = i;
    return { teamId: l.teamId, managerId: l.managerId, teamName: l.teamName, rank: l.ranks[at], week: weeks[at], seed: l.seed, finalRank: l.finalRank };
  };
  const comebacks = spots
    ? lines
        .filter((l) => l.madePlayoffs)
        .map((l) => moment(l, (a, b) => a > b))
        .filter((m) => m.rank > spots)
        .sort((a, b) => b.rank - a.rank || a.finalRank - b.finalRank)
    : [];
  const collapses = spots
    ? lines
        .filter((l) => !l.madePlayoffs)
        .map((l) => moment(l, (a, b) => a < b))
        .filter((m) => m.rank <= Math.ceil(spots / 2))
        .sort((a, b) => a.rank - b.rank || a.finalRank - b.finalRank)
    : [];

  const before = weeks.length >= 2 ? byWeek[weeks.length - 2] : null;
  const inBefore = (id: TeamId) => before !== null && before.get(id)! <= spots;
  const inAfter = (l: RaceLine) => l.seed <= spots;
  return {
    weeks,
    spots,
    lines,
    comebacks,
    collapses,
    lastWeekOut: before && spots ? lines.filter((l) => inBefore(l.teamId) && !inAfter(l)).map((l) => l.teamId) : [],
    lastWeekIn: before && spots ? lines.filter((l) => !inBefore(l.teamId) && inAfter(l)).map((l) => l.teamId) : [],
  };
}

export interface RaceRecord extends RaceMoment {
  year: number;
  label: string;
}

export interface FrontRunnerRecord {
  year: number;
  label: string;
  managerId: ManagerId;
  teamName: string;
  weeksInFirst: number;
  weeks: number;
  finalRank: number;
}

export interface RaceRecords {
  /** Team-seasons by weeks spent in first place, most first. */
  frontRunners: FrontRunnerRecord[];
  comebacks: RaceRecord[];
  collapses: RaceRecord[];
  /** Knocked out of a playoff spot in the final week. */
  heartbreaks: RaceRecord[];
}

export function raceRecords(league: League): RaceRecords {
  const out: RaceRecords = { frontRunners: [], comebacks: [], collapses: [], heartbreaks: [] };
  for (const season of league.seasons) {
    const race = seasonRace(season);
    const tag = (m: RaceMoment): RaceRecord => ({ year: season.year, label: season.label, ...m });
    for (const l of race.lines) {
      if (l.weeksInFirst) {
        out.frontRunners.push({
          year: season.year,
          label: season.label,
          managerId: l.managerId,
          teamName: l.teamName,
          weeksInFirst: l.weeksInFirst,
          weeks: race.weeks.length,
          finalRank: l.finalRank,
        });
      }
    }
    out.comebacks.push(...race.comebacks.map(tag));
    out.collapses.push(...race.collapses.map(tag));
    for (const id of race.lastWeekOut) {
      const l = race.lines.find((x) => x.teamId === id)!;
      const lastWeek = race.weeks.at(-1)!;
      out.heartbreaks.push(tag({ teamId: id, managerId: l.managerId, teamName: l.teamName, rank: l.seed, week: lastWeek, seed: l.seed, finalRank: l.finalRank }));
    }
  }
  out.frontRunners.sort((a, b) => b.weeksInFirst / b.weeks - a.weeksInFirst / a.weeks || a.finalRank - b.finalRank);
  // Deepest hole relative to the playoff line first; a 12th place in a 12-team league is as deep as it gets.
  out.comebacks.sort((a, b) => b.rank - a.rank || a.finalRank - b.finalRank || b.year - a.year);
  out.collapses.sort((a, b) => a.rank - b.rank || b.finalRank - a.finalRank || b.year - a.year);
  out.heartbreaks.sort((a, b) => b.year - a.year);
  return out;
}
