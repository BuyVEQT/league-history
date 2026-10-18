import { describe, expect, it } from "vitest";
import { cabocloProvider } from "../data/caboclo";
import { generateDemoLeague } from "../data/demo/generate";
import { GOAT_MIN_SEASONS, GOAT_WEIGHTS, goatScores } from "./goat";

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
    expect([goat.managerId, Math.round(goat.score), second.managerId]).toEqual(["matt", 98, "najim"]);
  });
});
