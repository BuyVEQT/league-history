import type { League, ManagerId, Season, TeamId, Trade } from "../types";
import { seasonOutcome, teamIndex } from "./season";
import { rankValue, replacementRank } from "./value";

/**
 * Trade value is each player's end-of-season rank on the same value-above-
 * replacement curve as the draft (see ./value): replacement level is roughly
 * how many players are rostered (teams × draft rounds, e.g. 156 in a 12-team,
 * 13-round league), and fringe players add nothing, so a side can't "win" just
 * by receiving more bodies.
 *
 * When every player in a trade has a post-trade rank (games after the trade
 * only, from Sleeper's game logs), the trade is scored on that: what each side
 * actually got. Otherwise it falls back to full-season ranks, which include
 * games played before the trade.
 */
export interface TradeSideView {
  teamId: TeamId;
  managerId: ManagerId;
  teamName: string;
  players: { name: string; playerId: string | null; actualRank: number | null; afterRank?: number | null; afterGames?: number }[];
  value: number;
}

export interface TradeView {
  year: number;
  label: string;
  date: string;
  status: Trade["status"];
  sides: TradeSideView[];
  /** "after" = scored on games after the trade; "season" = full-season ranks. */
  basis: "after" | "season";
  /** Manager whose incoming players were worth more; null for a dead-even trade. */
  winnerManagerId: ManagerId | null;
  margin: number;
}

export const hasTradeData = (league: League) => league.seasons.some((s) => s.activity);

export function seasonTrades(season: Season): TradeView[] {
  const teams = teamIndex(season);
  const rankById = new Map((season.players ?? []).map((p) => [p.playerId, p.actualRank]));
  const replacement = replacementRank(season);
  return (season.trades ?? []).map((t) => {
    const basis = t.sides.every((s) => s.receives.every((r) => r.afterTrade)) ? ("after" as const) : ("season" as const);
    const sides = t.sides.map((s) => {
      const team = teams.get(s.teamId)!;
      const players = s.receives.map(({ afterTrade, ...r }) => ({
        ...r,
        actualRank: r.playerId ? (rankById.get(r.playerId) ?? null) : null,
        ...(afterTrade && { afterRank: afterTrade.rank, afterGames: afterTrade.games }),
      }));
      return {
        teamId: s.teamId,
        managerId: team.managerId,
        teamName: team.name,
        players,
        value: players.reduce((sum, p) => sum + rankValue(basis === "after" ? p.afterRank! : p.actualRank, replacement), 0),
      };
    });
    const [a, b] = sides;
    const margin = Math.abs(a.value - b.value);
    return {
      year: season.year,
      label: season.label,
      date: t.date,
      status: t.status,
      basis,
      sides,
      winnerManagerId: margin === 0 ? null : a.value > b.value ? a.managerId : b.managerId,
      margin,
    };
  });
}

export const leagueTrades = (league: League): TradeView[] =>
  league.seasons.flatMap(seasonTrades).sort((x, y) => y.date.localeCompare(x.date));

export interface ManagerActivityRow {
  managerId: ManagerId;
  seasons: number;
  moves: number;
  movesPerSeason: number;
  /** Completed trades. */
  trades: number;
  vetoed: number;
  tradeWins: number;
  tradeLosses: number;
  /** Sum over completed trades of (value received − value given). */
  netValue: number;
  favoritePartner: { managerId: ManagerId; count: number } | null;
}

export function managerActivity(league: League): ManagerActivityRow[] {
  const trades = leagueTrades(league);
  const rows = new Map<ManagerId, ManagerActivityRow & { partners: Map<ManagerId, number> }>();
  const row = (id: ManagerId) => {
    if (!rows.has(id)) {
      rows.set(id, {
        managerId: id,
        seasons: 0,
        moves: 0,
        movesPerSeason: 0,
        trades: 0,
        vetoed: 0,
        tradeWins: 0,
        tradeLosses: 0,
        netValue: 0,
        favoritePartner: null,
        partners: new Map(),
      });
    }
    return rows.get(id)!;
  };

  for (const season of league.seasons) {
    if (!season.activity) continue;
    const teams = teamIndex(season);
    for (const [teamId, a] of Object.entries(season.activity)) {
      const r = row(teams.get(teamId)!.managerId);
      r.seasons++;
      r.moves += a.moves;
    }
  }

  for (const t of trades) {
    const [a, b] = t.sides;
    for (const [me, other] of [
      [a, b],
      [b, a],
    ]) {
      const r = row(me.managerId);
      if (t.status === "vetoed") {
        r.vetoed++;
        continue;
      }
      r.trades++;
      r.netValue += me.value - other.value;
      if (t.winnerManagerId === me.managerId) r.tradeWins++;
      else if (t.winnerManagerId === other.managerId) r.tradeLosses++;
      r.partners.set(other.managerId, (r.partners.get(other.managerId) ?? 0) + 1);
    }
  }

  return [...rows.values()]
    .map(({ partners, ...r }) => {
      const [top] = [...partners.entries()].sort((x, y) => y[1] - x[1]);
      return { ...r, movesPerSeason: r.seasons ? r.moves / r.seasons : 0, favoritePartner: top ? { managerId: top[0], count: top[1] } : null };
    })
    .sort((x, y) => y.trades - x.trades || y.moves - x.moves);
}

