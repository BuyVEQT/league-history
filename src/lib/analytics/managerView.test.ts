import { describe, expect, it } from "vitest";
import type { League, Matchup, Season } from "../types";
import { careerStats } from "./career";
import { eloRatings } from "./elo";
import { headToHead } from "./headToHead";
import { catPctRank, eloMini, lastWeeks, luckMini } from "./managerView";
import { biggestBeatdown, seriesStreak } from "./rivalryView";
import { matchupLuck } from "./whatIf";

const g = (week: number, stage: Matchup["stage"], h: string, a: string, hc: number, ac: number): Matchup => ({
  week,
  stage,
  homeTeamId: h,
  awayTeamId: a,
  homeCats: hc,
  awayCats: ac,
  tiedCats: 9 - hc - ac,
});
const teams = (y: number, ids = ["a", "b", "c"]) => ids.map((m) => ({ id: `${y}:${m}`, managerId: m, name: `${m.toUpperCase()}${y}` }));

const s2023: Season = {
  year: 2023,
  label: "2022-23",
  scoring: "categories",
  categories: Array(9).fill("x"),
  teams: teams(2023),
  matchups: [
    g(1, "regular", "2023:a", "2023:b", 9, 0),
    g(2, "regular", "2023:a", "2023:c", 5, 4),
    g(3, "regular", "2023:b", "2023:c", 5, 4),
    g(4, "regular", "2023:b", "2023:a", 4, 4),
    g(5, "final", "2023:a", "2023:b", 4, 5),
  ],
};
const s2024: Season = {
  ...s2023,
  year: 2024,
  label: "2023-24",
  teams: teams(2024, ["a", "b"]),
  matchups: [g(1, "regular", "2024:a", "2024:b", 6, 3), g(2, "regular", "2024:b", "2024:a", 2, 7)],
};
const league: League = {
  name: "Test",
  source: "demo",
  managers: ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase() })),
  seasons: [s2023, s2024],
};

describe("catPctRank", () => {
  it("ranks by career category win %", () => {
    const careers = careerStats(league);
    expect(catPctRank(careers, "a")).toBe(1);
    expect(catPctRank(careers, "b")).toBe(3);
  });
});

describe("lastWeeks", () => {
  it("keeps the last n regular-season games per season, from the manager's side", () => {
    const f = lastWeeks(league, "a", 2);
    expect(f[2023]).toEqual([
      { week: 2, result: "W", my: 5, their: 4 },
      { week: 4, result: "T", my: 4, their: 4 },
    ]);
    expect(f[2024].map((x) => x.result)).toEqual(["W", "W"]);
    expect(lastWeeks(league, "c")[2024]).toBeUndefined();
  });
});

describe("eloMini", () => {
  it("groups the rating history by season and finds the current rank", () => {
    const elo = eloRatings(league);
    const m = eloMini(league, elo, "a");
    expect(m.seasons.map((s) => s.year)).toEqual([2023, 2024]);
    expect(m.seasons[0].points).toHaveLength(elo.history.a.filter((p) => p.year === 2023).length);
    expect(m.seasons[1].end).toBe(elo.history.a.at(-1)!.rating);
    expect(m.rank).toBe(1);
    expect(m.of).toBe(2);
    expect(m.peak?.rating).toBe(elo.peak.a.rating);
    expect(eloMini(league, elo, "c").rank).toBeNull();
    expect(m.maxWeek).toBe(5);
  });
});

describe("luckMini", () => {
  it("filters one manager's seasons, oldest first, with a league-wide scale", () => {
    const rows = matchupLuck(league);
    const m = luckMini(rows, "a");
    expect(m.rows.map((r) => r.year)).toEqual([2023, 2024]);
    expect(m.maxAbs).toBe(Math.max(...rows.map((r) => Math.abs(r.luck))));
  });
});

describe("rivalry view", () => {
  it("finds the current streak and the biggest margin", () => {
    const h = headToHead(league, "a", "b");
    // Meetings: a 9-0, tie 4-4, b wins final 5-4, a 6-3, a 7-2.
    expect(seriesStreak(h.games)).toEqual({ winner: "a", length: 2 });
    expect(biggestBeatdown(h.games)?.aCats).toBe(9);
    expect(seriesStreak([])).toBeNull();
  });
});
