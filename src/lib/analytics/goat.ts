import type { League, ManagerId } from "../types";
import { careerStats, managerSeasons, type YearRange } from "./career";
import { matchupWinner, teamIndex } from "./season";

/**
 * The GOAT score: one 0-100 number that weighs everything the site tracks.
 * Each part is scaled across qualifying managers (worst = 0, best = 1), then
 * weighted. Titles count most; how you finish every year counts next.
 */
export const GOAT_WEIGHTS = {
  titles: 0.3,
  finish: 0.2,
  catPct: 0.2,
  finals: 0.1,
  playoffRate: 0.1,
  playoffWinPct: 0.1,
} as const;

export const GOAT_MIN_SEASONS = 3;

export const GOAT_LABELS: Record<keyof typeof GOAT_WEIGHTS, string> = {
  titles: "Titles",
  finish: "Average finish (as a share of the league)",
  catPct: "Category win %",
  finals: "Finals reached",
  playoffRate: "Playoff appearance rate",
  playoffWinPct: "Playoff game win %",
};

/** One-paragraph explanation, for tooltips and notes. */
export const GOAT_RULE = `GOAT score (0-100): ${Object.entries(GOAT_WEIGHTS)
  .map(([k, w]) => `${GOAT_LABELS[k as keyof typeof GOAT_WEIGHTS].toLowerCase()} ${Math.round(w * 100)}%`)
  .join(", ")}. Each is scaled from the worst to the best manager with ${GOAT_MIN_SEASONS}+ seasons in the selected range, then weighted.`;

export interface GoatRow {
  managerId: ManagerId;
  name: string;
  score: number;
  parts: Record<keyof typeof GOAT_WEIGHTS, number>;
}

/** Managers with enough seasons, best GOAT score first. */
export function goatScores(league: League, range: YearRange = {}): GoatRow[] {
  const inRange = (y: number) => (range.from === undefined || y >= range.from) && (range.to === undefined || y <= range.to);
  const rows = careerStats(league, range)
    .filter((c) => c.seasons >= GOAT_MIN_SEASONS)
    .map((c) => {
      const seasons = managerSeasons(league, c.managerId, range);
      let pw = 0;
      let pl = 0;
      for (const season of league.seasons.filter((s) => inRange(s.year))) {
        const teams = teamIndex(season);
        for (const m of season.matchups) {
          if (m.stage === "regular") continue;
          const mine = [m.homeTeamId, m.awayTeamId].find((t) => teams.get(t)!.managerId === c.managerId);
          if (!mine) continue;
          if (matchupWinner(m) === mine) pw++;
          else pl++;
        }
      }
      const cats = c.catWins + c.catLosses + c.catTies;
      return {
        managerId: c.managerId,
        name: c.name,
        raw: {
          titles: c.titles,
          finish: seasons.reduce((a, s) => a + (1 - (s.finalRank - 1) / (s.teamCount - 1)), 0) / seasons.length,
          catPct: cats ? (c.catWins + c.catTies / 2) / cats : 0,
          finals: c.titles + c.runnerUps,
          playoffRate: c.playoffPct ?? 0,
          playoffWinPct: pw + pl ? pw / (pw + pl) : 0,
        },
      };
    });
  const keys = Object.keys(GOAT_WEIGHTS) as (keyof typeof GOAT_WEIGHTS)[];
  const span = Object.fromEntries(
    keys.map((k) => {
      const v = rows.map((r) => r.raw[k]);
      return [k, [Math.min(...v), Math.max(...v)]];
    }),
  ) as Record<keyof typeof GOAT_WEIGHTS, [number, number]>;
  return rows
    .map((r) => {
      const parts = Object.fromEntries(keys.map((k) => [k, span[k][1] > span[k][0] ? (r.raw[k] - span[k][0]) / (span[k][1] - span[k][0]) : 0])) as GoatRow["parts"];
      return { managerId: r.managerId, name: r.name, parts, score: 100 * keys.reduce((a, k) => a + GOAT_WEIGHTS[k] * parts[k], 0) };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
