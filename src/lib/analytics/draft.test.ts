import { describe, expect, it } from "vitest";
import type { League, Season } from "../types";
import {
  draftSlotHistory,
  finishByDraftSlot,
  lateGems,
  managerDraftStats,
  seasonPicks,
  topBusts,
  topSteals,
  UNRANKED,
} from "./draft";

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

describe("draft value", () => {
  const picks = seasonPicks(season);
  const by = (name: string) => picks.find((p) => p.playerName === name)!;

  it("is draft slot minus actual finish", () => {
    expect(by("Star").value).toBe(0);
    expect(by("Bust").value).toBe(2 - 202);
    expect(by("Gem").value).toBe(15 - 5);
  });

  it("scores unranked players as rank 301 and keeps their rank null", () => {
    expect(by("Nobody").actualRank).toBeNull();
    expect(by("Nobody").value).toBe(16 - UNRANKED);
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
    expect(a.avgValue).toBeCloseTo((-200 + 10) / 2);
    const leagueMean = (0 - 200 + 10 + (16 - UNRANKED)) / 4;
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
