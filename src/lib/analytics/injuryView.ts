import type { League, ManagerId, Season, TeamId } from "../types";
import { leaguePicks, type PickValue } from "./draft";
import { seasonOutcome } from "./season";

/**
 * Injury luck: how many games each manager's drafted players actually played. Built only from games
 * played (no injury reports), so a player who sat for any reason (injury, rest, suspension, a
 * holdout, a trade to a team that benched him) counts as missing those games.
 *
 * Draft value (./draft) already feels injuries, since a player who misses half the season finishes
 * lower; this view splits out the health part on its own.
 */

/** Rounds that count as a manager's core picks, where a lost season hurts most. */
export const EARLY_ROUNDS = 3;
/** Share of the schedule a pick has to play to count as an iron man (78 of 82, 69 of 72). */
export const IRON_MAN_SHARE = 0.95;
/** Drafts a manager needs before they're ranked (one draft is mostly noise). */
export const MIN_DRAFTS_FOR_HEALTH = 2;
/** NBA regular-season length by end year, where it wasn't 82 games. */
const SHORT_SEASONS: Record<number, number> = { 2021: 72 };

/** Games on the NBA schedule that season. */
export const seasonGames = (season: Pick<Season, "year">) => SHORT_SEASONS[season.year] ?? 82;

export interface PickHealth extends PickValue {
  /** Games played, capped at the schedule (sources count a traded player's extra games, and the 2023 Cup final). */
  games: number;
  scheduled: number;
  missed: number;
  /** games / scheduled, 0-1. */
  availability: number;
}

/** Every draft pick whose games played is known. */
export function pickHealth(league: League): PickHealth[] {
  const gp = new Map<string, number>();
  const scheduled = new Map<number, number>();
  for (const s of league.seasons) {
    scheduled.set(s.year, seasonGames(s));
    for (const d of s.draft ?? []) if (d.gamesPlayed !== undefined) gp.set(`${s.year}|${d.playerId}`, d.gamesPlayed);
    for (const p of s.players ?? []) if (p.gamesPlayed !== null) gp.set(`${s.year}|${p.playerId}`, p.gamesPlayed);
  }
  return leaguePicks(league).flatMap((p) => {
    const played = gp.get(`${p.year}|${p.playerId}`);
    if (played === undefined) return [];
    const of = scheduled.get(p.year)!;
    const games = Math.min(played, of);
    return [{ ...p, games, scheduled: of, missed: of - games, availability: games / of }];
  });
}

const isEarly = (p: PickHealth) => p.round <= EARLY_ROUNDS;
const isIronMan = (p: PickHealth) => p.availability >= IRON_MAN_SHARE;
const share = (picks: PickHealth[]) => {
  const of = picks.reduce((a, p) => a + p.scheduled, 0);
  return of ? picks.reduce((a, p) => a + p.games, 0) / of : 0;
};
const byMissed = (a: PickHealth, b: PickHealth) => b.missed - a.missed || a.overall - b.overall || a.year - b.year;

export interface ManagerHealth {
  managerId: ManagerId;
  drafts: number;
  /** False with fewer than MIN_DRAFTS_FOR_HEALTH drafts: listed last, not ranked. */
  ranked: boolean;
  /** Share of possible games their round 1-3 picks played. */
  earlyAvailability: number;
  /** earlyAvailability minus the league's, in percentage points (+ = healthier than average). */
  vsLeague: number;
  /** Games their round 1-3 picks missed, per draft. */
  earlyMissedPerDraft: number;
  /** Share of possible games all their picks played. */
  allAvailability: number;
  /** Round 1-3 picks who played 95%+ of the schedule. */
  ironMen: number;
  earlyPicks: number;
  /** Their round 1-3 pick who missed the most games. */
  worst: PickHealth | null;
}

export interface HealthSummary {
  rows: ManagerHealth[];
  leagueEarly: number;
  leagueAll: number;
  /** League-wide games missed by round 1-3 picks, per manager-draft. */
  leagueEarlyMissedPerDraft: number;
}

/** Per-manager health of their drafted players, healthiest first (unranked managers last). */
export function managerHealth(picks: PickHealth[]): HealthSummary {
  const early = picks.filter(isEarly);
  const leagueEarly = share(early);
  const managerDrafts = new Set(picks.map((p) => `${p.managerId}|${p.year}`)).size;
  const byManager = Map.groupBy(picks, (p) => p.managerId);
  const rows = [...byManager].map(([managerId, mine]): ManagerHealth => {
    const core = mine.filter(isEarly);
    const drafts = new Set(mine.map((p) => p.year)).size;
    const earlyAvailability = share(core);
    return {
      managerId,
      drafts,
      ranked: drafts >= MIN_DRAFTS_FOR_HEALTH,
      earlyAvailability,
      vsLeague: (earlyAvailability - leagueEarly) * 100,
      earlyMissedPerDraft: core.reduce((a, p) => a + p.missed, 0) / drafts,
      allAvailability: share(mine),
      ironMen: core.filter(isIronMan).length,
      earlyPicks: core.length,
      worst: [...core].sort(byMissed)[0] ?? null,
    };
  });
  rows.sort((a, b) => Number(b.ranked) - Number(a.ranked) || b.earlyAvailability - a.earlyAvailability || a.managerId.localeCompare(b.managerId));
  return {
    rows,
    leagueEarly,
    leagueAll: share(picks),
    leagueEarlyMissedPerDraft: managerDrafts ? early.reduce((a, p) => a + p.missed, 0) / managerDrafts : 0,
  };
}

