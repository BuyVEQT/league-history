/**
 * Exports every number the redesign prototype shows, computed by the site's own
 * analytics (src/lib/analytics). Run: npx tsx scripts/export-design-data.ts <out.json>
 *
 * New metrics that the site doesn't compute yet live in this file under
 * "NEW METRICS" — the handoff (design/HANDOFF.md) asks for them to be moved into
 * src/lib/analytics with tests.
 */
import { writeFileSync } from "node:fs";
import { cabocloProvider } from "../src/lib/data/caboclo";
import { careerStats, managerSeasons } from "../src/lib/analytics/career";
import { winPct } from "../src/lib/analytics/format";
import { h2hMatrix } from "../src/lib/analytics/headToHead";
import { championHistory } from "../src/lib/analytics/overview";
import { consistency, marginRecords, playoffRecords, schedules, standingPct, teamSeasons, titleDroughts } from "../src/lib/analytics/records";
import { matchupWinner, seasonOutcome, seasonStandings, teamIndex } from "../src/lib/analytics/season";
import { draftSlotHistory, finishByDraftSlot, leaguePicks, managerDraftStats } from "../src/lib/analytics/draft";
import { activityVsFinish, leagueTrades, managerActivity, undraftedGems } from "../src/lib/analytics/trades";
import type { Season } from "../src/lib/types";

const r2 = (n: number | null) => (n === null ? null : Math.round(n * 1000) / 1000);

