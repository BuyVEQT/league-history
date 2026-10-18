import type { League, ManagerId, PlayerSeason, Season, TeamId } from "../types";
import { standingPct } from "./records";
import { seasonOutcome, seasonStandings, teamIndex } from "./season";
import { rankValue, replacementRank } from "./value";

/**
 * Draft value compares what a player's finish was worth with what his draft
 * slot was expected to be worth (a pick is expected to finish at its slot):
 *
 *   value = rankValue(actual rank) − rankValue(overall pick)
 *
 * in 9-category z-score points above replacement (see ./value). Positive = a
 * steal, negative = a bust. Because value falls off steeply at the top, a
 * first-rounder who flops costs far more than a late pick who overachieves
 * gains. Players outside the source's top 300 are worth 0.
 */
/** Rank used when averaging ranks that include players outside the top 300. */
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
  const replacement = replacementRank(season);
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
      value: rankValue(actualRank, replacement) - rankValue(d.overall, replacement),
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
  /** Average actual rank of first-three-round picks (unranked players counted as 301). */
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
      hitRate: picks.filter((p) => p.actualRank !== null && p.actualRank <= p.overall).length / picks.length,
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

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Pearson correlation; null when either side has no variation. */
function correlation(xs: number[], ys: number[]): number | null {
  if (xs.length < 3) return null;
  const [mx, my] = [mean(xs), mean(ys)];
  let num = 0;
  let dx = 0;
  let dy = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    dx += (x - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  });
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
}

export interface FavouritePlayer {
  managerId: ManagerId;
  playerId: string;
  playerName: string;
  picks: PickValue[];
}

