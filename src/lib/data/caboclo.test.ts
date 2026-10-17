import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { managerSeasons } from "../analytics/career";
import { seasonOutcome, seasonStandings } from "../analytics/season";
import type { Season } from "../types";

/**
 * Every extracted season is checked against numbers copied from Yahoo's own
 * pages, so a misread scoreboard fails here instead of skewing the site.
 */
const dir = join(process.cwd(), "data", "leagues", "caboclo");
const files = readdirSync(dir).filter((f) => /^\d{4}\.json$/.test(f));

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

  it("labels every playoff team's result, including quarterfinal exits", () => {
    const league = { name: "t", source: "yahoo" as const, managers: season.teams.map((t) => ({ id: t.managerId, name: t.managerId })), seasons: [season] };
    const results = season.teams.map((t) => managerSeasons(league, t.managerId)[0].playoffResult);
    expect(results.filter((r) => r !== "Missed playoffs")).toHaveLength(check.playoffSeeds.length);
  });

  it("draft: every team picks exactly once per round", () => {
    if (!season.draft) return;
    const rounds = new Set(season.draft.map((p) => p.round));
    for (const r of rounds) {
      const ids = season.draft.filter((p) => p.round === r).map((p) => p.teamId).sort();
      expect(ids, `round ${r}`).toEqual(season.teams.map((t) => t.id).sort());
    }
    expect(new Set(season.draft.map((p) => p.playerId)).size).toBe(season.draft.length);
  });

  it("player ranks are unique and only reference real teams", () => {
    if (!season.players) return;
    const teamIds = new Set(season.teams.map((t) => t.id));
    expect(new Set(season.players.map((p) => p.actualRank)).size).toBe(season.players.length);
    for (const p of season.players) if (p.teamId) expect(teamIds.has(p.teamId)).toBe(true);
  });

  it("each team's trade count matches the completed trades it was part of", () => {
    if (!season.activity || !season.trades) return;
    for (const [teamId, a] of Object.entries(season.activity)) {
      const inTrades = season.trades.filter((t) => t.status === "completed" && t.sides.some((s) => s.teamId === teamId)).length;
      expect(inTrades, teamId).toBe(a.trades);
    }
  });

  it("the bracket's champion matches Yahoo and holds final rank 1", () => {
    const o = seasonOutcome(season);
    expect(o.championTeamId).toBe(check.champion);
    expect(o.finalRank.get(check.champion)).toBe(1);
    expect(o.finalRank.get(o.runnerUpTeamId!)).toBe(2);
    expect(new Set(o.finalRank.values()).size).toBe(season.teams.length);
  });
});