export interface UndraftedGem {
  year: number;
  label: string;
  playerName: string;
  actualRank: number;
  managerId: ManagerId;
  teamName: string;
}

/**
 * Players nobody drafted who finished inside the top N and were on a fantasy
 * roster at season end. "Owned at season end" — not necessarily who added them.
 */
export function undraftedGems(league: League, maxRank = 75): UndraftedGem[] {
  return league.seasons
    .flatMap((season) => {
      if (!season.draft?.length || !season.players) return [];
      const drafted = new Set(season.draft.map((d) => d.playerId));
      const teams = teamIndex(season);
      return season.players
        .filter((p) => p.teamId && !drafted.has(p.playerId) && p.actualRank <= maxRank)
        .map((p) => ({
          year: season.year,
          label: season.label,
          playerName: p.name,
          actualRank: p.actualRank,
          managerId: teams.get(p.teamId!)!.managerId,
          teamName: teams.get(p.teamId!)!.name,
        }));
    })
    .sort((a, b) => a.actualRank - b.actualRank);
}

export interface ActivityVsFinish {
  /** Average moves per team-season. */
  leagueAvg: number;
  championsAvg: number;
  /** Teams that finished in the top third vs the bottom third of their league. */
  topThirdAvg: number;
  bottomThirdAvg: number;
  seasons: number;
}

export function activityVsFinish(league: League): ActivityVsFinish | null {
  const rows: { moves: number; finish: number; teams: number; champ: boolean }[] = [];
  for (const season of league.seasons) {
    if (!season.activity) continue;
    const o = seasonOutcome(season);
    for (const [teamId, a] of Object.entries(season.activity)) {
      rows.push({ moves: a.moves, finish: o.finalRank.get(teamId)!, teams: season.teams.length, champ: o.championTeamId === teamId });
    }
  }
  if (!rows.length) return null;
  const avg = (xs: { moves: number }[]) => xs.reduce((s, r) => s + r.moves, 0) / xs.length;
  return {
    leagueAvg: avg(rows),
    championsAvg: avg(rows.filter((r) => r.champ)),
    topThirdAvg: avg(rows.filter((r) => r.finish <= r.teams / 3)),
    bottomThirdAvg: avg(rows.filter((r) => r.finish > (2 * r.teams) / 3)),
    seasons: new Set(league.seasons.filter((s) => s.activity).map((s) => s.year)).size,
  };
}

/** Completed trades between each pair of managers (a before b alphabetically by id). */
export function tradeEdges(league: League): { a: ManagerId; b: ManagerId; trades: number }[] {
  const edges = new Map<string, number>();
  for (const t of leagueTrades(league)) {
    if (t.status !== "completed" || t.sides.length !== 2) continue;
    const key = t.sides.map((s) => s.managerId).sort().join("|");
    edges.set(key, (edges.get(key) ?? 0) + 1);
  }
  return [...edges].map(([key, trades]) => {
    const [a, b] = key.split("|");
    return { a, b, trades };
  });
}

/** Every team-season with a move count: adds and drops against final finish. */
export function wireSeasons(league: League) {
  return league.seasons.flatMap((season) => {
    if (!season.activity) return [];
    const o = seasonOutcome(season);
    const teams = teamIndex(season);
    return Object.entries(season.activity).map(([teamId, a]) => ({
      year: season.year,
      label: season.label,
      teamName: teams.get(teamId)!.name,
      managerId: teams.get(teamId)!.managerId,
      moves: a.moves,
      final: o.finalRank.get(teamId)!,
      teams: season.teams.length,
    }));
  });
}
