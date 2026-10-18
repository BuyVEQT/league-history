import { describe, expect, it } from "vitest";
import type { League, Season } from "../types";
import { draftGrade, impactShare, roundOneSlots, topThreePicks, type RoundOneSlot } from "./draftView";

const season: Season = {
  year: 2025,
  label: "2024-25",
  categories: Array(9).fill("x"),
  teams: [
    { id: "t:a", managerId: "a", name: "A" },
    { id: "t:b", managerId: "b", name: "B" },
  ],
  matchups: [{ week: 1, stage: "final", homeTeamId: "t:a", awayTeamId: "t:b", homeCats: 5, awayCats: 4, tiedCats: 0 }],
  draft: [
    { round: 1, pick: 1, overall: 1, teamId: "t:b", playerId: "p1", playerName: "Star" },
    { round: 1, pick: 2, overall: 2, teamId: "t:a", playerId: "p2", playerName: "Bust" },
    { round: 2, pick: 1, overall: 3, teamId: "t:a", playerId: "p3", playerName: "Second" },
  ],
  players: [{ playerId: "p1", name: "Star", actualRank: 1, preseasonRank: 1, gamesPlayed: 70, teamId: "t:b" }],
};
const upcoming: Season = {
  ...season,
  year: 2026,
  label: "2025-26",
  matchups: [],
  players: undefined,
  draft: [
    { round: 1, pick: 1, overall: 1, teamId: "t:a", playerId: "p9", playerName: "Next" },
    { round: 1, pick: 2, overall: 2, teamId: "t:b", playerId: "p8", playerName: "Later" },
  ],
};
const league: League = { name: "t", source: "yahoo", managers: [{ id: "a", name: "A" }, { id: "b", name: "B" }], seasons: [season], upcoming };

describe("draftGrade", () => {
  it("maps value vs league onto A-F at ±0.10 and ±0.30", () => {
    expect(draftGrade(0.48)).toBe("A");
    expect(draftGrade(0.3)).toBe("A");
    expect(draftGrade(0.21)).toBe("B");
    expect(draftGrade(0.02)).toBe("C");
    expect(draftGrade(-0.08)).toBe("C");
    expect(draftGrade(-0.1)).toBe("D");
    expect(draftGrade(-0.3)).toBe("F");
  });
});

describe("impactShare", () => {
  it("is the square of the draft-impact correlation", () => {
    expect(impactShare({ teamSeasons: 10, correlation: -0.5 })).toBeCloseTo(0.25);
  });
});

describe("roundOneSlots", () => {
  const slots = roundOneSlots(league);
  it("lists round-one picks only, with player and finish", () => {
    const played = slots.filter((s) => !s.next);
    expect(played).toEqual([
      { managerId: "b", year: 2025, label: "2024-25", slot: 1, playerName: "Star", actualRank: 1, next: false },
      { managerId: "a", year: 2025, label: "2024-25", slot: 2, playerName: "Bust", actualRank: null, next: false },
    ]);
  });
  it("adds the upcoming draft's order as next-season slots", () => {
    expect(slots.filter((s) => s.next).map((s) => [s.managerId, s.slot])).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });
  it("is empty of next-season slots without an upcoming draft", () => {
    expect(roundOneSlots({ ...league, upcoming: undefined }).some((s) => s.next)).toBe(false);
  });
});

describe("topThreePicks", () => {
  const slot = (managerId: string, year: number, slot: number, next = false): RoundOneSlot => ({ managerId, year, label: `${year - 1}-${String(year).slice(2)}`, slot, playerName: "x", actualRank: null, next });
  const slots = [slot("a", 2024, 1), slot("b", 2024, 2), slot("c", 2024, 3), slot("d", 2024, 4), slot("a", 2025, 3), slot("b", 2025, 1), slot("c", 2025, 2), slot("d", 2025, 4), slot("d", 2026, 1, true)];

  it("lists who held picks 1-3 each draft, newest first", () => {
    const { years } = topThreePicks(slots);
    expect(years.map((y) => y.year)).toEqual([2026, 2025, 2024]);
    expect(years[1].picks).toEqual(["b", "c", "a"]);
    expect(years[0]).toMatchObject({ next: true, picks: ["d", null, null] });
  });

  it("counts top-3 picks per manager, most first", () => {
    const { counts } = topThreePicks(slots);
    expect(counts.find((c) => c.managerId === "a")).toMatchObject({ first: 1, second: 0, third: 1, total: 2, drafts: 2 });
    expect(counts.find((c) => c.managerId === "d")).toMatchObject({ first: 1, total: 1, drafts: 3 });
    expect(counts.map((c) => c.total)).toEqual([...counts.map((c) => c.total)].sort((x, y) => y - x));
  });
});
