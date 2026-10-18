import { describe, expect, it } from "vitest";
import { generateDemoLeague } from "../data/demo/generate";
import type { League, Matchup, Season } from "../types";
import { ELO, eloRatings, expectedShare } from "./elo";
import { raceRecords, seasonRace } from "./race";
import { parity, seedHistory } from "./records";
import { marginAverages, scorelines, sweeps } from "./scorelines";
import { seasonStandings } from "./season";
import { longestStreaks, managerStreaks, seasonStreaks } from "./streaks";
import { alternateStandings, careerLuck, matchupLuck, matchupWinProbability } from "./whatIf";

const g = (week: number, stage: Matchup["stage"], h: string, a: string, hc: number, ac: number, tied = 9 - hc - ac): Matchup => ({
  week,
  stage,
  homeTeamId: `s:${h}`,
  awayTeamId: `s:${a}`,
  homeCats: hc,
  awayCats: ac,
  tiedCats: tied,
});

/**
 * Four teams, four weeks, two playoff spots, ranked by matchup record. Ranks by week (worked by hand):
 *   A 2 2 1 2 · B 3 3 3 1 · C 1 1 2 3 · D 4 4 4 4
 * C holds a playoff spot going into week 4 and loses it to B, who then beats A in the final.
 */
const season: Season = {
  year: 2024,
  label: "2023-24",
  categories: Array(9).fill("x"),
  teams: ["a", "b", "c", "d"].map((m) => ({ id: `s:${m}`, managerId: m, name: m.toUpperCase() })),
  matchups: [
    g(1, "regular", "a", "b", 7, 2),
    g(1, "regular", "c", "d", 8, 1),
    g(2, "regular", "a", "c", 2, 7),
    g(2, "regular", "b", "d", 6, 3),
    g(3, "regular", "a", "d", 9, 0),
    g(3, "regular", "b", "c", 6, 2, 1),
    g(4, "regular", "c", "d", 3, 6),
    g(4, "regular", "a", "b", 3, 5, 1),
    g(5, "final", "b", "a", 5, 4),
  ],
};
const league: League = {
  name: "t",
  source: "demo",
  managers: ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase() })),
  seasons: [season],
};
const demo = generateDemoLeague();

describe("standings race", () => {
  const race = seasonRace(season);
  const ranks = Object.fromEntries(race.lines.map((l) => [l.managerId, l.ranks]));

  it("ranks every team after every week", () => {
    expect(race.weeks).toEqual([1, 2, 3, 4]);
    expect(race.spots).toBe(2);
    expect(ranks).toEqual({ a: [2, 2, 1, 2], b: [3, 3, 3, 1], c: [1, 1, 2, 3], d: [4, 4, 4, 4] });
    expect(seasonStandings(season, { throughWeek: 2 }).map((r) => r.managerId)).toEqual(["c", "a", "b", "d"]);
  });

  it("finds weeks in first, second-half comebacks and the final-week swap", () => {
    expect(Object.fromEntries(race.lines.map((l) => [l.managerId, l.weeksInFirst]))).toEqual({ a: 1, b: 1, c: 2, d: 0 });
    expect(race.comebacks).toEqual([expect.objectContaining({ managerId: "b", rank: 3, week: 3, seed: 1, finalRank: 1 })]);
    expect(race.collapses).toEqual([]);
    expect(race.lastWeekOut).toEqual(["s:c"]);
    expect(race.lastWeekIn).toEqual(["s:b"]);
    const rec = raceRecords(league);
    expect(rec.frontRunners[0]).toMatchObject({ managerId: "c", weeksInFirst: 2, weeks: 4 });
    expect(rec.heartbreaks).toEqual([expect.objectContaining({ managerId: "c", week: 4, rank: 3 })]);
  });

  it("is a permutation of ranks every week and ends on the final standings (demo)", () => {
    for (const s of demo.seasons) {
      const r = seasonRace(s);
      for (let i = 0; i < r.weeks.length; i++) {
        expect(r.lines.map((l) => l.ranks[i]).sort((x, y) => x - y)).toEqual(s.teams.map((_, k) => k + 1));
      }
      for (const l of r.lines) expect(l.ranks.at(-1)).toBe(l.seed);
    }
  });
});

describe("streaks", () => {
  it("finds each team's longest run, broken by losses and ties", () => {
    const rows = seasonStreaks(season).map((r) => `${r.managerId}${r.kind}${r.length}:${r.fromWeek}-${r.toWeek}`);
    expect(rows.sort()).toEqual(["aL1:2-2", "aW1:1-1", "bL1:1-1", "bW3:2-4", "cL2:3-4", "cW2:1-2", "dL3:1-3", "dW1:4-4"]);
    expect(longestStreaks(league, "W", 1)[0]).toMatchObject({ managerId: "b", length: 3 });
    expect(longestStreaks(league, "L", 1)[0]).toMatchObject({ managerId: "d", length: 3 });
    expect(managerStreaks(league, "c")).toMatchObject({ win: { length: 2 }, loss: { length: 2 } });
  });

  it("does not count across a tied matchup", () => {
    const s: Season = { ...season, matchups: [g(1, "regular", "a", "b", 5, 4), g(2, "regular", "a", "c", 4, 4), g(3, "regular", "a", "d", 6, 3)] };
    expect(seasonStreaks(s).find((r) => r.managerId === "a" && r.kind === "W")).toMatchObject({ length: 1, fromWeek: 1 });
  });
});

