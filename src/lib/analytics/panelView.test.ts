import { describe, expect, it } from "vitest";
import { getLeague } from "../data";
import type { League, Matchup, Season } from "../types";
import { careerStats } from "./career";
import { leaguePicks } from "./draft";
import { panelData, playerIdLookup } from "./panelView";
import { seasonOutcome } from "./season";

const g = (week: number, stage: Matchup["stage"], h: string, a: string, hc: number, ac: number): Matchup => ({
  week,
  stage,
  homeTeamId: h,
  awayTeamId: a,
  homeCats: hc,
  awayCats: ac,
  tiedCats: 9 - hc - ac,
});
const teams = (y: number) => ["a", "b"].map((m) => ({ id: `${y}:${m}`, managerId: m, name: `${m.toUpperCase()}${y}` }));
const season = (year: number, aWins: boolean): Season => ({
  year,
  label: `${year - 1}-${String(year).slice(2)}`,
  scoring: "categories",
  categories: Array(9).fill("x"),
  teams: teams(year),
  // a beats b four times in 2023; b wins every meeting in 2024.
  matchups: [1, 2, 3, 4].map((w) => (aWins ? g(w, "regular", `${year}:a`, `${year}:b`, 6, 3) : g(w, "regular", `${year}:a`, `${year}:b`, 2, 7))).concat(g(5, "final", `${year}:a`, `${year}:b`, aWins ? 5 : 4, aWins ? 4 : 5)),
  draft: [
    { round: 1, pick: 1, overall: 1, teamId: `${year}:a`, playerId: "p1", playerName: "Star One" },
    { round: 1, pick: 2, overall: 2, teamId: `${year}:b`, playerId: "p2", playerName: "Two Guy" },
  ],
  players: [
    { playerId: "p1", name: "Star One", actualRank: 1, preseasonRank: 1, gamesPlayed: 70, teamId: `${year}:a` },
    { playerId: "p2", name: "Two Guy", actualRank: 30, preseasonRank: 2, gamesPlayed: 70, teamId: `${year}:a` },
  ],
});
const league: League = {
  name: "Test",
  source: "demo",
  managers: [
    { id: "a", name: "Ann" },
    { id: "b", name: "Bob" },
  ],
  seasons: [season(2023, true), season(2024, false)],
};

describe("panelData", () => {
  const d = panelData(league, new Map([["a", [1, 2, 3, 4, 5].map((i) => ({ name: `B${i}`, tone: "" as const, rule: "" }))]]));

  it("summarises managers from career stats", () => {
    const a = d.managers.a;
    const c = careerStats(league).find((r) => r.managerId === "a")!;
    expect(a.titles).toBe(c.titles);
    expect(a.seasons).toBe(2);
    expect(a.finishes).toEqual([
      { year: 2023, final: 1 },
      { year: 2024, final: 2 },
    ]);
    expect(a.best.year).toBe(2023);
    expect(a.worst.year).toBe(2024);
    expect(a.badges).toHaveLength(4);
    // 10 meetings, 5-5: the only rival is both victim and nemesis.
    expect(a.victim).toEqual({ id: "b", wins: 5, losses: 5, ties: 0, games: 10 });
    expect(a.nemesis?.id).toBe("b");
    expect(a.latest.year).toBe(2024);
    expect(a.latest.form.map((f) => f.result)).toEqual(["L", "L", "L", "L"]);
  });

  it("keeps standings order and final placement", () => {
    const s = d.seasons[2024];
    const o = seasonOutcome(league.seasons[1]);
    expect(s.rows.map((r) => r.managerId)).toEqual(o.standings.map((r) => r.managerId));
    expect(s.champion).toEqual({ managerId: "b", team: "B2024" });
    expect(s.weeks.map((w) => [w.week, w.playoff])).toEqual([
      [1, false],
      [2, false],
      [3, false],
      [4, false],
      [5, true],
    ]);
  });

  it("indexes players by id with every pick and record-book note", () => {
    expect(d.players.p1.picks.map((p) => p[0])).toEqual([2023, 2024]);
    expect(d.players.p1.picks[0][5]).toBeCloseTo(leaguePicks(league)[0].value, 1);
    // p2 was drafted by b but finished top 40 on a's roster: he got away.
    expect(d.players.p2.notes.map((n) => n.t1)).toContain("Got away from Bob");
  });

  it("looks up player ids by season and name", () => {
    const pid = playerIdLookup(league);
    expect(pid(2023, "two guy")).toBe("p2");
    expect(pid(2023, "Nobody")).toBeUndefined();
  });

  it("stays a reasonable size for the real leagues", async () => {
    for (const slug of ["demo", "caboclo"]) {
      const json = JSON.stringify(panelData((await getLeague(slug))!));
      expect(json.length).toBeLessThan(200_000);
    }
  });
});
