import { careerStats } from "../../analytics/career";
import type { DraftPick, League, ManagerRating, PlayerSeason, PlayerStats, Season, Trade } from "../../types";
import { gaussian, hashUnit } from "./random";

/**
 * Player-level extras for the demo league: a persistent pool of invented
 * players who develop and age, snake drafts, end-of-season ranks with full
 * stat lines, trades and vetoes, waiver churn and season-end rosters. It shows
 * what the site does with a league's draft, player and transaction data.
 *
 * Every player name is invented. All of it is fictional demonstration data.
 */

type Archetype = "big" | "wing" | "guard";

interface DemoPlayer {
  id: string;
  name: string;
  type: Archetype;
  /** Underlying quality; ~N(0, 1) across the pool, higher = better. */
  talent: number;
  age: number;
  /** Stars and namesakes never retire early. */
  protected?: boolean;
}

interface PlayerPool {
  players: DemoPlayer[];
  year: number;
  nextId: number;
  usedNames: Set<string>;
}

const POOL_SIZE = 340;
const LISTED = 300; // like the source's top-300 season ranks
const ROUNDS = 13;

const FIRST = ["Amari", "Bennett", "Caius", "Dario", "Emeka", "Felix", "Gideon", "Hollis", "Idris", "Jonah", "Kellan", "Lennox", "Marlon", "Nico", "Orrin", "Pascal", "Quentin", "Rafe", "Silas", "Tobias", "Ulric", "Vaughn", "Wes", "Xavi", "Yusuf", "Zane", "Beckett", "Dorian", "Fynn", "Grady", "Hugo", "Jasper", "Kofi", "Lucan", "Mateo", "Nash", "Otis", "Ronan", "Soren", "Teodor"];
const LAST = ["Ashgrove", "Blackwood", "Calloway", "Dunmore", "Easterly", "Fairbanks", "Hartwell", "Ironside", "Jessup", "Kingsley", "Lockhart", "Merriweather", "Northcott", "Oakes", "Pembrook", "Quarry", "Ravensworth", "Stroud", "Thistle", "Underhill", "Vandermeer", "Whitlock", "Yardley", "Zeller", "Abernathy", "Bramble", "Corrigan", "Delancey", "Ellsworth", "Fenwick", "Greaves", "Ingleby", "Juniper", "Kittredge", "Larkspur", "Mabry", "Nettles", "Ostrowski", "Prescott", "Rookwood"];

/** Fictional stars the demo's namesake teams are named after. */
const STARS: Omit<DemoPlayer, "id">[] = [
  { name: "Andre Bolt", type: "guard", talent: 2.3, age: 21, protected: true },
  { name: "Kai Frost", type: "big", talent: 1.9, age: 22, protected: true },
  { name: "Theo Vance", type: "wing", talent: 1.6, age: 20, protected: true },
];

const pick = <T,>(rng: () => number, xs: T[]) => xs[Math.floor(rng() * xs.length)];

function newPlayer(pool: PlayerPool, rng: () => number, talent: number, age: number): DemoPlayer {
  let name = "";
  do name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
  while (pool.usedNames.has(name));
  pool.usedNames.add(name);
  return { id: `d${pool.nextId++}`, name, type: pick(rng, ["big", "wing", "wing", "guard", "guard"] as Archetype[]), talent, age };
}

export function createPlayerPool(rng: () => number, firstYear: number): PlayerPool {
  const pool: PlayerPool = { players: [], year: firstYear, nextId: 1, usedNames: new Set(STARS.map((s) => s.name)) };
  for (const s of STARS) pool.players.push({ ...s, id: `d${pool.nextId++}` });
  while (pool.players.length < POOL_SIZE) pool.players.push(newPlayer(pool, rng, gaussian(rng), 19 + Math.floor(rng() * 16)));
  return pool;
}

/** One year older: young players improve, veterans decline, some retire, rookies arrive. */
function advance(pool: PlayerPool, rng: () => number) {
  for (const p of pool.players) {
    p.age++;
    const curve = p.age < 24 ? 0.3 : p.age < 27 ? 0.12 : p.age < 30 ? 0 : p.age < 33 ? -0.15 : -0.35;
    p.talent += curve + 0.3 * gaussian(rng);
  }
  pool.players = pool.players.filter((p) => p.age <= 36 && (p.protected || p.age <= 32 || rng() > 0.25));
  while (pool.players.length < POOL_SIZE) pool.players.push(newPlayer(pool, rng, gaussian(rng) - 0.6, 19 + Math.floor(rng() * 2)));
  pool.year++;
}