/** Players one manager drafted in `min`+ different seasons. Most drafts first. */
export function favouritePlayers(league: League, min = 3): FavouritePlayer[] {
  const groups = new Map<string, PickValue[]>();
  for (const p of leaguePicks(league)) {
    const key = `${p.managerId}|${p.playerId}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.values()]
    .filter((ps) => new Set(ps.map((p) => p.year)).size >= min)
    .map((ps) => ({ managerId: ps[0].managerId, playerId: ps[0].playerId, playerName: ps.at(-1)!.playerName, picks: ps }))
    .sort((a, b) => b.picks.length - a.picks.length || b.picks.at(-1)!.year - a.picks.at(-1)!.year || a.playerName.localeCompare(b.playerName));
}

export interface ReachRow {
  managerId: ManagerId;
  /** Picks in the rounds considered that have a pre-season rank. */
  picks: number;
  /** Mean spots taken ahead of the source's pre-season rank (negative = waits for players to fall). */
  avgEarly: number;
  /** Share of those picks taken `threshold`+ spots ahead of pre-season rank. */
  reachShare: number;
}

export interface ReachGroup {
  label: string;
  picks: number;
  /** Share that finished better than their pre-season rank. */
  beatRate: number;
}

export interface ReachSummary {
  rows: ReachRow[];
  /** Reaches vs everything else: does reaching for a player beat the pre-season rankings? */
  groups: ReachGroup[];
  /** Picks left out because the player has no pre-season rank (finished outside the top 300). */
  missingPreseason: number;
  maxRound: number;
  threshold: number;
}

/**
 * How far ahead of the source's pre-season rank each manager drafts, and
 * whether those reaches beat the rankings. Only players who finished inside
 * the top 300 carry a pre-season rank, so the worst busts are missing from
 * every group alike.
 */
export function reachStats(league: League, { maxRound = 8, threshold = 15 } = {}): ReachSummary | null {
  const all = leaguePicks(league).filter((p) => p.round <= maxRound);
  const ranked = all.filter((p) => p.preseasonRank !== null);
  if (!ranked.length) return null;
  const early = (p: PickValue) => p.preseasonRank! - p.overall;
  const byManager = new Map<ManagerId, PickValue[]>();
  for (const p of ranked) byManager.set(p.managerId, [...(byManager.get(p.managerId) ?? []), p]);
  const group = (label: string, ps: PickValue[]): ReachGroup => ({
    label,
    picks: ps.length,
    beatRate: ps.length ? ps.filter((p) => p.actualRank! < p.preseasonRank!).length / ps.length : 0,
  });
  return {
    rows: [...byManager.entries()]
      .map(([managerId, ps]) => ({
        managerId,
        picks: ps.length,
        avgEarly: mean(ps.map(early)),
        reachShare: ps.filter((p) => early(p) >= threshold).length / ps.length,
      }))
      .sort((a, b) => b.avgEarly - a.avgEarly),
    groups: [
      group(`Reached ${threshold}+ spots early`, ranked.filter((p) => early(p) >= threshold)),
      group(`Within ${threshold} spots`, ranked.filter((p) => Math.abs(early(p)) < threshold)),
      group(`Fell ${threshold}+ spots`, ranked.filter((p) => early(p) <= -threshold)),
    ],
    missingPreseason: all.length - ranked.length,
    maxRound,
    threshold,
  };
}

/** Seasons with both a draft and season-end rosters. */
const rosterSeasons = (league: League) => league.seasons.filter((s) => s.draft?.length && s.players?.length);

export interface KeepRow {
  managerId: ManagerId;
  drafts: number;
  /** Draft picks still on the roster at season end, per draft. */
  avgKept: number;
  keptShare: number;
}

/**
 * How many of their own picks each manager still had when the season ended.
 * Players outside the top 300 at season end have no recorded owner and count as gone.
 */
export function keepRates(league: League): { rows: KeepRow[]; correlation: number | null } {
  const per: { managerId: ManagerId; kept: number; share: number; percentile: number }[] = [];
  for (const season of rosterSeasons(league)) {
    const owner = new Map(season.players!.map((p) => [p.playerId, p.teamId]));
    const outcome = seasonOutcome(season);
    for (const t of season.teams) {
      const mine = season.draft!.filter((d) => d.teamId === t.id);
      if (!mine.length) continue;
      const kept = mine.filter((d) => owner.get(d.playerId) === t.id).length;
      per.push({ managerId: t.managerId, kept, share: kept / mine.length, percentile: (outcome.finalRank.get(t.id)! - 1) / (season.teams.length - 1) });
    }
  }
  const byManager = new Map<ManagerId, typeof per>();
  for (const r of per) byManager.set(r.managerId, [...(byManager.get(r.managerId) ?? []), r]);
  return {
    rows: [...byManager.entries()]
      .map(([managerId, rs]) => ({ managerId, drafts: rs.length, avgKept: mean(rs.map((r) => r.kept)), keptShare: mean(rs.map((r) => r.share)) }))
      .sort((a, b) => b.keptShare - a.keptShare),
    // Finish percentile: 0 = first. Negative correlation = managers who keep their picks finish higher.
    correlation: correlation(per.map((r) => r.share), per.map((r) => r.percentile)),
  };
}

export interface DraftImpact {
  teamSeasons: number;
  /** Correlation between the value of a team's drafted players and its regular-season win %. */
  correlation: number;
}

/** How much of the regular season the draft explains (correlation² = share of the variation). */
export function draftImpact(league: League): DraftImpact | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const season of rosterSeasons(league)) {
    const replacement = replacementRank(season);
    const rank = new Map(season.players!.map((p) => [p.playerId, p.actualRank]));
    for (const r of seasonStandings(season)) {
      const pct = standingPct(season, r);
      if (pct === null) continue;
      xs.push(season.draft!.filter((d) => d.teamId === r.teamId).reduce((sum, d) => sum + rankValue(rank.get(d.playerId) ?? null, replacement), 0));
      ys.push(pct);
    }
  }
  const r = correlation(xs, ys);
  return r === null ? null : { teamSeasons: xs.length, correlation: r };
}

export interface GotAwayRow {
  year: number;
  label: string;
  playerName: string;
  actualRank: number;
  round: number;
  overall: number;
  drafterManagerId: ManagerId;
  /** Season-end owner; null = a free agent when the season ended. */
  endManagerId: ManagerId | null;
  endTeam: string | null;
  /** "traded" when the drafter dealt him away in a completed trade, otherwise "dropped". */
  how: "traded" | "dropped";
}

/** Drafted players who finished in the top `maxRank` on someone else's roster (or nobody's). */
export function gotAway(league: League, maxRank = 40): GotAwayRow[] {
  return rosterSeasons(league)
    .flatMap((season) => {
      const teams = teamIndex(season);
      const players = new Map(season.players!.map((p) => [p.playerId, p]));
      return season.draft!.flatMap((d) => {
        const p = players.get(d.playerId);
        if (!p || p.actualRank > maxRank || p.teamId === d.teamId) return [];
        const traded = (season.trades ?? []).some(
          (t) =>
            t.status === "completed" &&
            t.sides.some((s) => s.teamId === d.teamId) &&
            t.sides.some((s) => s.teamId !== d.teamId && s.receives.some((r) => r.playerId === d.playerId)),
        );
        const end = p.teamId ? teams.get(p.teamId)! : null;
        return [
          {
            year: season.year,
            label: season.label,
            playerName: d.playerName,
            actualRank: p.actualRank,
            round: d.round,
            overall: d.overall,
            drafterManagerId: teams.get(d.teamId)!.managerId,
            endManagerId: end?.managerId ?? null,
            endTeam: end?.name ?? null,
            how: traded ? ("traded" as const) : ("dropped" as const),
          },
        ];
      });
    })
    .sort((a, b) => a.actualRank - b.actualRank || b.year - a.year);
}

export interface DraftPositionRow {
  managerId: ManagerId;
  drafts: number;
  /** Times picking first, second, and anywhere in the top three of round one. */
  firstPicks: number;
  secondPicks: number;
  topThreePicks: number;
  /** Average round-one slot, and as a share of the league (0 = always first, 1 = always last). */
  avgSlot: number;
  avgSlotShare: number;
  /** Players they drafted who finished the season ranked 1st, 2nd or 3rd. */
  topThreeFinishers: number;
  /**
   * Draft-position luck per draft, in the same value points as pick value: what their slot's picks
   * are worth across a 13-round snake draft, minus the average slot's. Positive = lucky (early slots).
   */
  slotLuck: number;
}

export const SNAKE_ROUNDS = 13;

/** Value of every pick a slot gets in a snake draft, minus the average slot's (see slotLuck). */
export function slotCapital(slot: number, teams: number, rounds = SNAKE_ROUNDS): number {
  const replacement = teams * rounds;
  const capital = (s: number) => {
    let sum = 0;
    for (let r = 1; r <= rounds; r++) sum += rankValue((r - 1) * teams + (r % 2 ? s : teams - s + 1), replacement);
    return sum;
  };
  let mean = 0;
  for (let s = 1; s <= teams; s++) mean += capital(s) / teams;
  return capital(slot) - mean;
}

/** Draft-position luck per manager: early slots get the surest stars. Earliest average slot first. */
export function draftPositions(league: League): DraftPositionRow[] {
  const rows = new Map<ManagerId, DraftPositionRow & { slots: number[]; shares: number[]; lucks: number[] }>();
  // A drafted but unplayed season counts too: its draft order is already set.
  for (const season of [...league.seasons, ...(league.upcoming ? [league.upcoming] : [])]) {
    if (!season.draft?.length) continue;
    const teams = teamIndex(season);
    const rank = new Map((season.players ?? []).map((p) => [p.playerId, p.actualRank]));
    for (const d of season.draft) {
      const managerId = teams.get(d.teamId)!.managerId;
      const row = rows.get(managerId) ?? { managerId, drafts: 0, firstPicks: 0, secondPicks: 0, topThreePicks: 0, avgSlot: 0, avgSlotShare: 0, topThreeFinishers: 0, slotLuck: 0, slots: [], shares: [], lucks: [] as number[] };
      rows.set(managerId, row);
      if ((rank.get(d.playerId) ?? Infinity) <= 3) row.topThreeFinishers++;
      if (d.round !== 1) continue;
      row.drafts++;
      if (d.pick === 1) row.firstPicks++;
      if (d.pick === 2) row.secondPicks++;
      if (d.pick <= 3) row.topThreePicks++;
      row.slots.push(d.pick);
      row.shares.push((d.pick - 1) / Math.max(1, season.teams.length - 1));
      row.lucks.push(slotCapital(d.pick, season.teams.length));
    }
  }
  return [...rows.values()]
    .filter((r) => r.drafts)
    .map(({ slots, shares, lucks, ...r }) => ({ ...r, avgSlot: mean(slots), avgSlotShare: mean(shares), slotLuck: mean(lucks) }))
    .sort((a, b) => a.avgSlotShare - b.avgSlotShare || b.topThreePicks - a.topThreePicks);
}
