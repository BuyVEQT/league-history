import { describe, expect, it } from "vitest";
import type { League, Season } from "../types";
import { biggestLosses, healthGrid, healthVsFinish, ironMen, managerHealth, pickHealth, repeatRisks, seasonGames } from "./injuryView";

const season = (year: number, gp: Record<string, number>, extra: Partial<Season> = {}): Season => ({
  year,
  label: `${year - 1}-${String(year).slice(2)}`,
  categories: Array(9).fill("x"),
  teams: [
    { id: `${year}:a`, managerId: "a", name: "A" },
    { id: `${year}:b`, managerId: "b", name: "B" },
  ],
  matchups: [{ week: 20, stage: "final", homeTeamId: `${year}:a`, awayTeamId: `${year}:b`, homeCats: 5, awayCats: 4, tiedCats: 0 }],
  draft: [
    { round: 1, pick: 1, overall: 1, teamId: `${year}:a`, playerId: "star", playerName: "Star" },
    { round: 1, pick: 2, overall: 2, teamId: `${year}:b`, playerId: "glass", playerName: "Glass" },
    { round: 4, pick: 1, overall: 7, teamId: `${year}:a`, playerId: "bench", playerName: "Bench", ...(gp.bench === undefined ? {} : { gamesPlayed: gp.bench }) },
  ],
  players: [
    { playerId: "star", name: "Star", actualRank: 1, preseasonRank: 1, gamesPlayed: gp.star, teamId: `${year}:a` },
    { playerId: "glass", name: "Glass", actualRank: 90, preseasonRank: 2, gamesPlayed: gp.glass, teamId: `${year}:b` },
  ],
  ...extra,
});

const league: League = {
  name: "t",
  source: "yahoo",
  managers: [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ],
  seasons: [season(2021, { star: 72, glass: 36, bench: 0 }), season(2022, { star: 84, glass: 41 }), season(2023, { star: 60, glass: 20, bench: 50 })],
};

describe("seasonGames", () => {
  it("is 82 except the 72-game 2020-21 season", () => {
    expect(seasonGames({ year: 2021 })).toBe(72);
    expect(seasonGames({ year: 2024 })).toBe(82);
  });
});

describe("pickHealth", () => {
  const picks = pickHealth(league);
  it("takes games from the player's season, or the pick when he's outside the top 300", () => {
    const bench = picks.filter((p) => p.playerId === "bench");
    expect(bench.map((p) => [p.year, p.games])).toEqual([
      [2021, 0],
      [2023, 50],
    ]); // 2022 bench has no games captured: left out
  });
  it("caps games at the schedule", () => {
    const star22 = picks.find((p) => p.year === 2022 && p.playerId === "star")!;
    expect([star22.games, star22.missed, star22.availability]).toEqual([82, 0, 1]);
    const glass21 = picks.find((p) => p.year === 2021 && p.playerId === "glass")!;
    expect([glass21.scheduled, glass21.missed, glass21.availability]).toEqual([72, 36, 0.5]);
  });
});

describe("managerHealth", () => {
  const picks = pickHealth(league);
  const { rows, leagueEarly, leagueEarlyMissedPerDraft } = managerHealth(picks);
  it("ranks managers by the share of games their round 1-3 picks played", () => {
    expect(rows.map((r) => r.managerId)).toEqual(["a", "b"]);
    const [a, b] = rows;
    expect(a.earlyAvailability).toBeCloseTo((72 + 82 + 60) / (72 + 82 + 82));
    expect(b.earlyAvailability).toBeCloseTo((36 + 41 + 20) / (72 + 82 + 82));
    expect(leagueEarly).toBeCloseTo((214 + 97) / 472);
    expect(a.vsLeague).toBeCloseTo((a.earlyAvailability - leagueEarly) * 100);
    expect(b.earlyMissedPerDraft).toBeCloseTo((36 + 41 + 62) / 3);
    expect(leagueEarlyMissedPerDraft).toBeCloseTo((22 + 36 + 41 + 62) / 6);
  });
  it("counts iron men and the worst-hit early pick, ignoring later rounds", () => {
    const [a, b] = rows;
    expect([a.ironMen, a.earlyPicks, a.worst?.year]).toEqual([2, 3, 2023]);
    expect(b.worst).toMatchObject({ playerId: "glass", year: 2023, missed: 62 });
    expect(a.allAvailability).toBeCloseTo((214 + 50) / (236 + 72 + 82));
  });
  it("lists managers with a single draft last, unranked", () => {
    const one: League = { ...league, managers: [...league.managers, { id: "c", name: "C" }], seasons: [...league.seasons, { ...season(2024, { star: 82, glass: 82 }), teams: [{ id: "2024:a", managerId: "c", name: "C" }, { id: "2024:b", managerId: "b", name: "B" }] }] };
    const r = managerHealth(pickHealth(one)).rows;
    expect(r.map((x) => [x.managerId, x.ranked])).toEqual([
      ["a", true],
      ["b", true],
      ["c", false],
    ]);
  });
});

describe("lists", () => {
  const picks = pickHealth(league);
  it("biggestLosses sorts early picks by games missed", () => {
    expect(biggestLosses(picks, 2).map((p) => `${p.playerId}${p.year}`)).toEqual(["glass2023", "glass2022"]);
  });
  it("ironMen keeps early picks at 95%+ of the schedule", () => {
    expect(ironMen(picks).map((p) => `${p.playerId}${p.year}`)).toEqual(["star2021", "star2022"]);
  });
  it("repeatRisks finds the least available repeat picks", () => {
    const [first] = repeatRisks(picks, { minDrafts: 3 });
    expect(first).toMatchObject({ playerId: "glass", times: 3, missed: 36 + 41 + 62 });
    expect(repeatRisks(picks, { minDrafts: 4 })).toEqual([]);
  });
});

describe("healthGrid", () => {
  const g = healthGrid(pickHealth(league));
  it("has one cell per manager-season and names each season's hardest hit", () => {
    expect(g.years.map((y) => y.year)).toEqual([2021, 2022, 2023]);
    expect(g.cell("b", 2021)).toMatchObject({ missed: 36, availability: 0.5 });
    expect(g.cell("a", 2020)).toBeNull();
    expect(g.seasons.map((s) => [s.hardestHit?.managerId, s.healthiest?.managerId])).toEqual([
      ["b", "a"],
      ["b", "a"],
      ["b", "a"],
    ]);
  });
});

describe("healthVsFinish", () => {
  it("splits finished seasons into thirds, healthiest first", () => {
    const buckets = healthVsFinish(league, pickHealth(league));
    expect(buckets.map((b) => b.seasons)).toEqual([2, 2, 2]);
    expect(buckets[0]).toMatchObject({ titles: 2, avgFinish: 1, playoffRate: 1 });
    expect(buckets[2].avgFinish).toBe(2);
    expect(buckets[0].min).toBeGreaterThanOrEqual(buckets[1].max);
  });
  it("needs at least three seasons", () => {
    expect(healthVsFinish({ ...league, seasons: league.seasons.slice(0, 1) }, pickHealth({ ...league, seasons: league.seasons.slice(0, 1) }))).toEqual([]);
  });
});
