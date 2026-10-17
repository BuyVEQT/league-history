import { describe, expect, it } from "vitest";
import { generateDemoLeague } from "../data/demo/generate";
import type { League, Matchup } from "../types";
import { careerStats, defaultCompare, managerSeasons } from "./career";
import { winPct } from "./format";
import { h2hMatrix, headToHead, opponentRecords } from "./headToHead";
import { matchupWinner, seasonOutcome, seasonStandings } from "./season";

const demo = generateDemoLeague();

/** A tiny hand-checkable league: A, B, C in 2023; A, B, D in 2024 (C left, D joined). */
function m(
  week: number,
  stage: Matchup["stage"],
  home: string,
  away: string,
  homeCats: number,
  awayCats: number,
  tiedCats = 9 - homeCats - awayCats,
  tiebreakWinnerTeamId?: string,
): Matchup {
  return { week, stage, homeTeamId: home, awayTeamId: away, homeCats, awayCats, tiedCats, tiebreakWinnerTeamId };
}

const mini: League = {
  name: "mini",
  source: "demo",
  managers: [
    { id: "A", name: "Ann" },
    { id: "B", name: "Bob" },
    { id: "C", name: "Cy" },
    { id: "D", name: "Di" },
  ],
  seasons: [
    {
      year: 2023,
      label: "2022-23",
      categories: [],
      teams: [
        { id: "2023:A", managerId: "A", name: "Ann One" },
        { id: "2023:B", managerId: "B", name: "Bob One" },
        { id: "2023:C", managerId: "C", name: "Cy One" },
      ],
      matchups: [
        m(1, "regular", "2023:A", "2023:B", 6, 3), // A win
        m(2, "regular", "2023:A", "2023:C", 4, 4), // tie (1 cat tied)
        m(3, "regular", "2023:B", "2023:C", 5, 4), // B win
        m(4, "final", "2023:A", "2023:B", 3, 6), // B champion
      ],
    },
    {
      year: 2024,
      label: "2023-24",
      categories: [],
      // Ann renames her team; Cy has left, Di has joined.
      teams: [
        { id: "2024:A", managerId: "A", name: "Ann Two" },
        { id: "2024:B", managerId: "B", name: "Bob Two" },
        { id: "2024:D", managerId: "D", name: "Di Two" },
      ],
      matchups: [
        m(1, "regular", "2024:A", "2024:B", 2, 7), // B win
        m(2, "regular", "2024:A", "2024:D", 5, 4), // A win
        m(3, "regular", "2024:B", "2024:D", 5, 4), // B win
        // Tied final goes to the higher seed (Bob here).
        m(4, "final", "2024:B", "2024:A", 4, 4, 1, "2024:B"),
      ],
    },
  ],
};

describe("winPct", () => {
  it("counts a tie as half a win", () => {
    expect(winPct(3, 1, 2)).toBeCloseTo(4 / 6);
  });
  it("is null (not zero) when no games were played", () => {
    expect(winPct(0, 0, 0)).toBeNull();
  });
});

describe("mini league: standings and outcomes", () => {
  it("derives 2023 regular-season records, ignoring playoff games", () => {
    const rows = seasonStandings(mini.seasons[0]);
    const byId = Object.fromEntries(rows.map((r) => [r.teamId, r]));
    expect([byId["2023:A"].wins, byId["2023:A"].losses, byId["2023:A"].ties]).toEqual([1, 0, 1]);
    expect([byId["2023:B"].wins, byId["2023:B"].losses, byId["2023:B"].ties]).toEqual([1, 1, 0]);
    expect([byId["2023:C"].wins, byId["2023:C"].losses, byId["2023:C"].ties]).toEqual([0, 1, 1]);
    expect(rows[0].teamId).toBe("2023:A");
  });

  it("counts category wins/losses/ties separately from matchup results", () => {
    const a = seasonStandings(mini.seasons[0]).find((r) => r.teamId === "2023:A")!;
    expect([a.catWins, a.catLosses, a.catTies]).toEqual([10, 7, 1]);
  });

  it("separates the regular-season #1 from the champion", () => {
    const o = seasonOutcome(mini.seasons[0]);
    expect(o.standings[0].teamId).toBe("2023:A");
    expect(o.championTeamId).toBe("2023:B");
    expect(o.runnerUpTeamId).toBe("2023:A");
    expect(o.finalRank.get("2023:B")).toBe(1);
    expect(o.finalRank.get("2023:C")).toBe(o.standings.find((s) => s.teamId === "2023:C")!.rank);
  });

  it("resolves a tied playoff game with the stored tiebreak", () => {
    expect(seasonOutcome(mini.seasons[1]).championTeamId).toBe("2024:B");
  });

  it("returns no champion for a season without a completed final", () => {
    const incomplete = { ...mini.seasons[0], matchups: mini.seasons[0].matchups.filter((x) => x.stage === "regular") };
    expect(seasonOutcome(incomplete).championTeamId).toBeNull();
  });

  it("uses the source seed order only to break exact ties", () => {
    const tied: typeof mini.seasons[0] = {
      ...mini.seasons[0],
      scoring: "categories",
      matchups: [m(1, "regular", "2023:A", "2023:B", 4, 4, 1), m(2, "regular", "2023:C", "2023:A", 2, 7)],
    };
    // A is clearly first on records; B and C are not tied, so the seed order must not override them.
    expect(seasonStandings({ ...tied, sourceSeedOrder: ["2023:C", "2023:B", "2023:A"] }).map((r) => r.teamId)).toEqual([
      "2023:A",
      "2023:B",
      "2023:C",
    ]);
    const exact = { ...tied, matchups: [m(1, "regular", "2023:B", "2023:C", 4, 4, 1)] };
    expect(seasonStandings({ ...exact, sourceSeedOrder: ["2023:C", "2023:B"] }).slice(0, 2).map((r) => r.teamId)).toEqual([
      "2023:C",
      "2023:B",
    ]);
  });

  it("treats a regular-season tie as a tie", () => {
    expect(matchupWinner(mini.seasons[0].matchups[1])).toBeNull();
  });
});

