import { describe, expect, it } from "vitest";
import { cabocloProvider } from "../data/caboclo";
import { generateDemoLeague } from "../data/demo/generate";
import { careerStats } from "./career";
import { goatScores } from "./goat";
import { finishHistory, goatStack } from "./leaderboardView";
import { seasonRace } from "./race";
import { seasonOutcome } from "./season";
import { raceStorylines, replayFrames } from "./seasonView";

describe("season view helpers", () => {
  it("replay frames end on the official standings order", async () => {
    const league = await cabocloProvider.getLeague();
    for (const season of league.seasons) {
      const race = seasonRace(season);
      const { frames } = replayFrames(season, race.weeks);
      expect(frames.map((f) => f.week)).toEqual(race.weeks);
      expect(frames.at(-1)!.rows.map((r) => r.teamId)).toEqual(seasonOutcome(season).standings.map((r) => r.teamId));
      // Each frame's ranks match the race lines.
      frames.forEach((f, i) => f.rows.forEach((r) => expect(race.lines.find((l) => l.teamId === r.teamId)!.ranks[i]).toBe(r.rank)));
      expect(frames.every((f) => f.rows.every((r) => r.pct >= 0 && r.pct <= 1))).toBe(true);
    }
  });

  it("storylines point at real teams and lead with the front-runner", () => {
    const league = generateDemoLeague();
    for (const season of league.seasons) {
      const race = seasonRace(season);
      const stories = raceStorylines(race);
      const ids = new Set(race.lines.map((l) => l.teamId));
      expect(stories.every((s) => s.teamIds.length > 0 && s.teamIds.every((id) => ids.has(id)))).toBe(true);
      expect(stories.filter((s) => s.kind === "Comeback").length).toBe(race.comebacks.length);
      if (stories.length) expect(stories[0].kind).toBe("Front-runner");
    }
  });
});

describe("leaderboard view helpers", () => {
  it("GOAT slices add up to the score", () => {
    for (const row of goatScores(generateDemoLeague())) {
      const stack = goatStack(row);
      expect(stack).toHaveLength(6);
      expect(stack.reduce((a, s) => a + s.points, 0)).toBeCloseTo(row.score, 6);
    }
  });

  it("finish history has one point per season played", async () => {
    const league = await cabocloProvider.getLeague();
    for (const c of careerStats(league)) {
      const pts = finishHistory(league, c.managerId);
      expect(pts).toHaveLength(c.seasons);
      expect(pts.filter((p) => p.final === 1)).toHaveLength(c.titles);
    }
  });
});
