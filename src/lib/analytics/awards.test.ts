import { describe, expect, it } from "vitest";
import { generateDemoLeague } from "../data/demo/generate";
import type { League, Matchup, Season } from "../types";
import { allTimeAwards, seasonAwards } from "./awards";

const g = (week: number, stage: Matchup["stage"], h: string, a: string, hc: number, ac: number): Matchup => ({
  week, stage, homeTeamId: `s:${h}`, awayTeamId: `s:${a}`, homeCats: hc, awayCats: ac, tiedCats: 9 - hc - ac,
});
// B is the #1 seed and loses the final to A; A also has the only 9-0.
const season: Season = {
  year: 2024,
  label: "2023-24",
  categories: Array(9).fill("x"),
  teams: ["a", "b", "c"].map((m) => ({ id: `s:${m}`, managerId: m, name: m.toUpperCase() })),
  matchups: [g(1, "regular", "a", "c", 9, 0), g(2, "regular", "b", "a", 6, 3), g(3, "regular", "b", "c", 6, 3), g(4, "final", "b", "a", 4, 5)],
};
const league: League = { name: "t", source: "demo", managers: ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase() })), seasons: [season] };
const byTitle = (xs: { title: string }[]) => Object.fromEntries(xs.map((x) => [x.title, x]));

describe("awards", () => {
  it("hands out season superlatives from the season's results", () => {
    const a = byTitle(seasonAwards(league, season));
    expect(a.Champion).toMatchObject({ winners: ["a"], value: "A", gold: true });
    expect(a["Regular-season MVP"]).toMatchObject({ winners: ["b"] });
    expect(a["Cinderella"]).toMatchObject({ winners: ["a"], value: "2nd → 1st" });
    expect(a["Playoff heartbreak"]).toMatchObject({ winners: ["b"], value: "1st → 2nd" });
    expect(a["Broom award"]).toMatchObject({ winners: ["a"], value: "1 × 9-0" });
    expect(a["Biggest beatdown"]).toMatchObject({ winners: ["a"], value: "9-0" });
    // No draft or trades in this season: those awards are left out.
    expect(a["Steal of the draft"]).toBeUndefined();
    expect(a["Heist of the year"]).toBeUndefined();
  });

  it("hands out all-time awards, and every award in the demo has a winner", () => {
    expect(byTitle(allTimeAwards(league))["Most decorated"]).toMatchObject({ winners: ["a"], value: "1 title" });
    const demo = generateDemoLeague();
    const all = [...allTimeAwards(demo), ...demo.seasons.flatMap((s) => seasonAwards(demo, s))];
    expect(all.length).toBeGreaterThan(100);
    expect(all.every((x) => x.winners.length > 0 && x.value)).toBe(true);
  });
});