describe("scorelines", () => {
  it("counts final scores, tied categories and sweeps", () => {
    const s = scorelines(league);
    expect(s.matchups).toBe(9);
    expect(s.withTiedCategory).toBe(2);
    expect(s.rows.slice(0, 2)).toEqual([
      { score: "6-3", count: 2, share: 2 / 9 },
      { score: "7-2", count: 2, share: 2 / 9 },
    ]);
    expect(s.rows.map((r) => r.score)).toContain("5-3-1");
    expect(sweeps(league)).toEqual([expect.objectContaining({ winnerManagerId: "a", loserManagerId: "d", week: 3, score: "9-0" })]);
  });

  it("averages margins of victory and defeat, playoffs included", () => {
    const rows = Object.fromEntries(marginAverages(league).map((r) => [r.managerId, r]));
    expect(rows.a).toMatchObject({ wins: 2, avgWinMargin: 7, losses: 3 });
    expect(rows.a.avgLossMargin).toBeCloseTo((5 + 2 + 1) / 3);
    expect(rows.b).toMatchObject({ wins: 4, avgWinMargin: 2.5, losses: 1, avgLossMargin: 5 });
  });
});

describe("what if", () => {
  it("re-ranks by the other method and finds who swaps in and out", () => {
    // By category %: A .597, C .569, B .556, D .278 — the champion B would miss a two-team field.
    const alt = alternateStandings(season)!;
    expect(alt).toMatchObject({ method: "matchups", altMethod: "categories", spots: 2, finalistsOut: ["s:b"] });
    expect(alt.out.map((r) => r.managerId)).toEqual(["b"]);
    expect(alt.in.map((r) => r.managerId)).toEqual(["c"]);
    expect([alt.actualTop.managerId, alt.altTop.managerId]).toEqual(["b", "a"]);
  });

  it("computes matchup odds from per-category odds", () => {
    expect(matchupWinProbability(0.5, 9)).toBeCloseTo(0.5);
    expect(matchupWinProbability(0.6, 9)).toBeCloseTo(0.7334, 4);
    expect(matchupWinProbability(0.5, 2)).toBeCloseTo(0.5); // a 1-1 split counts half
    expect(matchupWinProbability(0.6, 9) + matchupWinProbability(0.4, 9)).toBeCloseTo(1);
  });

  it("luck sums to zero across a league: every matchup hands out one win", () => {
    const rows = matchupLuck(league);
    expect(rows.reduce((s, r) => s + r.actual, 0)).toBe(8);
    expect(rows.reduce((s, r) => s + r.expected, 0)).toBeCloseTo(8);
    expect(careerLuck(demo).reduce((s, r) => s + r.luck, 0)).toBeCloseTo(0);
  });
});

describe("seeds and parity", () => {
  it("tracks the champion's seed and higher-seed wins", () => {
    expect(seedHistory(league)).toEqual({
      seasons: [expect.objectContaining({ championSeed: 1, championManagerId: "b", topSeedManagerId: "b", topSeedFinish: 1 })],
      higherSeedWins: 1,
      bracketGames: 1,
      topSeedTitles: 1,
    });
  });

  it("measures the spread of the standings", () => {
    // Matchup win %: B .75, A .5, C .5, D .25.
    const [p] = parity(league);
    expect(p).toMatchObject({ teams: 4, best: 0.75, worst: 0.25, bubbleGap: 0.25 });
    expect(p.spread).toBeCloseTo(Math.sqrt(0.03125));
  });
});

describe("elo", () => {
  it("moves ratings by K × (category share − expected share), all at once each week", () => {
    const r = eloRatings(league);
    expect(r.history.a[0].rating).toBeCloseTo(ELO.start + ELO.k * (7 / 9 - 0.5));
    expect(r.history.d[0].rating).toBeCloseTo(ELO.start - ELO.k * (8 / 9 - 0.5));
    expect(expectedShare(1600, 1500)).toBeCloseTo(0.64, 2);
    expect(r.current.map((c) => c.managerId)).toHaveLength(4);
    expect(r.current[0].rating).toBeGreaterThanOrEqual(r.current[3].rating);
  });

  it("pulls ratings halfway back to the start between seasons", () => {
    const next: Season = { ...season, year: 2025, label: "2024-25", teams: season.teams.map((t) => ({ ...t, id: t.id.replace("s:", "n:") })), matchups: [] };
    const two = eloRatings({ ...league, seasons: [season, next] });
    for (const id of ["a", "b", "c", "d"]) {
      expect(two.seasonEnd[2025][id] - ELO.start).toBeCloseTo((two.seasonEnd[2024][id] - ELO.start) * ELO.carryOver);
    }
  });

  it("predicts the demo league better than a coin flip", () => {
    expect(eloRatings(demo).predictiveSkill).toBeGreaterThan(0.1);
  });
});
