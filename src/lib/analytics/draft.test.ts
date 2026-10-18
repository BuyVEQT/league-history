import { describe, expect, it } from "vitest";
import type { League, Season } from "../types";
import {
  draftImpact,
  draftPositions,
  draftSlotHistory,
  favouritePlayers,
  finishByDraftSlot,
  gotAway,
  keepRates,
  lateGems,
  managerDraftStats,
  reachStats,
  seasonPicks,
  slotCapital,
  topBusts,
  topSteals,
} from "./draft";
import { rankValue, VALUE_SCALE } from "./value";

// Two teams, 8 rounds; A wins the only final.
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
    { round: 8, pick: 1, overall: 15, teamId: "t:a", playerId: "p3", playerName: "Gem" },
    { round: 8, pick: 2, overall: 16, teamId: "t:b", playerId: "p4", playerName: "Nobody" },
  ],
  players: [
    { playerId: "p1", name: "Star", actualRank: 1, preseasonRank: 1, gamesPlayed: 70, teamId: "t:b" },
    { playerId: "p2", name: "Bust", actualRank: 202, preseasonRank: 3, gamesPlayed: 12, teamId: "t:a" },
    { playerId: "p3", name: "Gem", actualRank: 5, preseasonRank: 150, gamesPlayed: 80, teamId: "t:a" },
    // p4 finished outside the top 300 and is absent from the list.
  ],
};
const league: League = { name: "t", source: "yahoo", managers: [{ id: "a", name: "A" }, { id: "b", name: "B" }], seasons: [season] };

// Replacement level = 2 teams × 8 rounds = 16.
const v = (rank: number | null) => rankValue(rank, 16);

describe("value curve", () => {
  it("is worth 3 × ln(replacement / rank), 0 at or below replacement", () => {
    expect(rankValue(1, 156)).toBeCloseTo(VALUE_SCALE * Math.log(156));
    expect(rankValue(156, 156)).toBe(0);
    expect(rankValue(200, 156)).toBe(0);
    expect(rankValue(null, 156)).toBe(0);
  });

  it("falls off steeply at the top: 1st vs 10th is worth more than 10th vs 50th", () => {
    expect(rankValue(1, 156) - rankValue(10, 156)).toBeGreaterThan(rankValue(10, 156) - rankValue(50, 156));
  });
});

describe("draft value", () => {
  const picks = seasonPicks(season);
  const by = (name: string) => picks.find((p) => p.playerName === name)!;

  it("is the value of the finish minus the value expected at the draft slot", () => {
    expect(by("Star").value).toBe(0);
    expect(by("Bust").value).toBeCloseTo(v(null) - v(2));
    expect(by("Gem").value).toBeCloseTo(v(5) - v(15));
  });

  it("an early bust costs more than a late steal gains", () => {
    expect(-by("Bust").value).toBeGreaterThan(by("Gem").value);
  });

  it("keeps unranked players' rank null and worth nothing", () => {
    expect(by("Nobody").actualRank).toBeNull();
    expect(by("Nobody").value).toBeCloseTo(v(null) - v(16));
  });

  it("ranks steals by value and limits busts to early rounds", () => {
    expect(topSteals(picks, 1)[0].playerName).toBe("Gem");
    expect(topBusts(picks).map((p) => p.playerName)).toEqual(["Bust", "Star"]);
  });

  it("finds late-round gems (round 8+, top 75)", () => {
    expect(lateGems(picks).map((p) => p.playerName)).toEqual(["Gem"]);
  });

  it("grades managers by mean value and hit rate", () => {
    const a = managerDraftStats(league).find((g) => g.managerId === "a")!;
    expect(a.avgValue).toBeCloseTo((by("Bust").value + by("Gem").value) / 2);
    const leagueMean = picks.reduce((s, p) => s + p.value, 0) / picks.length;
    expect(a.vsLeague).toBeCloseTo(a.avgValue - leagueMean);
    expect(a.hitRate).toBe(0.5);
    expect(a.gems).toBe(1);
  });

  it("records the first pick's outcome and the champion's draft slot", () => {
    const [h] = draftSlotHistory(league);
    expect(h.firstPick.playerName).toBe("Star");
    expect(h.firstPickTeamFinish).toBe(2);
    expect(h.championSlot).toBe(2);
    expect(finishByDraftSlot(league)).toEqual([
      { slot: 1, seasons: 1, avgFinish: 2, titles: 0 },
      { slot: 2, seasons: 1, avgFinish: 1, titles: 1 },
    ]);
  });
});

