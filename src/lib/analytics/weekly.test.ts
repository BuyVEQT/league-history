import { describe, expect, it } from "vitest";
import type { League, Matchup, Season } from "../types";
import { rivalryPairs } from "./headToHead";
import { allTimeRace, careerPath, weeklyProfile } from "./weekly";

const g = (week: number, stage: Matchup["stage"], h: string, a: string, hc: number, ac: number): Matchup => ({
  week,
  stage,
  homeTeamId: h,
  awayTeamId: a,
  homeCats: hc,
  awayCats: ac,
  tiedCats: 9 - hc - ac,
});
const teams = (y: number) => ["a", "b", "c"].map((m) => ({ id: `${y}:${m}`, managerId: m, name: `${m.toUpperCase()}${y}` }));

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
    g(4, "final", "2023:a", "2023:b", 4, 5),
  ],
};
const s2024: Season = {
  ...s2023,
  year: 2024,
  label: "2023-24",
  teams: teams(2024),
  matchups: [
    g(1, "regular", "2024:a", "2024:b", 6, 3),
    g(2, "regular", "2024:b", "2024:c", 3, 6),
    g(3, "regular", "2024:a", "2024:c", 7, 2),
    g(4, "final", "2024:a", "2024:c", 6, 3),
  ],
};
const league: League = {
  name: "Test",
  source: "demo",
  managers: ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase() })),
  seasons: [s2023, s2024],
};

describe("weeklyProfile", () => {
  it("counts categories won per week, sweeps both ways", () => {
    const a = weeklyProfile(league, "a");
    expect(a.weeks).toBe(6);
    expect(a.dist[9]).toBe(1);
    expect(a.sweeps).toBe(1);
    expect(weeklyProfile(league, "b").swept).toBe(1);
    expect(a.avgCats).toBeCloseTo((9 + 5 + 4 + 6 + 7 + 6) / 6);
    // Every matchup counts twice in the league distribution.
    expect(a.leagueDist.reduce((x, y) => x + y, 0)).toBe(16);
  });
});

describe("allTimeRace", () => {
  it("accumulates totals season by season", () => {
    const frames = allTimeRace(league);
    expect(frames).toHaveLength(2);
    const a1 = frames[0].rows.find((r) => r.managerId === "a")!;
    const a2 = frames[1].rows.find((r) => r.managerId === "a")!;
    expect(a1.titles).toBe(0);
    expect(a2.titles).toBe(1);
    expect(a2.catWins).toBe(9 + 5 + 6 + 7);
    expect(frames[0].rows.find((r) => r.managerId === "b")!.titles).toBe(1);
    expect(a2.seasons).toBe(2);
  });
});

describe("careerPath", () => {
  it("has seed and final finish per season", () => {
    expect(careerPath(league, "b").map((p) => p.final)).toEqual([1, 3]);
  });
});

describe("rivalryPairs", () => {
  it("lists each pair once with playoff meetings", () => {
    const pairs = rivalryPairs(league);
    const ab = pairs.find((p) => p.a === "a" && p.b === "b")!;
    expect(ab.games).toBe(3);
    expect(ab.wins).toBe(2);
    expect(ab.playoffMeetings).toBe(1);
    expect(ab.finalMeetings).toBe(1);
    expect(pairs).toHaveLength(3);
  });
});
