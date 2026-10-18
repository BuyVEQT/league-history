/**
 * Display data for the side panel (manager, season and player details). No new formulas: everything
 * here regroups, sorts, filters or labels outputs of existing analytics (careerStats, managerSeasons,
 * h2hMatrix, seasonOutcome, leaguePicks, leagueTrades, gotAway, unownedStars, namesakes, undraftedGems).
 * The result is plain JSON so the league layout can hand it to the client.
 */
import type { League, ManagerId } from "../types";
import { careerStats, managerSeasons } from "./career";
import { gotAway, leaguePicks } from "./draft";
import { winPct } from "./format";
import { h2hMatrix } from "./headToHead";
import { lastWeeks, type FormGame } from "./managerView";
import { namesakes, unownedStars } from "./players";
import { seasonOutcome } from "./season";
import { leagueTrades, undraftedGems } from "./trades";

export interface PanelBadge {
  name: string;
  tone: "gold" | "orange" | "";
  rule: string;
}

export interface PanelRival {
  id: ManagerId;
  wins: number;
  losses: number;
  ties: number;
  games: number;
}

export interface PanelSeasonLine {
  year: number;
  team: string;
  final: number;
  result: string;
  catPct: number | null;
}

export interface PanelManager {
  id: ManagerId;
  name: string;
  seasons: number;
  firstYear: number;
  lastYear: number;
  titles: number;
  catPct: number | null;
  avgFinish: number | null;
  playoffApps: number;
  badges: PanelBadge[];
  /** Final finish in each season played, oldest first. */
  finishes: { year: number; final: number }[];
  best: PanelSeasonLine;
  worst: PanelSeasonLine;
  /** Best and worst head-to-head record among opponents met 6+ times. */
  victim: PanelRival | null;
  nemesis: PanelRival | null;
  latest: { year: number; team: string; form: FormGame[] };
}

export interface PanelSeason {
  year: number;
  label: string;
  teamCount: number;
  champion: { managerId: ManagerId; team: string } | null;
  /** Regular-season standings order, with the final placement. */
  rows: { managerId: ManagerId; team: string; rank: number; final: number; catPct: number | null }[];
  weeks: { week: number; playoff: boolean }[];
}

/** One draft pick as a tuple (it ships to every page): year, manager, round, overall, finish rank (null = 300+), value. */
export type PanelPick = [y: number, m: ManagerId, rd: number, ov: number, ar: number | null, v: number];
/** A completed trade the player moved in: year, date, from, to, 1 when the receiving side won it. */
export type PanelTrade = [y: number, date: string, from: ManagerId, to: ManagerId, won: 0 | 1];

export interface PanelPlayer {
  name: string;
  picks: PanelPick[];
  /** Completed trades he moved in, oldest first. */
  trades: PanelTrade[];
  /** Record-book lines, already worded. */
  notes: { t1: string; t2: string }[];
}

export interface PanelData {
  managers: Record<ManagerId, PanelManager>;
  seasons: Record<number, PanelSeason>;
  players: Record<string, PanelPlayer>;
  /** Every played season, for labels and the finish chart's axis. */
  years: { year: number; label: string }[];
  /** Most teams in any season (the finish chart's depth). */
  maxTeams: number;
}

/** Year + player name → player id, from each season's draft and player ranks (the draft's full name wins). */
export function playerIdLookup(league: League): (year: number, name: string) => string | undefined {
  const map = new Map<string, string>();
  const key = (y: number, n: string) => `${y}|${n.toLowerCase()}`;
  for (const s of league.seasons) {
    for (const p of s.players ?? []) map.set(key(s.year, p.name), p.playerId);
    for (const d of s.draft ?? []) map.set(key(s.year, d.playerName), d.playerId);
  }
  return (year, name) => map.get(key(year, name));
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number | null) => (n === null ? null : Math.round(n * 1000) / 1000);