/** A coherent season stat line from quality and games played. */
function statLine(type: Archetype, quality: number, gp: number, rng: () => number): PlayerStats {
  // Per-game production for an average rostered player, scaled by quality (scoring grows fastest at the top).
  const q = Math.min(1.9, Math.max(0.4, 1 + 0.18 * quality));
  const jitter = () => 1 + 0.12 * gaussian(rng);
  const per = {
    big: { pts: 12, three: 0.4, fg: 0.56, ft: 0.68, reb: 7.5, ast: 2, stl: 0.7, blk: 1.1, to: 1.5 },
    wing: { pts: 13, three: 1.7, fg: 0.47, ft: 0.8, reb: 4.5, ast: 2.8, stl: 1, blk: 0.5, to: 1.6 },
    guard: { pts: 14, three: 2, fg: 0.45, ft: 0.85, reb: 3.5, ast: 5, stl: 1.1, blk: 0.3, to: 2.2 },
  }[type];
  const total = (perGame: number, scale = q) => Math.max(0, Math.round(perGame * scale * jitter() * gp));
  const pts = total(per.pts, q ** 1.3);
  const fga = Math.round(pts * (type === "big" ? 0.72 : 0.82));
  const fgm = Math.round(fga * Math.min(0.68, per.fg + 0.012 * quality + 0.015 * gaussian(rng)));
  const fta = Math.round(pts * 0.25);
  const ftm = Math.round(fta * Math.min(0.95, per.ft + 0.03 * gaussian(rng)));
  const threes = Math.min(fgm, total(per.three));
  return {
    fgm,
    fga,
    ftm,
    fta,
    threes,
    pts: 2 * fgm + threes + ftm,
    reb: total(per.reb),
    ast: total(per.ast),
    stl: total(per.stl),
    blk: total(per.blk),
    to: total(per.to),
  };
}

/**
 * Nine-category z-score value of season totals, scored against the top
 * `poolSize` players (the way end-of-season fantasy ranks are built).
 */
function zValues(lines: PlayerStats[], poolSize: number): number[] {
  let pool = lines.map((_, i) => i);
  let values = lines.map(() => 0);
  for (let pass = 0; pass < 2; pass++) {
    const P = pool.map((i) => lines[i]);
    const sum = (k: keyof PlayerStats) => P.reduce((a, l) => a + l[k], 0);
    const fg = sum("fgm") / sum("fga");
    const ft = sum("ftm") / sum("fta");
    const feats = (l: PlayerStats) => [l.fgm - fg * l.fga, l.ftm - ft * l.fta, l.threes, l.pts, l.reb, l.ast, l.stl, l.blk, -l.to];
    const F = P.map(feats);
    const mean = F[0].map((_, j) => F.reduce((a, f) => a + f[j], 0) / F.length);
    const sd = F[0].map((_, j) => Math.sqrt(F.reduce((a, f) => a + (f[j] - mean[j]) ** 2, 0) / F.length) || 1);
    values = lines.map((l) => feats(l).reduce((a, x, j) => a + (x - mean[j]) / sd[j], 0));
    pool = values
      .map((v, i) => [v, i])
      .sort((a, b) => b[0] - a[0])
      .slice(0, poolSize)
      .map(([, i]) => i);
  }
  return values;
}

/** Stable per-manager habits. */
const habits = (managerId: string) => ({
  reach: 0.25 + 1.1 * hashUnit(`reach:${managerId}`),
  churn: 0.35 + 0.65 * hashUnit(`churn:${managerId}`),
  trader: 0.2 + 1.3 * hashUnit(`trader:${managerId}`),
});
const isFavourite = (managerId: string, playerId: string) => hashUnit(`fav:${managerId}:${playerId}`) < 0.03;