describe("mini league: careers", () => {
  const careers = Object.fromEntries(careerStats(mini).map((c) => [c.managerId, c]));

  it("counts championships and runner-ups", () => {
    expect(careers.B.titles).toBe(2);
    expect(careers.A.titles).toBe(0);
    expect(careers.A.runnerUps).toBe(2); // lost the final in both seasons
  });

  it("sums regular-season records across seasons", () => {
    // Ann: 2023 1-0-1, 2024 1-1-0
    expect([careers.A.wins, careers.A.losses, careers.A.ties]).toEqual([2, 1, 1]);
    expect(careers.A.winPct).toBeCloseTo(2.5 / 4);
  });

  it("only counts seasons a manager played (partial participation)", () => {
    expect(careers.C.seasons).toBe(1);
    expect(careers.D.seasons).toBe(1);
    expect(careers.C.lastYear).toBe(2023);
    expect(careers.D.firstYear).toBe(2024);
  });

  it("keeps one manager across team renames, with per-season names", () => {
    const seasons = managerSeasons(mini, "A");
    expect(seasons.map((s) => s.teamName)).toEqual(["Ann One", "Ann Two"]);
    expect(careers.A.seasons).toBe(2);
  });

  it("computes average and best finish", () => {
    expect(careers.B.avgFinish).toBe(1);
    expect(careers.B.bestFinish).toBe(1);
  });

  it("respects a year range filter and drops managers with no seasons in it", () => {
    const only2024 = careerStats(mini, { from: 2024, to: 2024 });
    expect(only2024.map((c) => c.managerId).sort()).toEqual(["A", "B", "D"]);
    expect(only2024.find((c) => c.managerId === "A")!.wins).toBe(1);
  });

  it("sorts by titles, then runner-ups, then win%", () => {
    const sorted = careerStats(mini).sort(defaultCompare);
    expect(sorted[0].managerId).toBe("B");
    expect(sorted[1].managerId).toBe("A");
  });
});

describe("mini league: head-to-head", () => {
  it("is built from actual matchups, regular and playoff separated", () => {
    const h = headToHead(mini, "A", "B");
    expect(h.games).toHaveLength(4);
    expect([h.aWins, h.bWins, h.ties]).toEqual([1, 3, 0]);
    expect([h.regular.aWins, h.regular.bWins]).toEqual([1, 1]);
    expect([h.playoff.aWins, h.playoff.bWins]).toEqual([0, 2]);
    expect(h.finalMeetings).toBe(2);
    expect(h.playoffMeetings).toBe(2);
  });

  it("is symmetric", () => {
    const ab = headToHead(mini, "A", "B");
    const ba = headToHead(mini, "B", "A");
    expect([ab.aWins, ab.bWins]).toEqual([ba.bWins, ba.aWins]);
    expect(ab.aCatWins).toBe(ba.bCatWins);
  });

  it("does not invent results for managers who never overlapped", () => {
    const h = headToHead(mini, "C", "D");
    expect(h.games).toHaveLength(0);
    expect(opponentRecords(mini, "D").map((r) => r.opponentId).sort()).toEqual(["A", "B"]);
  });

  it("counts tied regular-season matchups as ties", () => {
    const h = headToHead(mini, "A", "C");
    expect([h.aWins, h.bWins, h.ties]).toEqual([0, 0, 1]);
  });
});

