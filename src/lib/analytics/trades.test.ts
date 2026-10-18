import { describe, expect, it } from "vitest";
import type { League, Season } from "../types";
import { activityVsFinish, leagueTrades, managerActivity, undraftedGems } from "./trades";
import { rankValue, replacementRank } from "./value";

const season: Season = {
  year: 2025,
  label: "2024-25",
  categories: Array(9).fill("x"),
  teams: [
    { id: "t:a", managerId: "a", name: "A" },
    { id: "t:b", managerId: "b", name: "B" },
    { id: "t:c", managerId: "c", name: "C" },
  ],
  matchups: [{ week: 1, stage: "final", homeTeamId: "t:a", awayTeamId: "t:b", homeCats: 5, awayCats: 4, tiedCats: 0 }],
  draft: [{ round: 1, pick: 1, overall: 1, teamId: "t:b", playerId: "p1", playerName: "Star" }],
  players: [
    { playerId: "p1", name: "Star", actualRank: 1, preseasonRank: 1, gamesPlayed: 70, teamId: "t:a" },
    { playerId: "p2", name: "Role", actualRank: 101, preseasonRank: 90, gamesPlayed: 70, teamId: "t:b" },
    { playerId: "p3", name: "Pickup", actualRank: 20, preseasonRank: null, gamesPlayed: 60, teamId: "t:c" },
  ],
  activity: { "t:a": { moves: 10, trades: 1 }, "t:b": { moves: 30, trades: 1 }, "t:c": { moves: 50, trades: 0 } },
  trades: [
    {
      date: "2025-01-02",
      status: "completed",
      sides: [
        { teamId: "t:a", receives: [{ name: "Star", playerId: "p1" }] },
        { teamId: "t:b", receives: [{ name: "Role", playerId: "p2" }, { name: "Unknown Guy", playerId: null }] },
      ],
    },
    { date: "2025-01-01", status: "vetoed", sides: [{ teamId: "t:c", receives: [{ name: "Star", playerId: "p1" }] }, { teamId: "t:b", receives: [{ name: "Pickup", playerId: "p3" }] }] },
  ],
};
const league: League = {
  name: "t",
  source: "yahoo",
  managers: ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase() })),
  seasons: [season],
};

describe("trades", () => {
  it("uses teams × draft rounds as replacement level", () => {
    expect(replacementRank(season)).toBe(3); // 3 teams x 1 draft round
  });

  it("scores each side by player id on the shared value curve and picks the winner", () => {
    const [completed] = leagueTrades(league);
    // Replacement rank 3: Star (#1) = 3 × ln 3; Role (#101) and the unranked player = 0.
    expect(completed.sides.map((s) => s.value)).toEqual([rankValue(1, 3), 0]);
    expect(completed.winnerManagerId).toBe("a");
    expect(completed.margin).toBeCloseTo(3 * Math.log(3));
    expect(completed.sides[1].players[1]).toEqual({ name: "Unknown Guy", playerId: null, actualRank: null });
  });

  it("tallies activity, trade record and vetoes per manager", () => {
    const rows = Object.fromEntries(managerActivity(league).map((r) => [r.managerId, r]));
    expect(rows.a).toMatchObject({ trades: 1, tradeWins: 1, netValue: rankValue(1, 3), vetoed: 0, moves: 10 });
    expect(rows.b).toMatchObject({ trades: 1, tradeLosses: 1, netValue: -rankValue(1, 3), vetoed: 1 });
    expect(rows.b.favoritePartner).toEqual({ managerId: "a", count: 1 });
    expect(rows.c).toMatchObject({ trades: 0, vetoed: 1, moves: 50 });
  });

  it("finds undrafted players who finished high and were rostered", () => {
    expect(undraftedGems(league).map((g) => g.playerName)).toEqual(["Pickup"]);
  });

  it("compares champions' activity with the league", () => {
    expect(activityVsFinish(league)).toMatchObject({ leagueAvg: 30, championsAvg: 10, topThirdAvg: 10, bottomThirdAvg: 50 });
  });
});

describe("trades scored on post-trade games", () => {
  const after: Season = {
    ...season,
    trades: [
      {
        date: "2025-01-02",
        status: "completed",
        sides: [
          // Star (#1 for the season) barely played after the trade; Role (#101) ranked 2nd on the games after it.
          { teamId: "t:a", receives: [{ name: "Star", playerId: "p1", afterTrade: { rank: null, games: 2 } }] },
          { teamId: "t:b", receives: [{ name: "Role", playerId: "p2", afterTrade: { rank: 2, games: 30 } }] },
        ],
      },
    ],
  };
  const [t] = leagueTrades({ ...league, seasons: [after] });

  it("uses post-trade ranks when every player has one, and can flip the winner", () => {
    expect(t.basis).toBe("after");
    expect(t.sides.map((s) => s.value)).toEqual([0, rankValue(2, 3)]);
    expect(t.winnerManagerId).toBe("b");
    expect(t.sides[1].players[0]).toMatchObject({ actualRank: 101, afterRank: 2, afterGames: 30 });
  });

  it("falls back to full-season ranks otherwise", () => {
    expect(leagueTrades(league)[0].basis).toBe("season");
  });
});
