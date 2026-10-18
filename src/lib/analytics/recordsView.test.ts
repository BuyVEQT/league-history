import { describe, expect, it } from "vitest";
import { generateDemoLeague } from "../data/demo/generate";
import type { NamesakeRow } from "./players";
import { seasonRace } from "./race";
import { marginRecords, playoffRecords, seedHistory } from "./records";
import {
  biggestRiser,
  changedAlternates,
  iceInTheVeins,
  namesakeOwnership,
  regularWeeks,
  scorelineKind,
  seedStrip,
  seedTiles,
} from "./recordsView";
import { leagueAlternates } from "./whatIf";

const league = generateDemoLeague();

describe("recordsView", () => {
  it("adds each season's playoff spots to the seed history", () => {
    const seeds = seedHistory(league);
    const strip = seedStrip(league, seeds);
    expect(strip).toHaveLength(seeds.seasons.length);
    for (const s of strip) {
      expect(s.spots).toBe(seasonRace(league.seasons.find((x) => x.year === s.year)!).spots);
      if (s.championSeed) expect(s.championSeed).toBeLessThanOrEqual(s.spots);
    }
  });

  it("summarises champion seeds", () => {
    const seeds = {
      higherSeedWins: 0,
      bracketGames: 0,
      topSeedTitles: 1,
      seasons: [1, 4, null, 4].map((championSeed, i) => ({
        year: 2020 + i,
        label: `${2020 + i}`,
        championSeed,
        championManagerId: championSeed ? "m" : null,
        topSeedManagerId: "t",
        topSeedTeam: "T",
        topSeedFinish: 2,
      })),
    };
    const t = seedTiles(seeds);
    expect(t.decided).toBe(3);
    expect(t.lowestSeed).toBe(4);
    expect(t.lowest.map((s) => s.year)).toEqual([2021, 2023]);
    expect(t.avgChampionSeed).toBe(3);
    expect(seedTiles({ ...seeds, seasons: [] }).avgChampionSeed).toBeNull();
  });

  it("gives the last regular-season week of every season", () => {
    const weeks = regularWeeks(league);
    for (const s of league.seasons) expect(weeks[s.year]).toBe(Math.max(...s.matchups.filter((m) => m.stage === "regular").map((m) => m.week)));
  });

  it("picks the biggest riser and the best close-game record from the existing rows", () => {
    const riser = biggestRiser(playoffRecords(league));
    const eligible = playoffRecords(league).filter((r) => r.appearances >= 3);
    if (riser) expect(riser.avgOverSeed).toBe(Math.max(...eligible.map((r) => r.avgOverSeed)));
    const ice = iceInTheVeins(marginRecords(league), 1);
    expect(ice).not.toBeNull();
    expect(ice!.pct).toBeCloseTo(ice!.row.closeWins / (ice!.row.closeWins + ice!.row.closeLosses));
    expect(iceInTheVeins(marginRecords(league), 1e9)).toBeNull();
  });

  it("colours scorelines by margin", () => {
    expect(scorelineKind("5-4")).toBe("close");
    expect(scorelineKind("4-4-1")).toBe("close");
    expect(scorelineKind("6-3")).toBe("mid");
    expect(scorelineKind("8-1")).toBe("blowout");
    expect(scorelineKind("8-0-1")).toBe("blowout");
    expect(scorelineKind("9-0")).toBe("sweep");
  });

  it("keeps only alternates that change something", () => {
    const alts = leagueAlternates(league);
    for (const a of changedAlternates(alts)) expect(a.out.length > 0 || a.altTop.teamId !== a.actualTop.teamId).toBe(true);
  });

  it("names how a team held its namesake", () => {
    const base: NamesakeRow = { year: 1, label: "", managerId: "m", teamName: "", playerName: "", actualRank: 1, draftedBy: "them", ownedAtEnd: true, finalRank: 1, teamCount: 10 };
    expect(namesakeOwnership(base)).toBe("kept");
    expect(namesakeOwnership({ ...base, ownedAtEnd: false })).toBe("lost");
    expect(namesakeOwnership({ ...base, draftedBy: null })).toBe("later");
    expect(namesakeOwnership({ ...base, draftedBy: "x", ownedAtEnd: false })).toBe("rival");
    expect(namesakeOwnership({ ...base, draftedBy: null, ownedAtEnd: false })).toBe("never");
  });
});
