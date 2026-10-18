import type { ManagerId, Season, Stage, TeamId } from "../types";
import { winPct } from "./format";
import type { FormGame } from "./managerView";
import { seasonRace } from "./race";
import { matchupWinner, rankMethod, seasonStandings, teamIndex } from "./season";

/**
 * Display-only reshaping for the week page and the in-table charts (form chips). No new formulas: places come
 * from seasonRace, running records from seasonStandings({ throughWeek }), winners from matchupWinner, and the
 * win % is format's winPct (the same tie-as-half rule the standings rank by).
 */

export const STAGE_NAME: Record<Stage, string> = {
  regular: "Regular season",
  quarterfinal: "Quarterfinals",
  semifinal: "Semifinals",
  final: "Final",
  third_place: "Third place",
};

/** Which round a playoff week is named after when it holds more than one (the final week also has the third-place game). */
const STAGE_ORDER: Stage[] = ["final", "semifinal", "quarterfinal", "third_place", "regular"];

export interface WeekInfo {
  week: number;
  stage: Stage;
  playoff: boolean;
}

/** Every week with a matchup, in order, with its stage (regular or the playoff round). */
export function seasonWeeks(season: Season): WeekInfo[] {
  const stages = new Map<number, Set<Stage>>();
  for (const m of season.matchups) {
    if (!stages.has(m.week)) stages.set(m.week, new Set());
    stages.get(m.week)!.add(m.stage);
  }
  return [...stages.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, set]) => {
      const stage = STAGE_ORDER.find((s) => set.has(s)) ?? "regular";
      return { week, stage, playoff: stage !== "regular" };
    });
}

/** A team's last `n` regular-season matchups, oldest first, counting only weeks up to `throughWeek`. */
export function teamForm(season: Season, teamId: TeamId, n = 5, throughWeek = Infinity): FormGame[] {
  return season.matchups
    .filter((m) => m.stage === "regular" && m.week <= throughWeek && (m.homeTeamId === teamId || m.awayTeamId === teamId))
    .sort((a, b) => a.week - b.week)
    .slice(-n)
    .map((m) => {
      const home = m.homeTeamId === teamId;
      const w = matchupWinner(m);
      return { week: m.week, result: w === null ? "T" : w === teamId ? "W" : "L", my: home ? m.homeCats : m.awayCats, their: home ? m.awayCats : m.homeCats };
    });
}

export interface WeekSide {
  teamId: TeamId;
  managerId: ManagerId;
  teamName: string;
  cats: number;
  /** Regular weeks: standings place going into the week (null in the first week). Playoff weeks: the playoff seed. */
  rankBefore: number | null;
}

export interface WeekGame {
  stage: Stage;
  home: WeekSide;
  away: WeekSide;
  tiedCats: number;
  /** Null = tied week (regular season only; playoff ties go to the higher seed). */
  winnerTeamId: TeamId | null;
  /** Categories won by the winner minus the loser's. */
  margin: number;
  sweep: boolean;
  /** Decided by one category or fewer. */
  coinFlip: boolean;
  /** Lower-placed (or lower-seeded) team won; `upsetGap` = places between them. */
  upset: boolean;
  upsetGap: number;
}

export interface WeekStandingRow {
  teamId: TeamId;
  managerId: ManagerId;
  teamName: string;
  rank: number;
  /** Places gained (+) or lost (−) since the week before; null in the first week. */
  move: number | null;
  /** The win % the standings rank by (category or matchup), as in the season's own table. */
  pct: number | null;
  catWins: number;
  catLosses: number;
  catTies: number;
  form: FormGame[];
}

