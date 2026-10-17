import { seasonStandings } from "../../analytics/season";
import type { League, Manager, Matchup, Season, Team } from "../../types";

/**
 * Deterministic demo league. A seeded PRNG means the same fictional league is
 * produced on every build, server and test run — no runtime randomness.
 * Everything here is fictional demonstration data, not from Yahoo.
 */

const CATEGORIES = ["PTS", "REB", "AST", "STL", "BLK", "3PM", "FG%", "FT%", "TO"];
const SEED = 20240611;
const FIRST_YEAR = 2016;
const LAST_YEAR = 2025;

interface ManagerSpec {
  id: string;
  name: string;
  /** Underlying strength; larger = better. */
  skill: number;
  /** Years the manager is in the league (inclusive ranges). */
  years: [number, number][];
  /** Team name history: the last entry whose `from` <= year applies. */
  teamNames: { from: number; name: string }[];
}

const MANAGER_SPECS: ManagerSpec[] = [
  { id: "alex", name: "Alex Rivera", skill: 1.1, years: [[2016, 2025]], teamNames: [{ from: 2016, name: "Rivera Rim Rockers" }, { from: 2021, name: "Dunk Dynasty" }] },
  { id: "jordan", name: "Jordan Blake", skill: 0.9, years: [[2016, 2025]], teamNames: [{ from: 2016, name: "Blake Shake" }, { from: 2022, name: "Fast Break Club" }] },
  { id: "sam", name: "Sam Okafor", skill: 0.5, years: [[2016, 2025]], teamNames: [{ from: 2016, name: "Okafor Offense" }] },
  { id: "taylor", name: "Taylor Nguyen", skill: 0.3, years: [[2016, 2025]], teamNames: [{ from: 2016, name: "Triple-Double Trouble" }, { from: 2020, name: "Nguyen Nets" }] },
  { id: "casey", name: "Casey Brooks", skill: 0.0, years: [[2016, 2025]], teamNames: [{ from: 2016, name: "Brooks Brigade" }] },
  { id: "riley", name: "Riley Park", skill: -0.1, years: [[2016, 2025]], teamNames: [{ from: 2016, name: "Park Ave Ballers" }, { from: 2019, name: "Hoop Dreams" }, { from: 2023, name: "Park Ave Ballers II" }] },
  { id: "devon", name: "Devon Hart", skill: 0.2, years: [[2016, 2018], [2021, 2025]], teamNames: [{ from: 2016, name: "Hart Attack" }, { from: 2021, name: "Heart of the Paint" }] },
  { id: "morgan", name: "Morgan Ellis", skill: -0.5, years: [[2016, 2025]], teamNames: [{ from: 2016, name: "Ellis Island" }] },
  { id: "jamie", name: "Jamie Cruz", skill: -1.1, years: [[2016, 2025]], teamNames: [{ from: 2016, name: "Cruz Control" }, { from: 2024, name: "Tank Commanders" }] },
  { id: "quinn", name: "Quinn Walsh", skill: -1.4, years: [[2016, 2025]], teamNames: [{ from: 2016, name: "Walsh Wall" }] },
  { id: "priya", name: "Priya Shah", skill: 0.7, years: [[2019, 2025]], teamNames: [{ from: 2019, name: "Shah Mates" }, { from: 2023, name: "Checkmate Hoops" }] },
  { id: "marcus", name: "Marcus Bell", skill: -0.3, years: [[2021, 2025]], teamNames: [{ from: 2021, name: "Bell Curve" }] },
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const isActive = (spec: ManagerSpec, year: number) =>
  spec.years.some(([from, to]) => year >= from && year <= to);

function teamNameFor(spec: ManagerSpec, year: number): string {
  let name = spec.teamNames[0].name;
  for (const n of spec.teamNames) if (n.from <= year) name = n.name;
  return name;
}

/** One category-by-category 9-cat matchup. */
function playMatchup(rng: () => number, strengthA: number, strengthB: number) {
  const pA = 1 / (1 + Math.exp(-0.45 * (strengthA - strengthB)));
  let a = 0;
  let b = 0;
  let tied = 0;
  for (let i = 0; i < CATEGORIES.length; i++) {
    const u = rng();
    if (u < 0.04) tied++;
    else if ((u - 0.04) / 0.96 < pA) a++;
    else b++;
  }
  return { a, b, tied };
}

/** Circle-method round robin: round r pairs for the given team order. */
function roundPairs(ids: string[], round: number): [string, string][] {
  const n = ids.length;
  const rest = ids.slice(1);
  const rot = round % (n - 1);
  const rotated = [...rest.slice(rest.length - rot), ...rest.slice(0, rest.length - rot)];
  const arr = [ids[0], ...rotated];
  const pairs: [string, string][] = [];
  for (let i = 0; i < n / 2; i++) pairs.push([arr[i], arr[n - 1 - i]]);
  return pairs;
}

function buildSeason(year: number, rng: () => number): Season {
  const specs = MANAGER_SPECS.filter((s) => isActive(s, year));
  const teams: Team[] = specs.map((s) => ({
    id: `${year}:${s.id}`,
    managerId: s.id,
    name: teamNameFor(s, year),
  }));
  const strength = new Map(specs.map((s) => [`${year}:${s.id}`, s.skill + gaussian(rng) * 0.9]));

  // 2020 was a shortened season; other weeks scale with league size.
  const weeks = year === 2020 ? 14 : teams.length === 10 ? 18 : 22;
  const order = [...teams.map((t) => t.id)].sort(() => rng() - 0.5);

  const matchups: Matchup[] = [];
  for (let week = 1; week <= weeks; week++) {
    const pairs = roundPairs(order, week - 1);
    for (const [x, y] of pairs) {
      const [home, away] = (week + order.indexOf(x)) % 2 === 0 ? [x, y] : [y, x];
      const r = playMatchup(rng, strength.get(home)!, strength.get(away)!);
      matchups.push({
        week,
        stage: "regular",
        homeTeamId: home,
        awayTeamId: away,
        homeCats: r.a,
        awayCats: r.b,
        tiedCats: r.tied,
      });
    }
  }

  const season: Season = {
    year,
    label: `${year - 1}-${String(year).slice(2)}`,
    categories: CATEGORIES,
    teams,
    matchups,
  };

  // Top-4 playoffs: 1v4 and 2v3 semifinals, then a final and a third-place game.
  const seeds = seasonStandings(season).slice(0, 4);
  const seedOf = new Map(seeds.map((s) => [s.teamId, s.rank]));
  const play = (week: number, stage: Matchup["stage"], home: string, away: string): Matchup => {
    const r = playMatchup(rng, strength.get(home)!, strength.get(away)!);
    const m: Matchup = {
      week,
      stage,
      homeTeamId: home,
      awayTeamId: away,
      homeCats: r.a,
      awayCats: r.b,
      tiedCats: r.tied,
    };
    // Playoff ties go to the higher regular-season seed.
    if (r.a === r.b) m.tiebreakWinnerTeamId = seedOf.get(home)! < seedOf.get(away)! ? home : away;
    return m;
  };
  const winnerOf = (m: Matchup) =>
    m.homeCats > m.awayCats ? m.homeTeamId : m.awayCats > m.homeCats ? m.awayTeamId : m.tiebreakWinnerTeamId!;
  const loserOf = (m: Matchup) => (winnerOf(m) === m.homeTeamId ? m.awayTeamId : m.homeTeamId);

  const semi1 = play(weeks + 1, "semifinal", seeds[0].teamId, seeds[3].teamId);
  const semi2 = play(weeks + 1, "semifinal", seeds[1].teamId, seeds[2].teamId);
  const final = play(weeks + 2, "final", winnerOf(semi1), winnerOf(semi2));
  const third = play(weeks + 2, "third_place", loserOf(semi1), loserOf(semi2));
  matchups.push(semi1, semi2, final, third);
  return season;
}

export function generateDemoLeague(): League {
  const rng = mulberry32(SEED);
  const seasons: Season[] = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) seasons.push(buildSeason(year, rng));
  const managers: Manager[] = MANAGER_SPECS.map((s) => ({ id: s.id, name: s.name }));
  return { name: "Demo League (fictional)", source: "demo", managers, seasons };
}
