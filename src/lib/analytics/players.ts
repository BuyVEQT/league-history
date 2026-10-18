import type { League, ManagerId, PlayerSeason, PlayerStats, Season, TeamId } from "../types";
import { seasonOutcome, teamIndex } from "./season";

/**
 * Player-level views built from the source's season ranks. `PlayerSeason.teamId`
 * is the owner when the season ended on the source, which is not necessarily
 * who held the player all season.
 */

export interface UnownedStar {
  year: number;
  label: string;
  playerName: string;
  actualRank: number;
  /** Who drafted him, if anyone. */
  draftedBy: ManagerId | null;
}

/** Top-ranked players who were free agents when the season ended. Best first. */
export function unownedStars(league: League, maxRank = 60): UnownedStar[] {
  return league.seasons
    .flatMap((season) => {
      const teams = teamIndex(season);
      const drafter = new Map((season.draft ?? []).map((d) => [d.playerId, teams.get(d.teamId)!.managerId]));
      const names = new Map((season.draft ?? []).map((d) => [d.playerId, d.playerName]));
      return (season.players ?? [])
        .filter((p) => p.teamId === null && p.actualRank <= maxRank)
        .map((p) => ({
          year: season.year,
          label: season.label,
          // The draft has full names; the ranks list abbreviates long ones.
          playerName: names.get(p.playerId) ?? p.name,
          actualRank: p.actualRank,
          draftedBy: drafter.get(p.playerId) ?? null,
        }));
    })
    .sort((a, b) => a.actualRank - b.actualRank || b.year - a.year);
}

export interface NamesakeRow {
  year: number;
  label: string;
  managerId: ManagerId;
  teamName: string;
  playerName: string;
  /** Null = outside the top 300 (or not in the league that season). */
  actualRank: number | null;
  /** "them" = the team drafted its namesake; otherwise the manager who did, or null if nobody did. */
  draftedBy: "them" | ManagerId | null;
  ownedAtEnd: boolean;
  finalRank: number;
  teamCount: number;
}

/** Teams named after a player: did they have him, and how did both do? Latest first. */
export function namesakes(league: League): NamesakeRow[] {
  return league.seasons
    .flatMap((season) => {
      const teams = teamIndex(season);
      const outcome = seasonOutcome(season);
      const players = new Map((season.players ?? []).map((p) => [p.playerId, p]));
      return season.teams
        .filter((t) => t.namesake)
        .map((t) => {
          const id = t.namesake!.playerId;
          const pick = id ? season.draft?.find((d) => d.playerId === id) : undefined;
          const p = id ? players.get(id) : undefined;
          return {
            year: season.year,
            label: season.label,
            managerId: t.managerId,
            teamName: t.name,
            playerName: t.namesake!.name,
            actualRank: p?.actualRank ?? null,
            draftedBy: pick ? (pick.teamId === t.id ? ("them" as const) : teams.get(pick.teamId)!.managerId) : null,
            ownedAtEnd: p?.teamId === t.id,
            finalRank: outcome.finalRank.get(t.id)!,
            teamCount: season.teams.length,
          };
        });
    })
    .sort((a, b) => b.year - a.year || a.finalRank - b.finalRank);
}

/** Team value per category from summed player totals. TO counts against. */
const CATEGORY: Record<string, { value: (t: PlayerStats) => number; lowerIsBetter?: boolean }> = {
  "FG%": { value: (t) => t.fgm / t.fga },
  "FT%": { value: (t) => t.ftm / t.fta },
  "3PM": { value: (t) => t.threes },
  PTS: { value: (t) => t.pts },
  REB: { value: (t) => t.reb },
  AST: { value: (t) => t.ast },
  STL: { value: (t) => t.stl },
  BLK: { value: (t) => t.blk },
  TO: { value: (t) => t.to, lowerIsBetter: true },
};

/**
 * A category this far below the league (in standard deviations), and this far
 * below the team's own average, looks like a punt. The second test keeps a team
 * that is weak everywhere from "punting" everything.
 */
export const PUNT_Z = -1.5;

export interface RosterProfile {
  teamId: TeamId;
  managerId: ManagerId;
  teamName: string;
  /** Standard score per category vs the rest of the league; positive = strong (TO flipped so fewer is better). */
  z: Record<string, number>;
  punts: string[];
  finalRank: number;
}

export interface RosterProfiles {
  categories: string[];
  /** Players counted per team: each roster's best N by season rank, N = the smallest roster. */
  playersPerTeam: number;
  rows: RosterProfile[];
}

/**
 * Approximate team builds from season-end rosters and the players' full-season
 * totals. Null when the season has no player stats for most rostered players.
 */
export function rosterProfiles(season: Season): RosterProfiles | null {
  const categories = season.categories.filter((c) => CATEGORY[c]);
  const owned = (season.players ?? []).filter((p): p is PlayerSeason & { teamId: TeamId } => p.teamId !== null);
  if (!categories.length || !owned.length || owned.filter((p) => p.stats).length < owned.length * 0.8) return null;

  const byTeam = new Map(season.teams.map((t) => [t.id, owned.filter((p) => p.teamId === t.id && p.stats).sort((a, b) => a.actualRank - b.actualRank)]));
  const n = Math.min(13, ...[...byTeam.values()].map((ps) => ps.length));
  if (n < 5) return null;
  const totals = new Map(
    [...byTeam.entries()].map(([teamId, ps]) => {
      const sum = { fgm: 0, fga: 0, ftm: 0, fta: 0, threes: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0 };
      for (const p of ps.slice(0, n)) for (const k of Object.keys(sum) as (keyof PlayerStats)[]) sum[k] += p.stats![k];
      return [teamId, sum];
    }),
  );
  const z = new Map<TeamId, Record<string, number>>(season.teams.map((t) => [t.id, {}]));
  for (const c of categories) {
    const values = season.teams.map((t) => CATEGORY[c].value(totals.get(t.id)!));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length) || 1;
    season.teams.forEach((t, i) => (z.get(t.id)![c] = ((values[i] - mean) / sd) * (CATEGORY[c].lowerIsBetter ? -1 : 1)));
  }
  const outcome = seasonOutcome(season);
  return {
    categories,
    playersPerTeam: n,
    rows: outcome.standings.map((r) => {
      const zs = z.get(r.teamId)!;
      const teamMean = categories.reduce((a, c) => a + zs[c], 0) / categories.length;
      return {
        teamId: r.teamId,
        managerId: r.managerId,
        teamName: r.teamName,
        z: zs,
        punts: categories.filter((c) => zs[c] <= PUNT_Z && zs[c] - teamMean <= PUNT_Z),
        finalRank: outcome.finalRank.get(r.teamId)!,
      };
    }),
  };
}