describe("draft habits", () => {
  // Three seasons of the same two managers; A drafts "Fav" every year and keeps him.
  const make = (year: number, extra: Partial<Season> = {}): Season => ({
    ...season,
    year,
    label: `${year - 1}-${String(year).slice(2)}`,
    teams: season.teams.map((t) => ({ ...t, id: `${year}:${t.managerId}` })),
    matchups: [{ week: 1, stage: "final", homeTeamId: `${year}:a`, awayTeamId: `${year}:b`, homeCats: 5, awayCats: 4, tiedCats: 0 }],
    draft: [
      { round: 1, pick: 1, overall: 1, teamId: `${year}:a`, playerId: "fav", playerName: "Fav" },
      { round: 1, pick: 2, overall: 2, teamId: `${year}:b`, playerId: "x", playerName: "X" },
    ],
    players: [
      { playerId: "fav", name: "Fav", actualRank: 3, preseasonRank: 1, gamesPlayed: 70, teamId: `${year}:a` },
      // X: taken 2nd though ranked 30th pre-season (a reach), finished 10th — on A's roster.
      { playerId: "x", name: "X", actualRank: 10, preseasonRank: 30, gamesPlayed: 70, teamId: `${year}:a` },
    ],
    ...extra,
  });
  const three: League = { ...league, seasons: [make(2023), make(2024), make(2025)] };

  it("finds players one manager keeps drafting", () => {
    expect(favouritePlayers(three).map((f) => [f.managerId, f.playerName, f.picks.length])).toEqual([
      ["a", "Fav", 3],
      ["b", "X", 3],
    ]);
    expect(favouritePlayers(three, 4)).toEqual([]);
  });

  it("measures reaching against pre-season rank, and whether reaches beat it", () => {
    const r = reachStats(three)!;
    expect(r.rows.find((x) => x.managerId === "b")).toMatchObject({ picks: 3, avgEarly: 28, reachShare: 1 });
    expect(r.rows.find((x) => x.managerId === "a")).toMatchObject({ avgEarly: 0, reachShare: 0 });
    expect(r.groups.map((g) => [g.picks, g.beatRate])).toEqual([
      [3, 1], // X beat his pre-season rank every year
      [3, 0], // Fav finished 3rd, ranked 1st
      [0, 0],
    ]);
  });

  it("counts picks still rostered at season end", () => {
    const k = keepRates(three);
    expect(k.rows.map((r) => [r.managerId, r.avgKept, r.keptShare])).toEqual([
      ["a", 1, 1],
      ["b", 0, 0],
    ]);
  });

  it("lists drafted players who finished high elsewhere, traded or dropped", () => {
    const traded = make(2025, {
      trades: [{ date: "2025-01-01", status: "completed", sides: [{ teamId: "2025:a", receives: [{ name: "X", playerId: "x" }] }, { teamId: "2025:b", receives: [{ name: "Y", playerId: null }] }] }],
    });
    const rows = gotAway({ ...league, seasons: [make(2024), traded] });
    expect(rows.map((r) => [r.year, r.playerName, r.drafterManagerId, r.endManagerId, r.how])).toEqual([
      [2025, "X", "b", "a", "traded"],
      [2024, "X", "b", "a", "dropped"],
    ]);
  });

  it("counts first, second and top-three draft slots, and top-three finishers drafted", () => {
    // A picks 1st every year and drafts Fav (finished 3rd); B picks 2nd and drafts X (finished 10th).
    expect(draftPositions(three)).toEqual([
      expect.objectContaining({ managerId: "a", drafts: 3, firstPicks: 3, secondPicks: 0, topThreePicks: 3, avgSlot: 1, avgSlotShare: 0, topThreeFinishers: 3 }),
      expect.objectContaining({ managerId: "b", drafts: 3, firstPicks: 0, secondPicks: 3, topThreePicks: 3, avgSlot: 2, avgSlotShare: 1, topThreeFinishers: 0 }),
    ]);
    const [a, b] = draftPositions(three);
    expect(a.slotLuck).toBeCloseTo(-b.slotLuck); // two slots: one's luck is the other's bad luck
    expect(a.slotLuck).toBeGreaterThan(0);
  });

  it("values a snake-draft slot: earlier is luckier, and slots average to zero", () => {
    const lucks = Array.from({ length: 12 }, (_, i) => slotCapital(i + 1, 12));
    expect(lucks.reduce((x, y) => x + y, 0)).toBeCloseTo(0);
    expect(lucks).toEqual([...lucks].sort((x, y) => y - x));
    expect(lucks[0]).toBeGreaterThan(0);
  });

  it("correlates drafted value with the standings", () => {
    expect(draftImpact(three)).toBeNull(); // no regular season, nothing to correlate
  });
});
