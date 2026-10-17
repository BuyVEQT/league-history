import type { League, ManagerId, PlayerSeason, Season, TeamId } from "../types";
import { seasonOutcome, teamIndex } from "./season";

/**
 * Draft value compares where a player was picked with where he actually
 * finished (the source's end-of-season rank, full NBA season).
 *
 *   value = overall pick − actual rank
 *
 * Positive = a steal (finished better than drafted), negative = a bust.
 * Players outside the source's top 300 are scored as rank 301 — the most
 * generous possible bound, so busts are never overstated.
 */
export const UNRANKED = 301;

export interface PickValue {
  year: number;
  label: string;
  round: number;
  pick: number;
  overall: number;
  teamId: TeamId;
  managerId: ManagerId;
  teamName: string;
  playerId: string;
  playerName: string;
  /** Null when the player finished outside the top 300. */
  actualRank: number | null;
  preseasonRank: number | null;
  value: number;
}

export function seasonPicks(season: Season): PickValue[] {
  if (!season.draft) return [];
  const teams = teamIndex(season);
  const players = new Map<string, PlayerSeason>((season.players ?? []).map((p) => [p.playerId, p]));
  return season.draft.map((d) => {
    const p = players.get(d.playerId);
    const actualRank = p?.actualRank ?? null;
    const team = teams.get(d.teamId)!;
    return {
      year: season.year,
      label: season.label,
      round: d.round,
      pick: d.pick,
      overall: d.overall,
      teamId: d.teamId,
      managerId: team.managerId,
      teamName: team.name,
      playerId: d.playerId,
      playerName: d.playerName,
      actualRank,
      preseasonRank: p?.preseasonRank ?? null,
      value: d.overall - (actualRank ?? UNRANKED),
    };
  });
}

export const leaguePicks = (league: League): PickValue[] => league.seasons.flatMap(seasonPicks);

export const hasDraftData = (league: League) => league.seasons.some((s) => (s.draft?.length ?? 0) > 0);

/** Best value picks, any round. */
export const topSteals = (picks: PickValue[], n = 10) =>
  [...picks].sort((a, b) => b.value - a.value || a.overall - b.overall).slice(0, n);

/** Worst value among early picks, where a miss actually hurts. */
export const topBusts = (picks: PickValue[], n = 10, maxRound = 3) =>
  [...picks].filter((p) => p.round <= maxRound).sort((a, b) => a.value - b.value || a.overall - b.overall).slice(0, n);

/** Late picks (round 8+) who finished inside the top 75. */
export const lateGems = (picks: PickValue[]) =>
  picks.filter((p) => p.round >= 8 && p.actualRank !== null && p.actualRank <= 75).sort((a, b) => a.actualRank! - b.actualRank!);

export interface ManagerDraftRow {
  managerId: ManagerId;
  drafts: number;
  picks: number;
  /** Mean value per pick across every draft. */
  avgValue: number;
  /**
   * avgValue minus the league-wide mean value per pick. Drafted players finish
   * below their slot on average (injuries, rookies, unranked players), so raw
   * value is negative for nearly everyone; 0 here means an average drafter.
   */
  vsLeague: number;
  /** Share of picks that finished at or better than their draft slot. */
  hitRate: number;
  /** Average actual rank of first-three-round picks (null if unranked counted as 301). */
  coreAvgRank: number;
  coreAvgSlot: number;
  gems: number;
  best: PickValue;
  worst: PickValue;
}

export function managerDraftStats(league: League): ManagerDraftRow[] {
  const byManager = new Map<ManagerId, PickValue[]>();
  for (const p of leaguePicks(league)) byManager.set(p.managerId, [...(byManager.get(p.managerId) ?? []), p]);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const leagueMean = mean([...byManager.values()].flat().map((p) => p.value));
  const rows: ManagerDraftRow[] = [];
  for (const [managerId, picks] of byManager) {
    const avgValue = mean(picks.map((p) => p.value));
    const core = picks.filter((p) => p.round <= 3);
    rows.push({
      managerId,
      drafts: new Set(picks.map((p) => p.year)).size,
      picks: picks.length,
      avgValue,
      vsLeague: avgValue - leagueMean,
      hitRate: picks.filter((p) => p.value >= 0).length / picks.length,
      coreAvgRank: mean(core.map((p) => p.actualRank ?? UNRANKED)),
      coreAvgSlot: mean(core.map((p) => p.overall)),
      gems: lateGems(picks).length,
      best: topSteals(picks, 1)[0],
      worst: topBusts(picks, 1)[0] ?? [...picks].sort((a, b) => a.value - b.value)[0],
    });
  }
  return rows.sort((a, b) => b.avgValue - a.avgValue);
}

export interface DraftSlotRow {
  year: number;
  label: string;
  teamCount: number;
  firstPick: PickValue;
  /** Final placement of the team holding the first overall pick. */
  firstPickTeamFinish: number;
  championManagerId: ManagerId | null;
  /** Round-one pick number of the eventual champion. */
  championSlot: number | null;
}

/** Who picked first each year, and where the champion drafted from. */
export function draftSlotHistory(league: League): DraftSlotRow[] {
  return league.seasons
    .filter((s) => s.draft?.length)
    .map((season) => {
      const picks = seasonPicks(season);
      const first = picks.find((p) => p.overall === 1)!;
      const outcome = seasonOutcome(season);
      const champ = outcome.championTeamId;
      return {
        year: season.year,
        label: season.label,
        teamCount: season.teams.length,
        firstPick: first,
        firstPickTeamFinish: outcome.finalRank.get(first.teamId)!,
        championManagerId: champ ? teamIndex(season).get(champ)!.managerId : null,
        championSlot: champ ? (picks.find((p) => p.round === 1 && p.teamId === champ)?.pick ?? null) : null,
      };
    });
}

/** Average final finish by round-one draft slot, across every season with a draft. */
export function finishByDraftSlot(league: League): { slot: number; seasons: number; avgFinish: number; titles: number }[] {
  const acc = new Map<number, { finishes: number[]; titles: number }>();
  for (const season of league.seasons) {
    if (!season.draft?.length) continue;
    const outcome = seasonOutcome(season);
    for (const d of season.draft.filter((x) => x.round === 1)) {
      const e = acc.get(d.pick) ?? { finishes: [], titles: 0 };
      e.finishes.push(outcome.finalRank.get(d.teamId)!);
      if (outcome.championTeamId === d.teamId) e.titles++;
      acc.set(d.pick, e);
    }
  }
  return [...acc.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([slot, e]) => ({
      slot,
      seasons: e.finishes.length,
      avgFinish: e.finishes.reduce((a, b) => a + b, 0) / e.finishes.length,
      titles: e.titles,
    }));
}
