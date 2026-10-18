import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { marginAverages, sweeps } from "../analytics/scorelines";
import { matchupWinner, seasonOutcome, seasonStandings, teamIndex } from "../analytics/season";
import { longestStreaks } from "../analytics/streaks";
import type { League, Manager, Season } from "../types";

/**
 * Cross-season checks against Yahoo's league-wide pages (All Time tab and
 * Record Book), captured once from the 2025 season.
 */
const dir = join(process.cwd(), "data", "leagues", "caboclo");
const seasons: Season[] = readdirSync(dir)
  .filter((f) => /^\d{4}\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")))
  .sort((a, b) => a.year - b.year);
const managers: Manager[] = JSON.parse(readFileSync(join(dir, "managers.json"), "utf8"));
const league: League = { name: "caboclo", source: "yahoo", managers, seasons };

// From raw/league/alltime.txt: Yahoo season year -> [1st, 2nd, 3rd] team names.
const podium: Record<number, [string, string, string]> = {
  2025: ["Baby-Faced Assassin", "Mad Maxey", "Ain't No Jokic"],
  2024: ["WemBangYaMama", "Two Time 🥈", "We did it WE DID ITTTTTTTTTTTT"],
  2023: ["Jimmy BUMtler 👑", "Daddy Doncic", "Sunday Strangler"],
  2022: ["King & Giannis", "James James", "Tatum or Leave 'Em"],
  2021: ["BIG papa", "Masai Jr", "SSJ3 Lebron"],
  2020: ["BIG papa", "SSJ3 Lebron", "Joe"],
  2018: ["Klaw Leonard", "Skip", "Suck my Doncic"],
};

describe("Caboclo Cup, all seasons", () => {
  it("has every season Yahoo lists, and no 2019", () => {
    expect(seasons.map((s) => s.year - 1)).toEqual([2018, 2020, 2021, 2022, 2023, 2024, 2025]);
  });

  it("every team belongs to a known manager", () => {
    const ids = new Set(managers.map((m) => m.id));
    for (const s of seasons) for (const t of s.teams) expect(ids.has(t.managerId), `${s.year} ${t.name}`).toBe(true);
  });

  it.each(Object.entries(podium))("Yahoo %s podium matches our final ranks", (yahooYear, names) => {
    const season = seasons.find((s) => s.year === Number(yahooYear) + 1)!;
    const o = seasonOutcome(season);
    const byRank = [...o.finalRank.entries()].sort((a, b) => a[1] - b[1]).slice(0, 3);
    const teams = teamIndex(season);
    expect(byRank.map(([id]) => teams.get(id)!.name)).toEqual(names);
  });

  it("record book: most matchup victories in a season, all time = Klaw Leonard, 17", () => {
    let best = { name: "", wins: 0 };
    for (const s of seasons) {
      const teams = teamIndex(s);
      const wins = new Map<string, number>();
      for (const m of s.matchups) {
        const w = matchupWinner(m);
        if (w) wins.set(w, (wins.get(w) ?? 0) + 1);
      }
      // Yahoo's record book counts a first-round playoff bye as a matchup victory.
      const inQuarterfinal = new Set(
        s.matchups.filter((m) => m.stage === "quarterfinal").flatMap((m) => [m.homeTeamId, m.awayTeamId]),
      );
      if (inQuarterfinal.size > 0) {
        for (const m of s.matchups.filter((x) => x.stage === "semifinal")) {
          for (const id of [m.homeTeamId, m.awayTeamId]) if (!inQuarterfinal.has(id)) wins.set(id, (wins.get(id) ?? 0) + 1);
        }
      }
      for (const [id, n] of wins) if (n > best.wins) best = { name: teams.get(id)!.name, wins: n };
    }
    expect(best).toEqual({ name: "Klaw Leonard", wins: 17 });
  });

  // Record Book > Head-to-Head and Margins, captured from the 2025 season (raw/league/recordbook-*.txt).
  // "2025" there is Yahoo's season year: our 2025-26.
  it("record book: longest regular-season streaks = Mad Maxey W10 (weeks 2-11), Russell WestBrick L10 (weeks 9-18)", () => {
    expect(longestStreaks(league, "W", 1)[0]).toMatchObject({ teamName: "Mad Maxey", label: "2025-26", length: 10, fromWeek: 2, toWeek: 11 });
    expect(longestStreaks(league, "L", 1)[0]).toMatchObject({ teamName: "Russell WestBrick", label: "2021-22", length: 10, fromWeek: 9, toWeek: 18 });
  });

  it("record book: the five 9-0 weeks, all time", () => {
    expect(sweeps(league).map((r) => `${r.label} wk${r.week} ${r.winnerTeam} vs ${r.loserTeam}`).sort()).toEqual([
      "2018-19 wk15 Jordan Over LeBum vs Vince Carter's Nuts",
      "2021-22 wk11 Masai Jr vs Redemption SZN",
      "2022-23 wk14 BIG papa vs Daddy Doncic",
      "2024-25 wk7 Two Time 🥈 vs We did it WE DID ITTTTTTTTTTTT",
      "2025-26 wk3 Baby-Faced Assassin vs Melo and the Silver Seekers",
    ]);
  });

  it("record book: most category wins and losses in a season", () => {
    const rows = seasons.flatMap((s) => seasonStandings(s).map((r) => ({ ...r, label: s.label })));
    const most = (k: "catWins" | "catLosses", from = rows) => {
      const max = Math.max(...from.map((r) => r[k]));
      return [max, from.filter((r) => r[k] === max).map((r) => r.teamName).sort()];
    };
    expect(most("catWins")).toEqual([109, ["Mad Maxey"]]);
    // Yahoo labels this one "Season 2025", but Vince Carter's Nuts is the 2018-19 team.
    expect(most("catLosses")).toEqual([108, ["Vince Carter's Nuts"]]);
    expect(most("catLosses", rows.filter((r) => r.label === "2025-26"))).toEqual([99, ["Day to Davis", "Sweet Home Wembanyama"]]);
  });

  it("record book: season-average margins of victory and defeat", () => {
    const rows = marginAverages(league);
    const top = (k: "avgWinMargin" | "avgLossMargin", dir: 1 | -1, label?: string) =>
      rows.filter((r) => r[k] !== null && (!label || r.label === label)).sort((a, b) => dir * (b[k]! - a[k]!))[0];
    // Exact matches with Yahoo.
    expect(top("avgWinMargin", 1, "2025-26")).toMatchObject({ teamName: "Mad Maxey" });
    expect(top("avgWinMargin", 1, "2025-26").avgWinMargin).toBeCloseTo(4.31, 2);
    expect(top("avgWinMargin", -1, "2025-26")).toMatchObject({ teamName: "Day to Davis" });
    expect(top("avgWinMargin", -1, "2025-26").avgWinMargin).toBeCloseTo(1.83, 2);
    expect(top("avgLossMargin", 1, "2025-26")).toMatchObject({ teamName: "After all that🤪" });
    expect(top("avgLossMargin", 1, "2025-26").avgLossMargin).toBeCloseTo(3.67, 2);
    expect(top("avgLossMargin", 1)).toMatchObject({ teamName: "BACK to BACK" });
    expect(top("avgLossMargin", 1).avgLossMargin).toBeCloseTo(4.22, 2);
    expect(top("avgLossMargin", -1)).toMatchObject({ teamName: "P Giddey" });
    expect(top("avgLossMargin", -1).avgLossMargin).toBeCloseTo(1.3, 2);
    // Same record holder, different value: Yahoo also counts consolation-bracket games, which are not captured
    // (Yahoo: Russell WestBrick 4.5, Sunday Strangler 1.67 all time; Sunday Strangler 1.73 in 2025).
    expect(top("avgWinMargin", 1).teamName).toBe("Russell WestBrick");
    expect(top("avgWinMargin", -1).teamName).toBe("Sunday Strangler");
    expect(top("avgLossMargin", -1, "2025-26").teamName).toBe("Sunday Strangler");
  });
});