async function main() {
  const league = await cabocloProvider.getLeague();
  const problems: string[] = [];

  // ---- Data checks (same as src/lib/data/caboclo.test.ts, which needs vitest) ----
  for (const s of league.seasons as (Season & { verification?: { categoryRecords: Record<string, string>; playoffSeeds: string[] } })[]) {
    const v = s.verification;
    if (!v) continue;
    for (const row of seasonStandings(s)) {
      const got = `${row.catWins}-${row.catLosses}-${row.catTies}`;
      if (got !== v.categoryRecords[row.teamId]) problems.push(`${s.label} ${row.teamName}: ${got} vs Yahoo ${v.categoryRecords[row.teamId]}`);
    }
    const seeds = seasonStandings(s).slice(0, v.playoffSeeds.length).map((r) => r.teamId);
    if (seeds.join() !== v.playoffSeeds.join()) problems.push(`${s.label} seeds differ`);
  }

  const managers = league.managers.map((m) => ({ id: m.id, name: m.name }));

  // ---- Seasons ----
  const seasons = league.seasons.map((s) => {
    const o = seasonOutcome(s);
    const teams = teamIndex(s);
    const standings = o.standings.map((r) => ({
      teamId: r.teamId,
      managerId: r.managerId,
      team: r.teamName,
      rank: r.rank,
      w: r.wins, l: r.losses, t: r.ties,
      cw: r.catWins, cl: r.catLosses, ct: r.catTies,
      catPct: r2(standingPct(s, r)),
      final: o.finalRank.get(r.teamId)!,
      playoffs: o.playoffTeamIds.has(r.teamId),
      moves: s.activity?.[r.teamId]?.moves ?? null,
      trades: s.activity?.[r.teamId]?.trades ?? null,
    }));
    const matchups = s.matchups.map((m) => ({
      wk: m.week, st: m.stage, h: teams.get(m.homeTeamId)!.managerId, a: teams.get(m.awayTeamId)!.managerId,
      hc: m.homeCats, ac: m.awayCats, tc: m.tiedCats,
      win: (() => { const w = matchupWinner(m); return w ? teams.get(w)!.managerId : null; })(),
    }));
    return {
      year: s.year, label: s.label, categories: s.categories, teamCount: s.teams.length,
      champion: o.championTeamId ? teams.get(o.championTeamId)!.managerId : null,
      runnerUp: o.runnerUpTeamId ? teams.get(o.runnerUpTeamId)!.managerId : null,
      playoffTeams: o.playoffTeamIds.size,
      standings, matchups,
    };
  });

  // ---- Careers ----
  const careers = careerStats(league).map((c) => ({
    ...c,
    catPct: r2(winPct(c.catWins, c.catLosses, c.catTies)),
    winPct: r2(c.winPct), avgFinish: r2(c.avgFinish), playoffPct: r2(c.playoffPct),
    seasonsList: managerSeasons(league, c.managerId).map((s) => ({
      year: s.year, team: s.teamName, rank: s.regularRank, final: s.finalRank, n: s.teamCount, result: s.playoffResult,
      w: s.wins, l: s.losses, t: s.ties, cw: s.catWins, cl: s.catLosses, ct: s.catTies,
      catPct: r2(winPct(s.catWins, s.catLosses, s.catTies)),
    })),
  }));

  // ---- NEW METRICS ----
  // Chronological weekly results for each manager (all stages), used for streaks and the race.
  type Game = { year: number; wk: number; st: string; me: string; opp: string; my: number; their: number; tied: number; res: "W" | "L" | "T" };
  const games: Game[] = [];
  for (const s of seasons) for (const m of s.matchups) {
    for (const [me, opp, my, their] of [[m.h, m.a, m.hc, m.ac], [m.a, m.h, m.ac, m.hc]] as const) {
      games.push({ year: s.year, wk: m.wk, st: m.st, me, opp, my, their, tied: m.tc, res: m.win === null ? "T" : m.win === me ? "W" : "L" });
    }
  }
  games.sort((a, b) => a.year - b.year || a.wk - b.wk);

  // Longest matchup win / loss streaks, regular season + playoffs, carried across seasons.
  const streaks = managers.map((m) => {
    const g = games.filter((x) => x.me === m.id);
    let best = { n: 0, from: "", to: "" }, worst = { n: 0, from: "", to: "" };
    let cur = 0, curFrom = "", kind: "W" | "L" | "T" | null = null;
    for (const x of g) {
      const tag = `${x.year}:${x.wk}`;
      if (x.res === kind && x.res !== "T") cur++; else { cur = 1; curFrom = tag; kind = x.res; }
      if (kind === "W" && cur > best.n) best = { n: cur, from: curFrom, to: tag };
      if (kind === "L" && cur > worst.n) worst = { n: cur, from: curFrom, to: tag };
    }
    return { managerId: m.id, win: best, loss: worst };
  }).filter((s) => games.some((g) => g.me === s.managerId));

  // Per-manager weekly profile: average categories won, sweeps (9-0), close games.
  const weekly = managers.map((m) => {
    const g = games.filter((x) => x.me === m.id);
    if (!g.length) return null;
    return {
      managerId: m.id, games: g.length,
      avgCats: r2(g.reduce((a, x) => a + x.my, 0) / g.length),
      sweeps: g.filter((x) => x.my === 9).length,
      swept: g.filter((x) => x.their === 9).length,
      // Score distribution: how often they won 0..9 categories in a week
      dist: Array.from({ length: 10 }, (_, k) => g.filter((x) => x.my === k).length),
    };
  }).filter(Boolean);

  // Bar race: cumulative values at the end of each season.
  const race = seasons.map((s) => ({
    year: s.year, label: s.label,
    rows: managers.map((m) => {
      const upTo = careers.find((c) => c.managerId === m.id)?.seasonsList.filter((x) => x.year <= s.year) ?? [];
      return {
        managerId: m.id,
        catWins: upTo.reduce((a, x) => a + x.cw, 0),
        wins: upTo.reduce((a, x) => a + x.w, 0),
        titles: upTo.filter((x) => x.final === 1).length,
        podiums: upTo.filter((x) => x.final <= 3).length,
        seasons: upTo.length,
      };
    }).filter((r) => r.seasons > 0),
  }));

  // "Luck": each team's category win % vs the % it would have had playing every other team each week
  // is NOT computable (no per-category stats). What IS computable: the gap between a team's
  // category win % rank and its matchup-win rank, and points left on the table in 4-5 losses.
  const heartbreaks = managers.map((m) => {
    const g = games.filter((x) => x.me === m.id && x.st === "regular");
    return { managerId: m.id, oneCatLosses: g.filter((x) => x.res === "L" && x.their - x.my === 1).length, oneCatWins: g.filter((x) => x.res === "W" && x.my - x.their === 1).length };
  }).filter((r) => r.oneCatLosses + r.oneCatWins > 0);

  const out = {
    generatedFrom: "src/lib/analytics via scripts/export-design-data.ts",
    league: { name: league.name, firstLabel: seasons[0].label, lastLabel: seasons.at(-1)!.label },
    problems,
    managers,
    seasons,
    careers,
    champions: championHistory(league),
    h2h: h2hMatrix(league),
    records: {
      playoffs: playoffRecords(league).map((r) => ({ ...r, avgSeed: r2(r.avgSeed), avgFinish: r2(r.avgFinish), avgOverSeed: r2(r.avgOverSeed) })),
      droughts: titleDroughts(league),
      margins: marginRecords(league),
      teamSeasons: teamSeasons(league).map((r) => ({ ...r, pct: r2(r.pct) })),
      consistency: consistency(league).map((r) => ({ ...r, avgPercentile: r2(r.avgPercentile), spread: r2(r.spread) })),
      schedules: schedules(league).map((r) => ({ ...r, oppPct: r2(r.oppPct) })),
    },
    draft: {
      picks: leaguePicks(league).map((p) => ({ y: p.year, rd: p.round, pk: p.pick, ov: p.overall, m: p.managerId, p: p.playerName, ar: p.actualRank, pr: p.preseasonRank, v: p.value })),
      managers: managerDraftStats(league).map((g) => ({
        managerId: g.managerId, drafts: g.drafts, picks: g.picks, avgValue: r2(g.avgValue), vsLeague: r2(g.vsLeague), hitRate: r2(g.hitRate),
        coreAvgRank: r2(g.coreAvgRank), coreAvgSlot: r2(g.coreAvgSlot), gems: g.gems,
        best: { p: g.best.playerName, y: g.best.label, v: g.best.value, ov: g.best.overall, ar: g.best.actualRank },
        worst: { p: g.worst.playerName, y: g.worst.label, v: g.worst.value, ov: g.worst.overall, ar: g.worst.actualRank },
      })),
      slotHistory: draftSlotHistory(league).map((h) => ({ year: h.year, label: h.label, n: h.teamCount, first: { p: h.firstPick.playerName, m: h.firstPick.managerId, ar: h.firstPick.actualRank }, firstTeamFinish: h.firstPickTeamFinish, champ: h.championManagerId, champSlot: h.championSlot })),
      bySlot: finishByDraftSlot(league).map((s) => ({ ...s, avgFinish: r2(s.avgFinish) })),
    },
    trades: {
      list: leagueTrades(league).map((t) => ({ year: t.year, label: t.label, date: t.date, status: t.status, winner: t.winnerManagerId, margin: t.margin, sides: t.sides.map((s) => ({ m: s.managerId, team: s.teamName, value: s.value, players: s.players.map((p) => ({ n: p.name, r: p.actualRank })) })) })),
      activity: managerActivity(league),
      undrafted: undraftedGems(league),
      vsFinish: activityVsFinish(league),
    },
    extra: { streaks, weekly, race, heartbreaks },
  };
  const path = process.argv[2] ?? "design/data.json";
  writeFileSync(path, JSON.stringify(out));
  console.log(`wrote ${path} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB); data problems: ${problems.length ? problems.join("; ") : "none"}`);
}

main();
