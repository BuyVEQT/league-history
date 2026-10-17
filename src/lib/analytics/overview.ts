import type { League, Season } from "../types";
import { careerStats, defaultCompare, type CareerRow } from "./career";
import { seasonOutcome, teamIndex } from "./season";

/** Managers need this many seasons to qualify for rate-based "best" rankings. */
export const MIN_SEASONS_FOR_RATES = 3;

export interface ChampionEntry {
  year: number;
  label: string;
  championManagerId: string | null;
  championTeamName: string | null;
  runnerUpManagerId: string | null;
  runnerUpTeamName: string | null;
}

export function championHistory(league: League): ChampionEntry[] {
  return league.seasons.map((season) => {
    const o = seasonOutcome(season);
    const teams = teamIndex(season);
    const champ = o.championTeamId ? teams.get(o.championTeamId)! : null;
    const ru = o.runnerUpTeamId ? teams.get(o.runnerUpTeamId)! : null;
    return {
      year: season.year,
      label: season.label,
      championManagerId: champ?.managerId ?? null,
      championTeamName: champ?.name ?? null,
      runnerUpManagerId: ru?.managerId ?? null,
      runnerUpTeamName: ru?.name ?? null,
    };
  });
}

export interface LeagueSummary {
  seasons: number;
  managers: number;
  completedMatchups: number;
  mostTitles: { rows: CareerRow[]; count: number };
  bestWinPct: CareerRow | null;
  mostRecentChampion: ChampionEntry | null;
}

export function leagueSummary(league: League): LeagueSummary {
  const careers = careerStats(league);
  const maxTitles = Math.max(0, ...careers.map((c) => c.titles));
  const qualified = careers.filter((c) => c.seasons >= MIN_SEASONS_FOR_RATES && c.winPct !== null);
  const bestWinPct = qualified.sort((a, b) => b.winPct! - a.winPct! || defaultCompare(a, b))[0] ?? null;
  const history = championHistory(league);
  return {
    seasons: league.seasons.length,
    managers: new Set(league.seasons.flatMap((s) => s.teams.map((t) => t.managerId))).size,
    completedMatchups: league.seasons.reduce((n, s) => n + s.matchups.length, 0),
    mostTitles: { rows: careers.filter((c) => c.titles === maxTitles && maxTitles > 0), count: maxTitles },
    bestWinPct,
    mostRecentChampion: [...history].reverse().find((h) => h.championManagerId) ?? null,
  };
}

export interface SeasonRecords {
  bestRecord: { teamName: string; managerId: string; wins: number; losses: number; ties: number } | null;
  /** Largest category margin in any decided regular-season matchup. */
  biggestBlowout: { winnerName: string; loserName: string; score: string; week: number } | null;
}

export function seasonRecords(season: Season): SeasonRecords {
  const o = seasonOutcome(season);
  const top = o.standings[0];
  const teams = teamIndex(season);
  let best: SeasonRecords["biggestBlowout"] = null;
  let bestMargin = 0;
  for (const m of season.matchups) {
    if (m.stage !== "regular") continue;
    const margin = Math.abs(m.homeCats - m.awayCats);
    if (margin > bestMargin) {
      bestMargin = margin;
      const homeWon = m.homeCats > m.awayCats;
      const hi = Math.max(m.homeCats, m.awayCats);
      const lo = Math.min(m.homeCats, m.awayCats);
      best = {
        winnerName: teams.get(homeWon ? m.homeTeamId : m.awayTeamId)!.name,
        loserName: teams.get(homeWon ? m.awayTeamId : m.homeTeamId)!.name,
        score: `${hi}-${lo}${m.tiedCats ? `-${m.tiedCats}` : ""}`,
        week: m.week,
      };
    }
  }
  return {
    bestRecord: top ? { teamName: top.teamName, managerId: top.managerId, wins: top.wins, losses: top.losses, ties: top.ties } : null,
    biggestBlowout: best,
  };
}
