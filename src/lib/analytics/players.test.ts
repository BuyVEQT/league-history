import { describe, expect, it } from "vitest";
import type { League, PlayerSeason, PlayerStats, Season } from "../types";
import { namesakes, PUNT_Z, rosterProfiles, unownedStars } from "./players";

const stats = (o: Partial<PlayerStats> = {}): PlayerStats => ({ fgm: 500, fga: 1000, ftm: 200, fta: 250, threes: 100, pts: 1300, reb: 400, ast: 300, stl: 80, blk: 40, to: 150, ...o });
const CATS = ["FG%", "FT%", "3PM", "PTS", "REB", "AST", "STL", "BLK", "TO"];

// Five teams, five rostered players each. Team E's roster shoots free throws terribly.
const teamIds = ["a", "b", "c", "d", "e"];
const players: PlayerSeason[] = teamIds.flatMap((t, ti) =>
  Array.from({ length: 5 }, (_, i) => ({
    playerId: `${t}${i}`,
    name: `${t.toUpperCase()} Player ${i}`,
    actualRank: ti * 5 + i + 1,
    preseasonRank: null,
    gamesPlayed: 70,
    teamId: `s:${t}`,
    stats: stats(t === "e" ? { ftm: 100 } : { pts: 1300 + ti * 10 + i }),
  })),
);
const season: Season = {
  year: 2025,
  label: "2024-25",
  scoring: "categories",
  categories: CATS,
  teams: teamIds.map((m) => ({ id: `s:${m}`, managerId: m, name: m.toUpperCase() })),
  matchups: [{ week: 1, stage: "final", homeTeamId: "s:a", awayTeamId: "s:b", homeCats: 5, awayCats: 4, tiedCats: 0 }],
  draft: [{ round: 1, pick: 1, overall: 1, teamId: "s:b", playerId: "fa1", playerName: "Free Agent Star" }],
  players: [...players, { playerId: "fa1", name: "F. Star", actualRank: 3, preseasonRank: 1, gamesPlayed: 20, teamId: null }],
};
const league: League = { name: "t", source: "demo", managers: teamIds.map((id) => ({ id, name: id })), seasons: [season] };

describe("players", () => {
  it("flags a category far below the league as a likely punt", () => {
    const p = rosterProfiles(season)!;
    expect(p.playersPerTeam).toBe(5);
    const e = p.rows.find((r) => r.managerId === "e")!;
    expect(e.z["FT%"]).toBeLessThanOrEqual(PUNT_Z);
    expect(e.punts).toEqual(["FT%"]);
    expect(p.rows.filter((r) => r.managerId !== "e").every((r) => !r.punts.includes("FT%"))).toBe(true);
  });

  it("does not call a team that is weak everywhere a punter", () => {
    const weak = { ftm: 150, threes: 70, pts: 1000, reb: 300, ast: 200, stl: 50, blk: 20, to: 200, fgm: 430 };
    const s: Season = { ...season, players: season.players!.map((p) => (p.teamId === "s:e" ? { ...p, stats: stats(weak) } : p)) };
    const e = rosterProfiles(s)!.rows.find((r) => r.managerId === "e")!;
    expect(Math.max(...Object.values(e.z))).toBeLessThan(0);
    expect(e.punts).toEqual([]);
  });

  it("needs stats for most rostered players", () => {
    const withoutStats = season.players!.map((p) => ({ ...p, stats: undefined }));
    expect(rosterProfiles({ ...season, players: withoutStats })).toBeNull();
  });

  it("lists top players nobody owned at season end, with their full drafted name", () => {
    expect(unownedStars(league)).toEqual([expect.objectContaining({ playerName: "Free Agent Star", actualRank: 3, draftedBy: "b" })]);
  });

  it("checks namesakes against the draft and season-end roster", () => {
    const named: League = {
      ...league,
      seasons: [{ ...season, teams: season.teams.map((t) => (t.managerId === "a" ? { ...t, name: "Star Power", namesake: { name: "Free Agent Star", playerId: "fa1" } } : t)) }],
    };
    expect(namesakes(named)).toEqual([
      expect.objectContaining({ managerId: "a", playerName: "Free Agent Star", actualRank: 3, draftedBy: "b", ownedAtEnd: false, finalRank: 1, teamCount: 5 }),
    ]);
  });
});