export interface WeekView {
  week: number;
  stage: Stage;
  playoff: boolean;
  weeks: WeekInfo[];
  prev: number | null;
  next: number | null;
  games: WeekGame[];
  blowout: WeekGame | null;
  closest: WeekGame | null;
  /** The biggest place (or seed) gap where the lower team won. */
  upset: WeekGame | null;
  /** False in week 1, when nobody has a standings place yet. */
  hasRanksBefore: boolean;
  tiedCats: number;
  tiedGames: number;
  method: "categories" | "matchups";
  spots: number;
  /** Standings after the week (regular-season weeks only). */
  standings: WeekStandingRow[] | null;
}

/** Everything the week page shows for one week of a season, or null when no matchups were played that week. */
export function weekView(season: Season, week: number): WeekView | null {
  const weeks = seasonWeeks(season);
  const idx = weeks.findIndex((w) => w.week === week);
  if (idx < 0) return null;
  const info = weeks[idx];
  const teams = teamIndex(season);
  const race = seasonRace(season);
  const line = new Map(race.lines.map((l) => [l.teamId, l]));
  const ri = race.weeks.indexOf(week);
  const hasRanksBefore = info.playoff || ri > 0;
  const rankBefore = (id: TeamId): number | null => (info.playoff ? line.get(id)!.seed : ri > 0 ? line.get(id)!.ranks[ri - 1] : null);
  const side = (id: TeamId, cats: number): WeekSide => ({ teamId: id, managerId: teams.get(id)!.managerId, teamName: teams.get(id)!.name, cats, rankBefore: rankBefore(id) });

  const games: WeekGame[] = season.matchups
    .filter((m) => m.week === week)
    .map((m) => {
      const winnerTeamId = matchupWinner(m);
      const home = side(m.homeTeamId, m.homeCats);
      const away = side(m.awayTeamId, m.awayCats);
      const margin = Math.abs(m.homeCats - m.awayCats);
      let upsetGap = 0;
      if (winnerTeamId && hasRanksBefore) {
        const [w, l] = winnerTeamId === home.teamId ? [home, away] : [away, home];
        upsetGap = Math.max(0, (w.rankBefore ?? 0) - (l.rankBefore ?? 0));
      }
      return {
        stage: m.stage,
        home,
        away,
        tiedCats: m.tiedCats,
        winnerTeamId,
        margin,
        sweep: m.homeCats === season.categories.length || m.awayCats === season.categories.length,
        coinFlip: margin <= 1,
        upset: upsetGap > 0,
        upsetGap,
      };
    });
  const decided = games.filter((g) => g.winnerTeamId);
  const blowout = decided.reduce<WeekGame | null>((best, g) => (!best || g.margin > best.margin ? g : best), null);
  const closest = games.reduce<WeekGame | null>((best, g) => (!best || g.margin < best.margin ? g : best), null);
  const upset = games.reduce<WeekGame | null>((best, g) => (g.upset && (!best || g.upsetGap > best.upsetGap) ? g : best), null);

  const method = rankMethod(season);
  let standings: WeekStandingRow[] | null = null;
  if (!info.playoff && ri >= 0) {
    standings = seasonStandings(season, { throughWeek: week }).map((r) => ({
      teamId: r.teamId,
      managerId: r.managerId,
      teamName: r.teamName,
      rank: r.rank,
      move: ri > 0 ? line.get(r.teamId)!.ranks[ri - 1] - r.rank : null,
      pct: method === "categories" ? winPct(r.catWins, r.catLosses, r.catTies) : r.winPct,
      catWins: r.catWins,
      catLosses: r.catLosses,
      catTies: r.catTies,
      form: teamForm(season, r.teamId, 5, week),
    }));
  }

  return {
    week,
    stage: info.stage,
    playoff: info.playoff,
    weeks,
    prev: weeks[idx - 1]?.week ?? null,
    next: weeks[idx + 1]?.week ?? null,
    games,
    blowout,
    closest,
    upset,
    hasRanksBefore,
    tiedCats: games.reduce((s, g) => s + g.tiedCats, 0),
    tiedGames: games.filter((g) => g.tiedCats > 0).length,
    method,
    spots: race.spots,
    standings,
  };
}
