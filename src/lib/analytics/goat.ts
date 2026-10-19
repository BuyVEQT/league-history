import type { League, ManagerId } from "../types";
import { careerStats, managerSeasons, type ManagerSeasonRow, type YearRange } from "./career";
import { matchupWinner, teamIndex } from "./season";

/**
 * The GOAT score: one number that weighs everything the site tracks, scored against the league average.
 * Each part is turned into a standard score across qualifying managers (0 = average, 1 = one standard
 * deviation better), weighted, and mapped so 50 = an average regular:
 *
 *   score = 50 + GOAT_SPREAD × Σ weight × standard score     (kept within 0-100)
 *
 * Measuring from the average (not from the league's best and worst) keeps the gaps between managers in
 * proportion to their real margins. Titles count most; how you finish every year counts next.
 */
export const GOAT_WEIGHTS = {
  titles: 0.3,
  finish: 0.2,
  catPct: 0.2,
  finals: 0.1,
  playoffRate: 0.1,
  playoffWinPct: 0.1,
} as const;

export type GoatPart = keyof typeof GOAT_WEIGHTS;

export const GOAT_MIN_SEASONS = 3;
/** Points a manager gains for being one standard deviation better than average on everything. */
export const GOAT_SPREAD = 20;
/**
 * Playoff win % starts every manager at this many pretend wins and losses, so a handful of playoff weeks
 * can't look like a career (a 2-0 manager scores 4 of 6, not 100%).
 */
export const GOAT_PLAYOFF_PAD = 2;

export const GOAT_LABELS: Record<GoatPart, string> = {
  titles: "Titles",
  finish: "Average finish (as a share of the league)",
  catPct: "Category win %",
  finals: "Runner-up finishes",
  playoffRate: "Playoff appearance rate",
  playoffWinPct: "Playoff game win %",
};

/** One-paragraph explanation, for tooltips and notes. */
export const GOAT_RULE = `GOAT score: ${Object.entries(GOAT_WEIGHTS)
  .map(([k, w]) => `${GOAT_LABELS[k as GoatPart].toLowerCase()} ${Math.round(w * 100)}%`)
  .join(", ")}. Each is compared with the average of every manager with ${GOAT_MIN_SEASONS}+ seasons in the selected range, so 50 = an average regular and the gaps follow the real margins. Third-place games don't count (eliminated teams are locked in), so both semifinal losers share 3.5th; playoff win % starts everyone at ${GOAT_PLAYOFF_PAD}-${GOAT_PLAYOFF_PAD} so a few games can't swing it.`;

export interface GoatRow {
  managerId: ManagerId;
  name: string;
  score: number;
  /** Raw value of each part (titles and runner-ups are counts, the rest shares 0-1). */
  raw: Record<GoatPart, number>;
  /** Standard score of each part across qualifying managers: 0 = average, +1 = one standard deviation better. */
  z: Record<GoatPart, number>;
}

const PARTS = Object.keys(GOAT_WEIGHTS) as GoatPart[];
const inRangeOf = (range: YearRange) => (y: number) => (range.from === undefined || y >= range.from) && (range.to === undefined || y <= range.to);
/** Final place for the finish part: the two semifinal losers share 3.5th, since the third-place game doesn't count. */
const goatPlace = (s: ManagerSeasonRow) => (s.playoffResult === "3rd place" || s.playoffResult === "4th place" ? 3.5 : s.finalRank);

