import { describe, expect, it } from "vitest";
import type { League, Matchup, Season } from "../types";
import { consistency, marginRecords, playoffRecords, schedules, teamSeasons, titleDroughts } from "./records";

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

// 2023: A is the top seed but B wins the final. 2024: A wins it.
const s2023: Season = {
  year: 2023,
  label: "2022-23",
  categories: Array(9).fill("x"),
  teams: teams(2023),
  matchups: [
    g(1, "regular", "2023:a", "2023:b", 5, 4),
    g(2, "regular", "2023:a", "2023:c", 8, 1),
    g(3, "regular", "2023:b", "2023:c", 5, 4),
    g(4, "final", "2023:a", "2023:b", 4, 5),
  ],
};
const s2024: Season = {
  year: 2024,
  label: "2023-24",
  categories: Array(9).fill("x"),
  teams: teams(2024),
  matchups: [
    g(1, "regular", "2024:a", "2024:b", 9, 0),
    g(2, "regular", "2024:a", "2024:c", 4, 5),
    g(3, "regular", "2024:b", "2024:c", 6, 3),
    g(4, "final", "2024:a", "2024:b", 5, 4),
  ],
};
const league: League = {
  name: "t",
  source: "demo",
  managers: ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase() })),
  seasons: [s2023, s2024],
};
const by = <T extends { managerId: string }>(rows: T[]) => Object.fromEntries(rows.map((r) => [r.managerId, r]));

describe("records", () => {
  it("compares playoff finish with seed", () => {
    const rows = by(playoffRecords(league));
    // A: seeded 1st both years, finished 2nd then 1st.
    expect(rows.a).toMatchObject({ appearances: 2, avgSeed: 1, avgFinish: 1.5, avgOverSeed: -0.5, playoffWins: 1, playoffLosses: 1, finals: 2, titles: 1 });
    // B: seeded 2nd then 3rd, finished 1st then 2nd.
    expect(rows.b).toMatchObject({ avgOverSeed: 1, titles: 1 });
    expect(rows.c).toBeUndefined();
  });

  it("tracks title droughts, including never having won", () => {
    const rows = by(titleDroughts(league));
    expect(rows.a).toMatchObject({ current: 0, lastTitle: "2023-24" });
    expect(rows.b).toMatchObject({ current: 1, lastTitle: "2022-23" });
    expect(rows.c).toMatchObject({ current: 2, titles: 0, lastTitle: null });
  });

  it("counts one-category games and 7+ category blowouts, playoffs included", () => {
    const rows = by(marginRecords(league));
    expect(rows.a).toMatchObject({ closeWins: 2, closeLosses: 2, blowoutWins: 2, blowoutLosses: 0 });
    expect(rows.b).toMatchObject({ closeWins: 2, closeLosses: 2, blowoutLosses: 1 });
    expect(rows.c).toMatchObject({ closeWins: 1, closeLosses: 1, blowoutLosses: 1 });
  });

  it("ranks team-seasons and measures schedule strength", () => {
    const best = teamSeasons(league)[0];
    expect(best).toMatchObject({ teamName: "A2023", record: "2-0-0", finalRank: 2 });
    // A2023 faced B (1-1) and C (0-2): average opponent win % = 0.25.
    expect(schedules(league).find((s) => s.teamName === "A2023")!.oppPct).toBeCloseTo(0.25);
  });

  it("measures consistency on finish percentiles", () => {
    const rows = by(consistency(league, 2));
    expect(rows.a.avgPercentile).toBeCloseTo(0.25);
    expect(rows.a.spread).toBeCloseTo(0.25);
  });
});
