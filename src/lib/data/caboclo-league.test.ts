import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchupWinner, seasonOutcome, teamIndex } from "../analytics/season";
import type { Manager, Season } from "../types";

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

  it("record book: longest regular-season win streak, all time = Mad Maxey, 10 (2025, weeks 2-11)", () => {
    let best = { name: "", streak: 0 };
    for (const s of seasons) {
      const teams = teamIndex(s);
      for (const t of s.teams) {
        const games = s.matchups
          .filter((m) => m.stage === "regular" && (m.homeTeamId === t.id || m.awayTeamId === t.id))
          .sort((a, b) => a.week - b.week);
        let run = 0;
        for (const g of games) {
          run = matchupWinner(g) === t.id ? run + 1 : 0;
          if (run > best.streak) best = { name: teams.get(t.id)!.name, streak: run };
        }
      }
    }
    expect(best).toEqual({ name: "Mad Maxey", streak: 10 });
  });
});