describe("demo league: internal consistency", () => {
  it("covers about 10 seasons with a different league size mid-way", () => {
    expect(demo.seasons).toHaveLength(10);
    const sizes = new Set(demo.seasons.map((s) => s.teams.length));
    expect(sizes.size).toBeGreaterThan(1);
  });

  it("has several different champions", () => {
    const champs = new Set(demo.seasons.map((s) => seasonOutcome(s).championTeamId!.split(":")[1]));
    expect(champs.size).toBeGreaterThanOrEqual(4);
  });

  it("every matchup's categories add up to 9 and ties are only in regular season", () => {
    for (const s of demo.seasons) {
      for (const x of s.matchups) {
        expect(x.homeCats + x.awayCats + x.tiedCats).toBe(s.categories.length);
        if (x.stage === "regular") expect(x.tiebreakWinnerTeamId).toBeUndefined();
        else expect(matchupWinner(x)).not.toBeNull();
      }
    }
  });

  it("includes some tied regular-season matchups", () => {
    const ties = demo.seasons.flatMap((s) => s.matchups).filter((x) => x.stage === "regular" && x.homeCats === x.awayCats);
    expect(ties.length).toBeGreaterThan(0);
  });

  it("every team plays every week exactly once", () => {
    for (const s of demo.seasons) {
      const weeks = Math.max(...s.matchups.filter((x) => x.stage === "regular").map((x) => x.week));
      for (let w = 1; w <= weeks; w++) {
        const ids = s.matchups.filter((x) => x.stage === "regular" && x.week === w).flatMap((x) => [x.homeTeamId, x.awayTeamId]);
        expect(new Set(ids).size).toBe(s.teams.length);
        expect(ids).toHaveLength(s.teams.length);
      }
    }
  });

  it("a manager joins and a manager leaves and returns", () => {
    const devon = managerSeasons(demo, "devon").map((x) => x.year);
    expect(devon).toContain(2018);
    expect(devon).not.toContain(2019);
    expect(devon).toContain(2021);
    expect(managerSeasons(demo, "marcus")[0].year).toBe(2021);
  });

  it("career totals equal the sum of the underlying matchups", () => {
    const totals = new Map<string, [number, number, number]>();
    for (const s of demo.seasons) {
      const team = new Map(s.teams.map((t) => [t.id, t.managerId]));
      for (const x of s.matchups.filter((y) => y.stage === "regular")) {
        const h = team.get(x.homeTeamId)!;
        const a = team.get(x.awayTeamId)!;
        for (const id of [h, a]) if (!totals.has(id)) totals.set(id, [0, 0, 0]);
        if (x.homeCats === x.awayCats) {
          totals.get(h)![2]++;
          totals.get(a)![2]++;
        } else if (x.homeCats > x.awayCats) {
          totals.get(h)![0]++;
          totals.get(a)![1]++;
        } else {
          totals.get(a)![0]++;
          totals.get(h)![1]++;
        }
      }
    }
    for (const c of careerStats(demo)) {
      expect([c.wins, c.losses, c.ties]).toEqual(totals.get(c.managerId));
    }
  });

  it("championship counts across managers equal the number of seasons", () => {
    const total = careerStats(demo).reduce((n, c) => n + c.titles, 0);
    expect(total).toBe(demo.seasons.length);
  });

  it("every wins total has a matching losses total", () => {
    const rows = careerStats(demo);
    expect(rows.reduce((n, c) => n + c.wins, 0)).toBe(rows.reduce((n, c) => n + c.losses, 0));
    expect(rows.reduce((n, c) => n + c.catWins, 0)).toBe(rows.reduce((n, c) => n + c.catLosses, 0));
  });

  it("head-to-head matchups reconcile with each side's own records", () => {
    const ids = demo.managers.map((x) => x.id);
    let regularGames = 0;
    for (const a of ids) {
      for (const b of ids) {
        if (a >= b) continue;
        const h = headToHead(demo, a, b);
        regularGames += h.regular.aWins + h.regular.bWins + h.regular.ties;
        expect(h.aWins + h.bWins + h.ties).toBe(h.games.length);
      }
    }
    const totalRegular = demo.seasons.flatMap((s) => s.matchups).filter((x) => x.stage === "regular").length;
    expect(regularGames).toBe(totalRegular);
  });

  it("non-overlapping managers have no head-to-head games in a year they were not both in", () => {
    const h = headToHead(demo, "devon", "priya");
    expect(h.games.every((g) => g.year >= 2021 || g.year >= 2019)).toBe(true);
    expect(h.byYear.some((y) => y.year === 2019 || y.year === 2020)).toBe(false);
  });
});

describe("h2hMatrix", () => {
  it("matches headToHead for every pair", () => {
    const { ids, cells } = h2hMatrix(demo);
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        const h = headToHead(demo, a, b);
        const c = cells[a]?.[b] ?? { wins: 0, losses: 0, ties: 0 };
        expect([c.wins, c.losses, c.ties]).toEqual([h.aWins, h.bWins, h.ties]);
      }
    }
  });
});
