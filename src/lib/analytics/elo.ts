import type { League, ManagerId } from "../types";

/**
 * Elo power ratings chained across every season. Each matchup's result is the
 * share of categories won (a 6-3 win scores 0.67), so a 100-point gap means
 * the stronger side is expected to take about 64% of the categories.
 *
 * Tuned on the leagues' own results for predicting the next matchup's
 * category split: K = 24, and between seasons ratings move halfway back to
 * 1500 (a new draft resets most of a team).
 */
export const ELO = { start: 1500, k: 24, scale: 400, carryOver: 0.5 } as const;

export const expectedShare = (rating: number, opponent: number) => 1 / (1 + 10 ** ((opponent - rating) / ELO.scale));

export interface EloPoint {
  year: number;
  label: string;
  week: number;
  rating: number;
}

export interface EloResult {
  /** Rating after every week each manager played, oldest first. */
  history: Record<ManagerId, EloPoint[]>;
  /** Rating at the end of each season, for managers who played it. */
  seasonEnd: Record<number, Record<ManagerId, number>>;
  /** Managers in the latest season, highest rating first. */
  current: { managerId: ManagerId; rating: number }[];
  peak: Record<ManagerId, EloPoint>;
  /**
   * How well ratings predicted each matchup's category share before it was played:
   * 1 − squared error / squared error of always predicting 50%. 1 = perfect, 0 = no better than a coin flip.
   */
  predictiveSkill: number;
}

export function eloRatings(league: League): EloResult {
  const rating: Record<ManagerId, number> = {};
  const history: EloResult["history"] = {};
  const seasonEnd: EloResult["seasonEnd"] = {};
  const peak: EloResult["peak"] = {};
  let err = 0;
  let base = 0;

  for (const season of league.seasons) {
    for (const id of Object.keys(rating)) rating[id] = ELO.start + (rating[id] - ELO.start) * ELO.carryOver;
    const owner = new Map(season.teams.map((t) => [t.id, t.managerId]));
    for (const t of season.teams) rating[t.managerId] ??= ELO.start;
    const weeks = [...new Set(season.matchups.map((m) => m.week))].sort((a, b) => a - b);
    for (const week of weeks) {
      // Everyone's rating moves at once at the end of the week.
      const delta: Record<ManagerId, number> = {};
      for (const m of season.matchups.filter((x) => x.week === week)) {
        const [a, b] = [owner.get(m.homeTeamId)!, owner.get(m.awayTeamId)!];
        const cats = m.homeCats + m.awayCats + m.tiedCats;
        if (!cats) continue;
        const share = (m.homeCats + m.tiedCats / 2) / cats;
        const expected = expectedShare(rating[a], rating[b]);
        err += (share - expected) ** 2;
        base += (share - 0.5) ** 2;
        delta[a] = (delta[a] ?? 0) + ELO.k * (share - expected);
        delta[b] = (delta[b] ?? 0) - ELO.k * (share - expected);
      }
      for (const [id, d] of Object.entries(delta)) {
        rating[id] += d;
        const point = { year: season.year, label: season.label, week, rating: rating[id] };
        (history[id] ??= []).push(point);
        if (!peak[id] || point.rating > peak[id].rating) peak[id] = point;
      }
    }
    seasonEnd[season.year] = Object.fromEntries(season.teams.map((t) => [t.managerId, rating[t.managerId]]));
  }

  const latest = league.seasons.at(-1);
  const current = (latest?.teams ?? [])
    .map((t) => ({ managerId: t.managerId, rating: rating[t.managerId] }))
    .sort((a, b) => b.rating - a.rating);
  return { history, seasonEnd, current, peak, predictiveSkill: base ? 1 - err / base : 0 };
}
