import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { seasonOutcome, seasonStandings } from "../analytics/season";
import type { Season } from "../types";

/**
 * Every extracted season is checked against numbers copied from Yahoo's own
 * pages, so a misread scoreboard fails here instead of skewing the site.
 */
const dir = join(process.cwd(), "data", "leagues", "caboclo");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

interface Verification {
  categoryRecords: Record<string, string>;
  playoffSeeds: string[];
  champion: string;
}

describe.each(files)("caboclo %s", (file) => {
  const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as Season & { verification: Verification };
  const season: Season = raw;
  const check = raw.verification;

  it("categories in every matchup add up to the category count", () => {
    for (const m of season.matchups) {
      expect(m.homeCats + m.awayCats + m.tiedCats).toBe(season.categories.length);
      expect(m.tiedCats).toBeGreaterThanOrEqual(0);
    }
  });

  it("every team plays exactly once in every regular-season week", () => {
    const regular = season.matchups.filter((m) => m.stage === "regular");
    const weeks = new Set(regular.map((m) => m.week));
    for (const w of weeks) {
      const ids = regular.filter((m) => m.week === w).flatMap((m) => [m.homeTeamId, m.awayTeamId]);
      expect(ids.sort()).toEqual(season.teams.map((t) => t.id).sort());
    }
  });

  it("derived category records match Yahoo's standings", () => {
    for (const row of seasonStandings(season)) {
      expect(`${row.catWins}-${row.catLosses}-${row.catTies}`, row.teamName).toBe(check.categoryRecords[row.teamId]);
    }
  });

  it("derived regular-season order matches Yahoo's playoff seeds", () => {
    const seeds = seasonStandings(season).slice(0, check.playoffSeeds.length).map((r) => r.teamId);
    expect(seeds).toEqual(check.playoffSeeds);
  });

  it("the bracket's champion matches Yahoo and holds final rank 1", () => {
    const o = seasonOutcome(season);
    expect(o.championTeamId).toBe(check.champion);
    expect(o.finalRank.get(check.champion)).toBe(1);
    expect(o.finalRank.get(o.runnerUpTeamId!)).toBe(2);
    expect(new Set(o.finalRank.values()).size).toBe(season.teams.length);
  });
});