export function panelData(league: League, badges: Map<ManagerId, PanelBadge[]> = new Map()): PanelData {
  const nameOf = (id: ManagerId | null) => league.managers.find((m) => m.id === id)?.name ?? id ?? "";
  const labelOf = new Map(league.seasons.map((s) => [s.year, s.label]));
  const h2h = h2hMatrix(league);

  const managers: Record<ManagerId, PanelManager> = {};
  for (const c of careerStats(league)) {
    const rows = managerSeasons(league, c.managerId);
    const line = (r: (typeof rows)[number]): PanelSeasonLine => ({
      year: r.year,
      team: r.teamName,
      final: r.finalRank,
      result: r.playoffResult,
      catPct: round3(winPct(r.catWins, r.catLosses, r.catTies)),
    });
    const lines = rows.map(line);
    const best = [...lines].sort((a, b) => a.final - b.final || (b.catPct ?? 0) - (a.catPct ?? 0))[0];
    const worst = [...lines].sort((a, b) => b.final - a.final || (a.catPct ?? 0) - (b.catPct ?? 0))[0];
    const rivals = Object.entries(h2h.cells[c.managerId] ?? {})
      .map(([id, r]): PanelRival & { p: number } => {
        const games = r.wins + r.losses + r.ties;
        return { id, ...r, games, p: (r.wins + r.ties / 2) / games };
      })
      .filter((r) => r.games >= 6);
    const strip = (r: (PanelRival & { p: number }) | undefined): PanelRival | null =>
      r ? { id: r.id, wins: r.wins, losses: r.losses, ties: r.ties, games: r.games } : null;
    const last = rows.at(-1)!;
    managers[c.managerId] = {
      id: c.managerId,
      name: c.name,
      seasons: c.seasons,
      firstYear: c.firstYear!,
      lastYear: c.lastYear!,
      titles: c.titles,
      catPct: round3(winPct(c.catWins, c.catLosses, c.catTies)),
      avgFinish: c.avgFinish,
      playoffApps: c.playoffApps,
      badges: (badges.get(c.managerId) ?? []).slice(0, 4),
      finishes: rows.map((r) => ({ year: r.year, final: r.finalRank })),
      best,
      worst,
      victim: strip([...rivals].sort((a, b) => b.p - a.p || b.games - a.games)[0]),
      nemesis: strip([...rivals].sort((a, b) => a.p - b.p || b.games - a.games)[0]),
      latest: { year: last.year, team: last.teamName, form: lastWeeks(league, c.managerId)[last.year] ?? [] },
    };
  }

  const seasons: Record<number, PanelSeason> = {};
  for (const s of league.seasons) {
    const o = seasonOutcome(s);
    const team = new Map(s.teams.map((t) => [t.id, t]));
    const champ = o.championTeamId ? team.get(o.championTeamId)! : null;
    const weeks = [...new Map(s.matchups.map((m) => [m.week, m.stage !== "regular"])).entries()]
      .map(([week, playoff]) => ({ week, playoff }))
      .sort((a, b) => a.week - b.week);
    seasons[s.year] = {
      year: s.year,
      label: s.label,
      teamCount: s.teams.length,
      champion: champ ? { managerId: champ.managerId, team: champ.name } : null,
      rows: o.standings.map((r) => ({
        managerId: r.managerId,
        team: r.teamName,
        rank: r.rank,
        final: o.finalRank.get(r.teamId)!,
        catPct: round3(winPct(r.catWins, r.catLosses, r.catTies)),
      })),
      weeks,
    };
  }

  const players: Record<string, PanelPlayer> = {};
  const player = (id: string, name: string) => (players[id] ??= { name, picks: [], trades: [], notes: [] });
  for (const p of [...leaguePicks(league)].sort((a, b) => a.year - b.year || a.overall - b.overall)) {
    player(p.playerId, p.playerName).picks.push([p.year, p.managerId, p.round, p.overall, p.actualRank, round1(p.value)]);
  }
  for (const t of [...leagueTrades(league)].reverse()) {
    if (t.status !== "completed") continue;
    for (const side of t.sides) {
      const from = t.sides.find((s) => s !== side);
      if (!from) continue;
      for (const p of side.players) {
        if (!p.playerId) continue;
        player(p.playerId, p.name).trades.push([t.year, t.date, from.managerId, side.managerId, t.winnerManagerId === side.managerId ? 1 : 0]);
      }
    }
  }
  const pid = playerIdLookup(league);
  const note = (id: string | null | undefined, name: string, t1: string, t2: string) => {
    if (id) player(id, name).notes.push({ t1, t2 });
  };
  for (const g of gotAway(league)) {
    note(pid(g.year, g.playerName), g.playerName, `Got away from ${nameOf(g.drafterManagerId)}`, `${g.label} · ${g.how} · finished #${g.actualRank}`);
  }
  for (const u of unownedStars(league)) {
    note(pid(u.year, u.playerName), u.playerName, "Nobody owned him at season end", `${u.label} · finished #${u.actualRank}`);
  }
  for (const g of undraftedGems(league)) {
    note(pid(g.year, g.playerName), g.playerName, "Undrafted gem", `${g.label} · finished #${g.actualRank} on ${g.teamName} (${nameOf(g.managerId)})`);
  }
  for (const n of namesakes(league)) {
    const season = league.seasons.find((s) => s.year === n.year);
    const id = season?.teams.find((t) => t.managerId === n.managerId && t.name === n.teamName)?.namesake?.playerId;
    note(id, n.playerName, `Team named after him: ${n.teamName}`, `${nameOf(n.managerId)}, ${n.label}`);
  }

  return {
    managers,
    seasons,
    players,
    years: league.seasons.map((s) => ({ year: s.year, label: labelOf.get(s.year)! })),
    maxTeams: Math.max(...league.seasons.map((s) => s.teams.length)),
  };
}
