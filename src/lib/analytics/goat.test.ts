import { describe, expect, it } from "vitest";
import { cabocloProvider } from "../data/caboclo";
import { generateDemoLeague } from "../data/demo/generate";
import type { League, Matchup, Season } from "../types";
import { GOAT_MIN_SEASONS, GOAT_PLAYOFF_PAD, GOAT_WEIGHTS, goatConfidence, goatScores } from "./goat";

describe("GOAT score", () => {
  it("weights sum to 1 and scores stay within 0-100", () => {
    expect(Object.values(GOAT_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const rows = goatScores(generateDemoLeague());
    expect(rows.every((r) => r.score >= 0 && r.score <= 100)).toBe(true);
    expect(rows.map((r) => r.score)).toEqual([...rows.map((r) => r.score)].sort((a, b) => b - a));
  });

  it("only scores managers with enough seasons in the range", async () => {
    const league = await cabocloProvider.getLeague();
    expect(goatScores(league).map((r) => r.managerId)).not.toContain("brendan"); // one season
    expect(goatScores(league, { from: 2025 }).length).toBe(0); // two seasons < GOAT_MIN_SEASONS
    expect(GOAT_MIN_SEASONS).toBe(3);
  });

  it("names the Caboclo Cup GOAT", async () => {
    const [goat, second] = goatScores(await cabocloProvider.getLeague());
    expect([goat.managerId, Math.round(goat.score), second.managerId, Math.round(second.score)]).toEqual(["matt", 87, "najim", 81]);
  });

  it("scores against the league average: 50 = average, scores spread around it", () => {
    const rows = goatScores(generateDemoLeague());
    const mean = rows.reduce((a, r) => a + r.score, 0) / rows.length;
    expect(mean).toBeCloseTo(50, 0);
    for (const k of Object.keys(GOAT_WEIGHTS) as (keyof typeof GOAT_WEIGHTS)[]) {
      expect(rows.reduce((a, r) => a + r.z[k], 0)).toBeCloseTo(0, 6);
    }
  });

  it("ignores third-place games, shares 3.5th between semifinal losers, pads playoff win %, and counts runner-ups only", () => {
    // Three seasons, four teams. Each season: a beats b in the final; c beats d in the third-place game.
    const season = (year: number): Season => {
      const t = (m: string) => `${year}:${m}`;
      const reg = (w: number, h: string, a: string): Matchup => ({ week: w, stage: "regular", homeTeamId: t(h), awayTeamId: t(a), homeCats: 5, awayCats: 4, tiedCats: 0 });
      return {
        year,
        label: `${year - 1}-${String(year).slice(2)}`,
        categories: Array(9).fill("x"),
        teams: ["a", "b", "c", "d"].map((m) => ({ id: t(m), managerId: m, name: m.toUpperCase() })),
        matchups: [
          reg(1, "a", "b"),
          reg(1, "c", "d"),
          reg(2, "a", "c"),
          reg(2, "b", "d"),
          { week: 3, stage: "semifinal", homeTeamId: t("a"), awayTeamId: t("d"), homeCats: 6, awayCats: 3, tiedCats: 0 },
          { week: 3, stage: "semifinal", homeTeamId: t("b"), awayTeamId: t("c"), homeCats: 6, awayCats: 3, tiedCats: 0 },
          { week: 4, stage: "final", homeTeamId: t("a"), awayTeamId: t("b"), homeCats: 5, awayCats: 4, tiedCats: 0 },
          { week: 4, stage: "third_place", homeTeamId: t("c"), awayTeamId: t("d"), homeCats: 9, awayCats: 0, tiedCats: 0 },
        ],
      };
    };
    const league: League = { name: "t", source: "demo", managers: ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase() })), seasons: [2021, 2022, 2023].map(season) };
    const raw = Object.fromEntries(goatScores(league).map((r) => [r.managerId, r.raw]));
    expect(raw.c.finish).toBeCloseTo(raw.d.finish); // 3rd and 4th both count as 3.5th
    expect(raw.c.finish).toBeCloseTo(1 - 2.5 / 3);
    expect(raw.c.playoffWinPct).toBeCloseTo(raw.d.playoffWinPct); // the 3-0 third-place record doesn't count
    expect(raw.c.playoffWinPct).toBeCloseTo(GOAT_PLAYOFF_PAD / (3 + 2 * GOAT_PLAYOFF_PAD)); // 0-3 in semifinals, padded
    expect(raw.a.playoffWinPct).toBeCloseTo((6 + GOAT_PLAYOFF_PAD) / (6 + 2 * GOAT_PLAYOFF_PAD));
    expect([raw.a.finals, raw.b.finals]).toEqual([0, 3]); // runner-up finishes only: titles aren't counted twice
  });

  it("reports how sure the #1 is", async () => {
    const sure = goatConfidence(await cabocloProvider.getLeague())!;
    expect(sure.topShare.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1);
    expect(sure.topShare[0].managerId).toBe("matt");
    expect(sure.swings.map((s) => [s.label, s.leader])).toEqual([
      ["2018-19", "najim"],
      ["2023-24", "najim"],
    ]);
    expect(goatConfidence(await cabocloProvider.getLeague())).toEqual(sure); // seeded: the same every time
  });
});