function weighted<T>(rng: () => number, items: T[], weight: (t: T) => number): T {
  const total = items.reduce((a, t) => a + weight(t), 0);
  let r = rng() * total;
  for (const t of items) if ((r -= weight(t)) <= 0) return t;
  return items.at(-1)!;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Adds draft, players, trades and activity to one demo season, in place. */
export function addSeasonExtras(season: Season, strength: Map<string, number>, pool: PlayerPool, rng: () => number) {
  while (pool.year < season.year) advance(pool, rng);
  const teams = season.teams;
  const replacement = teams.length * ROUNDS;

  // The season as it actually played out.
  const sim = new Map(
    pool.players.map((p) => {
      const injured = rng() < 0.16;
      const gp = injured ? 8 + Math.floor(rng() * 42) : 60 + Math.floor(rng() * 23);
      const quality = p.talent + 0.4 * gaussian(rng);
      return [p.id, { expected: p.talent + 0.35 * gaussian(rng), effective: quality * (0.4 + (0.6 * gp) / 82), stats: statLine(p.type, quality, gp, rng), gp }];
    }),
  );
  const values = zValues(pool.players.map((p) => sim.get(p.id)!.stats), replacement);
  const byValue = pool.players.map((p, i) => ({ p, v: values[i] })).sort((a, b) => b.v - a.v);
  const actualRank = new Map(byValue.map((x, i) => [x.p.id, i + 1]));
  const preseasonRank = new Map([...pool.players].sort((a, b) => sim.get(b.id)!.expected - sim.get(a.id)!.expected).map((p, i) => [p.id, i + 1]));

  // Snake draft. Stronger teams (this season) are better at spotting players who will beat their ranking.
  const mean = teams.reduce((a, t) => a + strength.get(t.id)!, 0) / teams.length;
  const sd = Math.sqrt(teams.reduce((a, t) => a + (strength.get(t.id)! - mean) ** 2, 0) / teams.length) || 1;
  const boards = new Map(
    teams.map((t) => {
      const h = habits(t.managerId);
      const scout = 0.2 * ((strength.get(t.id)! - mean) / sd);
      return [
        t.id,
        new Map(pool.players.map((p) => {
          const s = sim.get(p.id)!;
          return [p.id, s.expected + scout * (s.effective - s.expected) + 0.35 * h.reach * gaussian(rng) + (isFavourite(t.managerId, p.id) ? 0.3 : 0)];
        })),
      ];
    }),
  );
  const order = [...teams].sort(() => rng() - 0.5);
  const available = new Set(pool.players.map((p) => p.id));
  const roster = new Map(teams.map((t) => [t.id, new Set<string>()]));
  const draft: DraftPick[] = [];
  for (let round = 1; round <= ROUNDS; round++) {
    const seq = round % 2 ? order : [...order].reverse();
    seq.forEach((t, i) => {
      const board = boards.get(t.id)!;
      let best = "";
      for (const id of available) if (!best || board.get(id)! > board.get(best)!) best = id;
      available.delete(best);
      roster.get(t.id)!.add(best);
      draft.push({ round, pick: i + 1, overall: (round - 1) * teams.length + i + 1, teamId: t.id, playerId: best, playerName: pool.players.find((p) => p.id === best)!.name });
    });
  }

  // Trades, in date order between mid-November and early March.
  const nameOf = new Map(pool.players.map((p) => [p.id, p.name]));
  const start = Date.UTC(season.year - 1, 10, 12);
  const span = Date.UTC(season.year, 2, 5) - start;
  const dates = Array.from({ length: 2 + Math.floor(rng() * 5) }, () => new Date(start + rng() * span)).sort((a, b) => +a - +b);
  const trades: Trade[] = [];
  const tradeCount = new Map(teams.map((t) => [t.id, 0]));
  for (const date of dates) {
    const a = weighted(rng, teams, (t) => habits(t.managerId).trader);
    const b = weighted(rng, teams.filter((t) => t !== a), (t) => habits(t.managerId).trader);
    const give = (t: (typeof teams)[number]) => [...roster.get(t.id)!].sort(() => rng() - 0.5).slice(0, 1 + Math.floor(rng() * 3));
    const [fromA, fromB] = [give(a), give(b)];
    const status = rng() < 0.15 ? "vetoed" : "completed";
    trades.push({
      date: isoDate(date),
      status,
      sides: [
        { teamId: a.id, receives: fromB.map((id) => ({ name: nameOf.get(id)!, playerId: id })) },
        { teamId: b.id, receives: fromA.map((id) => ({ name: nameOf.get(id)!, playerId: id })) },
      ],
    });
    if (status === "completed") {
      for (const id of fromA) {
        roster.get(a.id)!.delete(id);
        roster.get(b.id)!.add(id);
      }
      for (const id of fromB) {
        roster.get(b.id)!.delete(id);
        roster.get(a.id)!.add(id);
      }
      tradeCount.set(a.id, tradeCount.get(a.id)! + 1);
      tradeCount.set(b.id, tradeCount.get(b.id)! + 1);
    }
  }

  // Waiver churn: managers drop who looks bad early (a noisy read) and grab the best free agents.
  const owned = new Set(teams.flatMap((t) => [...roster.get(t.id)!]));
  const pickups = new Map(teams.map((t) => [t.id, 0]));
  for (const t of [...teams].sort((x, y) => habits(y.managerId).churn - habits(x.managerId).churn)) {
    const h = habits(t.managerId);
    for (const id of [...roster.get(t.id)!]) {
      const looks = sim.get(id)!.effective + 0.9 * gaussian(rng);
      // Drafted players are mostly above average, so "looks bad" is relative to a typical draftee.
      const p = h.churn * (looks < 0.5 ? 0.9 : looks < 1.2 ? 0.55 : 0.2);
      if (rng() >= p) continue;
      roster.get(t.id)!.delete(id);
      owned.delete(id);
      let best = "";
      let bestScore = -Infinity;
      for (const c of pool.players) {
        if (owned.has(c.id) || c.id === id) continue;
        const score = sim.get(c.id)!.effective + 0.6 * gaussian(rng);
        if (score > bestScore) [best, bestScore] = [c.id, score];
      }
      roster.get(t.id)!.add(best);
      owned.add(best);
      pickups.set(t.id, pickups.get(t.id)! + 1);
    }
  }

  const ownerOf = new Map(teams.flatMap((t) => [...roster.get(t.id)!].map((id) => [id, t.id] as const)));
  const players: PlayerSeason[] = byValue.slice(0, LISTED).map(({ p }) => ({
    playerId: p.id,
    name: p.name,
    actualRank: actualRank.get(p.id)!,
    preseasonRank: preseasonRank.get(p.id)! <= LISTED ? preseasonRank.get(p.id)! : null,
    gamesPlayed: sim.get(p.id)!.gp,
    teamId: ownerOf.get(p.id) ?? null,
    stats: sim.get(p.id)!.stats,
  }));

  season.draft = draft;
  season.players = players;
  season.trades = trades.reverse();
  season.activity = Object.fromEntries(
    // Moves also count streaming adds that are dropped again before season end.
    teams.map((t) => [t.id, { moves: pickups.get(t.id)! * 3 + Math.round(habits(t.managerId).churn * 40 + rng() * 20), trades: tradeCount.get(t.id)! }]),
  );
  for (const t of teams) if (t.namesake) t.namesake.playerId = pool.players.find((p) => p.name === t.namesake!.name)?.id ?? null;
}

/** Fictional manager ratings in the style of the source's "Ratings & Levels". */
export function demoRatings(league: League, rng: () => number): League["ratings"] {
  const latest = new Set(league.seasons.at(-1)!.teams.map((t) => t.managerId));
  const level = (r: number) => (r >= 900 ? "Diamond" : r >= 800 ? "Platinum" : r >= 700 ? "Gold" : r >= 600 ? "Silver" : "Bronze");
  const rows = careerStats(league)
    .filter((c) => latest.has(c.managerId))
    .map((c) => {
      const catPct = c.catWins / Math.max(1, c.catWins + c.catLosses + c.catTies);
      return { managerId: c.managerId, rating: Math.round(Math.min(980, Math.max(450, 700 + 1500 * (catPct - 0.5) + 30 * c.titles + 25 * gaussian(rng)))) };
    })
    .sort((a, b) => b.rating - a.rating)
    .map((r, i): ManagerRating => ({ ...r, rank: i + 1, level: level(r.rating) }));
  return { asOf: "2025-10-01", rows };
}