/** Round 1-3 picks who missed the most games. */
export const biggestLosses = (picks: PickHealth[], n = 10) => picks.filter(isEarly).sort(byMissed).slice(0, n);

/** Round 1-3 picks who played 95%+ of the schedule, earliest picks first. */
export const ironMen = (picks: PickHealth[]) =>
  picks.filter((p) => isEarly(p) && isIronMan(p)).sort((a, b) => b.availability - a.availability || a.overall - b.overall || a.year - b.year);

export interface HealthCell {
  managerId: ManagerId;
  year: number;
  label: string;
  availability: number;
  missed: number;
  /** That draft's round 1-3 picks, earliest first. */
  picks: PickHealth[];
}

/** Manager x season grid of round 1-3 health, plus each season's hardest-hit and healthiest manager. */
export function healthGrid(picks: PickHealth[]) {
  const cells = new Map<string, HealthCell>();
  for (const [key, mine] of Map.groupBy(picks.filter(isEarly), (p) => `${p.managerId}|${p.year}`)) {
    const [{ managerId, year, label }] = mine;
    cells.set(key, { managerId, year, label, availability: share(mine), missed: mine.reduce((a, p) => a + p.missed, 0), picks: [...mine].sort((a, b) => a.overall - b.overall) });
  }
  const years = [...new Map(picks.map((p) => [p.year, p.label]))].map(([year, label]) => ({ year, label })).sort((a, b) => a.year - b.year);
  const seasons = years.map(({ year, label }) => {
    const row = [...cells.values()].filter((c) => c.year === year).sort((a, b) => b.missed - a.missed || a.managerId.localeCompare(b.managerId));
    return { year, label, hardestHit: row[0] ?? null, healthiest: row.at(-1) ?? null };
  });
  return { years, cell: (managerId: ManagerId, year: number) => cells.get(`${managerId}|${year}`) ?? null, seasons };
}

export interface RepeatPlayer {
  playerId: string;
  name: string;
  times: number;
  availability: number;
  missed: number;
  /** Each time he was drafted, oldest first. */
  drafts: PickHealth[];
}

/** Players drafted in `minDrafts`+ seasons whose availability across those seasons was lowest: the known risks. */
export function repeatRisks(picks: PickHealth[], { minDrafts = 3, n = 8 } = {}): RepeatPlayer[] {
  return [...Map.groupBy(picks, (p) => p.playerId)]
    .filter(([, ds]) => ds.length >= minDrafts)
    .map(([playerId, ds]) => {
      const drafts = [...ds].sort((a, b) => a.year - b.year);
      return { playerId, name: drafts.at(-1)!.playerName, times: drafts.length, availability: share(drafts), missed: drafts.reduce((a, p) => a + p.missed, 0), drafts };
    })
    .sort((a, b) => a.availability - b.availability || b.times - a.times)
    .slice(0, n);
}

export interface HealthBucket {
  label: string;
  /** Lowest and highest round 1-3 availability in the group, 0-1. */
  min: number;
  max: number;
  seasons: number;
  avgFinish: number | null;
  playoffRate: number | null;
  titles: number;
}

/**
 * Finished manager-seasons split into thirds by how healthy their round 1-3 picks were (healthiest
 * first), with how those seasons ended. Thirds rather than fixed cut-offs so each group rests on a
 * similar number of seasons.
 */
export function healthVsFinish(league: League, picks: PickHealth[]): HealthBucket[] {
  const outcomes = new Map(league.seasons.map((s) => [s.year, seasonOutcome(s)]));
  const rows = [...Map.groupBy(picks.filter(isEarly), (p) => `${p.year}|${p.teamId}`).values()]
    .flatMap((mine) => {
      const { year, teamId } = mine[0] as { year: number; teamId: TeamId };
      const o = outcomes.get(year)!;
      if (!o.championTeamId) return []; // season not finished
      return [{ availability: share(mine), finish: o.finalRank.get(teamId) ?? null, playoffs: o.playoffTeamIds.has(teamId), title: o.championTeamId === teamId }];
    })
    .sort((a, b) => b.availability - a.availability);
  if (rows.length < 3) return [];
  const cut = [0, Math.round(rows.length / 3), Math.round((2 * rows.length) / 3), rows.length];
  return ["Healthiest third", "Middle third", "Most hurt third"].map((label, i) => {
    const group = rows.slice(cut[i], cut[i + 1]);
    const finishes = group.flatMap((r) => (r.finish === null ? [] : [r.finish]));
    return {
      label,
      min: group.at(-1)!.availability,
      max: group[0].availability,
      seasons: group.length,
      avgFinish: finishes.length ? finishes.reduce((a, b) => a + b, 0) / finishes.length : null,
      playoffRate: group.filter((r) => r.playoffs).length / group.length,
      titles: group.filter((r) => r.title).length,
    };
  });
}
