import { describe, expect, it } from "vitest";
import { cabocloProvider } from "../data/caboclo";
import { generateDemoLeague } from "../data/demo/generate";
import { lastWeeks } from "./managerView";
import { seasonRace } from "./race";
import { seasonOutcome, seasonStandings } from "./season";
import { seasonWeeks, teamForm, weekView } from "./weeksView";

describe("week view helpers", () => {
  it("covers every week of every season, regular and playoff", async () => {
    for (const league of [await cabocloProvider.getLeague(), generateDemoLeague()]) {
      for (const season of league.seasons) {
        const weeks = seasonWeeks(season);
        expect(weeks.map((w) => w.week)).toEqual([...new Set(season.matchups.map((m) => m.week))].sort((a, b) => a - b));
        // Regular weeks come first and match the standings race.
        expect(weeks.filter((w) => !w.playoff).map((w) => w.week)).toEqual(seasonRace(season).weeks);
        for (const w of weeks) {
          const v = weekView(season, w.week)!;
          expect(v.games.length).toBe(season.matchups.filter((m) => m.week === w.week).length);
          expect(v.standings === null).toBe(w.playoff);
        }
        expect(weekView(season, 999)).toBeNull();
      }
    }
  });

  it("standings after a week are seasonStandings through that week, with movement from the race", async () => {
    const league = await cabocloProvider.getLeague();
    for (const season of league.seasons) {
      const race = seasonRace(season);
      race.weeks.forEach((wk, i) => {
        const v = weekView(season, wk)!;
        const truth = seasonStandings(season, { throughWeek: wk });
        expect(v.standings!.map((r) => r.teamId)).toEqual(truth.map((r) => r.teamId));
        for (const r of v.standings!) {
          const l = race.lines.find((x) => x.teamId === r.teamId)!;
          expect(r.rank).toBe(l.ranks[i]);
          expect(r.move).toBe(i === 0 ? null : l.ranks[i - 1] - l.ranks[i]);
          expect(r.form.length).toBeLessThanOrEqual(5);
          expect(r.form.every((g) => g.week <= wk)).toBe(true);
        }
      });
      // Final regular week = the official order.
      const last = weekView(season, race.weeks.at(-1)!)!;
      expect(last.standings!.map((r) => r.teamId)).toEqual(seasonOutcome(season).standings.map((r) => r.teamId));
    }
  });

  it("tiles: blowout is the widest decided margin, upsets need the lower team to win", async () => {
    const league = await cabocloProvider.getLeague();
    for (const season of league.seasons) {
      for (const { week } of seasonWeeks(season)) {
        const v = weekView(season, week)!;
        const decided = v.games.filter((g) => g.winnerTeamId);
        if (v.blowout) expect(v.blowout.margin).toBe(Math.max(...decided.map((g) => g.margin)));
        expect(v.closest!.margin).toBe(Math.min(...v.games.map((g) => g.margin)));
        expect(v.tiedCats).toBe(season.matchups.filter((m) => m.week === week).reduce((s, m) => s + m.tiedCats, 0));
        for (const g of v.games) {
          if (!g.upset) continue;
          const [w, l] = g.winnerTeamId === g.home.teamId ? [g.home, g.away] : [g.away, g.home];
          expect(w.rankBefore!).toBeGreaterThan(l.rankBefore!);
        }
        if (!v.hasRanksBefore) expect(v.upset).toBeNull();
      }
    }
  });

  it("team form matches the manager page's last-five weeks", async () => {
    const league = await cabocloProvider.getLeague();
    const season = league.seasons.at(-1)!;
    for (const t of season.teams) expect(teamForm(season, t.id)).toEqual(lastWeeks(league, t.managerId)[season.year]);
  });
});