/** Raw part values for every manager with enough seasons in the range. */
function goatInputs(league: League, range: YearRange): { managerId: ManagerId; name: string; raw: Record<GoatPart, number> }[] {
  const inRange = inRangeOf(range);
  return careerStats(league, range)
    .filter((c) => c.seasons >= GOAT_MIN_SEASONS)
    .map((c) => {
      const seasons = managerSeasons(league, c.managerId, range);
      let pw = 0;
      let pl = 0;
      for (const season of league.seasons.filter((s) => inRange(s.year))) {
        const teams = teamIndex(season);
        for (const m of season.matchups) {
          if (m.stage === "regular" || m.stage === "third_place") continue;
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
          finish: seasons.reduce((a, s) => a + (1 - (goatPlace(s) - 1) / (s.teamCount - 1)), 0) / seasons.length,
          catPct: cats ? (c.catWins + c.catTies / 2) / cats : 0,
          finals: c.runnerUps,
          playoffRate: c.playoffPct ?? 0,
          playoffWinPct: (pw + GOAT_PLAYOFF_PAD) / (pw + pl + 2 * GOAT_PLAYOFF_PAD),
        },
      };
    });
}

/** Standard scores of each part across the given rows (population standard deviation; 0 when everyone is equal). */
function standardize(raws: Record<GoatPart, number>[]): Record<GoatPart, number>[] {
  const out = raws.map(() => ({}) as Record<GoatPart, number>);
  for (const k of PARTS) {
    const v = raws.map((r) => r[k]);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
    v.forEach((x, i) => (out[i][k] = sd > 0 ? (x - mean) / sd : 0));
  }
  return out;
}

const scoreOf = (z: Record<GoatPart, number>, weights: Record<GoatPart, number> = GOAT_WEIGHTS) =>
  Math.min(100, Math.max(0, 50 + GOAT_SPREAD * PARTS.reduce((a, k) => a + weights[k] * z[k], 0)));

/** Managers with enough seasons, best GOAT score first. */
export function goatScores(league: League, range: YearRange = {}): GoatRow[] {
  const rows = goatInputs(league, range);
  const zs = standardize(rows.map((r) => r.raw));
  return rows
    .map((r, i) => ({ ...r, z: zs[i], score: scoreOf(zs[i]) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export interface GoatConfidence {
  /** How many random weightings were tried. */
  trials: number;
  /** Share of random weightings (0-1) under which each manager comes out on top; only managers who ever do, most first. */
  topShare: { managerId: ManagerId; name: string; share: number }[];
  /** Seasons whose removal would change who is #1, with who would be #1 instead. */
  swings: { year: number; label: string; leader: ManagerId; name: string }[];
}

/**
 * How sure the #1 is: the leader under many random sets of weights (every split of 100% across the six
 * parts equally likely; a fixed seed, so the numbers don't change between page loads), and the seasons
 * whose removal would hand #1 to someone else.
 */
export function goatConfidence(league: League, range: YearRange = {}, trials = 2000): GoatConfidence | null {
  const ranked = goatScores(league, range);
  if (ranked.length < 2) return null;
  let seed = 20190331;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const wins = new Map<ManagerId, number>();
  for (let t = 0; t < trials; t++) {
    const e = PARTS.map(() => -Math.log(rand()));
    const sum = e.reduce((a, b) => a + b, 0);
    const weights = Object.fromEntries(PARTS.map((k, i) => [k, e[i] / sum])) as Record<GoatPart, number>;
    let best = ranked[0];
    let bestScore = -Infinity;
    for (const r of ranked) {
      const s = PARTS.reduce((a, k) => a + weights[k] * r.z[k], 0);
      if (s > bestScore) [best, bestScore] = [r, s];
    }
    wins.set(best.managerId, (wins.get(best.managerId) ?? 0) + 1);
  }
  const inRange = inRangeOf(range);
  const swings = league.seasons
    .filter((s) => inRange(s.year))
    .flatMap((s) => {
      const [leader] = goatScores({ ...league, seasons: league.seasons.filter((x) => x !== s) }, range);
      return leader && leader.managerId !== ranked[0].managerId ? [{ year: s.year, label: s.label, leader: leader.managerId, name: leader.name }] : [];
    });
  return {
    trials,
    topShare: ranked.filter((r) => wins.has(r.managerId)).map((r) => ({ managerId: r.managerId, name: r.name, share: wins.get(r.managerId)! / trials })).sort((a, b) => b.share - a.share),
    swings,
  };
}
