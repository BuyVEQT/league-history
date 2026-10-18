/**
 * Exports every number the redesign prototype shows, computed by the site's own
 * analytics (src/lib/analytics). Run: npx tsx scripts/export-design-data.ts <out.json>
 *
 * A few small view helpers that the site doesn't compute yet live under
 * "PROTOTYPE-ONLY METRICS" — design/HANDOFF.md asks for them to be moved into
 * src/lib/analytics with tests.
 */
import { writeFileSync } from "node:fs";
import { cabocloProvider } from "../src/lib/data/caboclo";
import { careerStats, managerSeasons } from "../src/lib/analytics/career";
import { winPct } from "../src/lib/analytics/format";
import { h2hMatrix } from "../src/lib/analytics/headToHead";
import { championHistory } from "../src/lib/analytics/overview";
import { consistency, marginRecords, parity, playoffRecords, seedHistory, standingPct, teamSeasons, titleDroughts } from "../src/lib/analytics/records";
import { matchupWinner, seasonOutcome, seasonStandings, teamIndex } from "../src/lib/analytics/season";
import {
  draftImpact, draftPositions, draftSlotHistory, favouritePlayers, finishByDraftSlot, gotAway, keepRates, leaguePicks, managerDraftStats, reachStats,
} from "../src/lib/analytics/draft";
import { activityVsFinish, leagueTrades, managerActivity, undraftedGems } from "../src/lib/analytics/trades";
import { eloRatings, ELO } from "../src/lib/analytics/elo";
import { raceRecords, seasonRace } from "../src/lib/analytics/race";
import { careerLuck, leagueAlternates, matchupLuck } from "../src/lib/analytics/whatIf";
import { marginAverages, scorelines, sweeps } from "../src/lib/analytics/scorelines";
import { longestStreaks, managerStreaks } from "../src/lib/analytics/streaks";
import { namesakes, rosterProfiles, unownedStars, PUNT_Z } from "../src/lib/analytics/players";
import { VALUE_SCALE } from "../src/lib/analytics/value";
import type { Season } from "../src/lib/types";

const r3 = (n: number | null | undefined) => (n == null ? null : Math.round(n * 1000) / 1000);
const r1 = (n: number | null | undefined) => (n == null ? null : Math.round(n * 10) / 10);

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
  const mgrOf = (s: Season) => { const t = teamIndex(s); return (id: string) => t.get(id)!.managerId; };

  // ---- Seasons ----
  const seasons = league.seasons.map((s) => {
    const o = seasonOutcome(s);
    const teams = teamIndex(s);
    const standings = o.standings.map((r) => ({
      teamId: r.teamId, managerId: r.managerId, team: r.teamName, rank: r.rank,
      w: r.wins, l: r.losses, t: r.ties, cw: r.catWins, cl: r.catLosses, ct: r.catTies,
      catPct: r3(standingPct(s, r)), final: o.finalRank.get(r.teamId)!, playoffs: o.playoffTeamIds.has(r.teamId),
      moves: s.activity?.[r.teamId]?.moves ?? null, trades: s.activity?.[r.teamId]?.trades ?? null,
    }));
    const matchups = s.matchups.map((m) => ({
      wk: m.week, st: m.stage, h: teams.get(m.homeTeamId)!.managerId, a: teams.get(m.awayTeamId)!.managerId,
      hc: m.homeCats, ac: m.awayCats, tc: m.tiedCats,
      win: (() => { const w = matchupWinner(m); return w ? teams.get(w)!.managerId : null; })(),
    }));
    // Standings race (site: seasonRace) — ranks after every regular week, plus storylines.
    const race = seasonRace(s);
    const own = mgrOf(s);
    const raceOut = {
      weeks: race.weeks, spots: race.spots,
      lines: race.lines.map((l) => ({ m: l.managerId, team: l.teamName, ranks: l.ranks, seed: l.seed, final: l.finalRank, po: l.madePlayoffs, first: l.weeksInFirst })),
      comebacks: race.comebacks.map((c) => ({ m: c.managerId, rank: c.rank, wk: c.week, seed: c.seed, final: c.finalRank })),
      collapses: race.collapses.map((c) => ({ m: c.managerId, rank: c.rank, wk: c.week, seed: c.seed, final: c.finalRank })),
      lastWeekOut: race.lastWeekOut.map(own), lastWeekIn: race.lastWeekIn.map(own),
    };
    const rp = rosterProfiles(s);
    const roster = rp && {
      categories: rp.categories, n: rp.playersPerTeam,
      rows: rp.rows.map((r) => ({ m: r.managerId, team: r.teamName, z: Object.fromEntries(Object.entries(r.z).map(([k, v]) => [k, r3(v)])), punts: r.punts, final: r.finalRank })),
    };
    return {
      year: s.year, label: s.label, categories: s.categories, teamCount: s.teams.length,
      champion: o.championTeamId ? teams.get(o.championTeamId)!.managerId : null,
      runnerUp: o.runnerUpTeamId ? teams.get(o.runnerUpTeamId)!.managerId : null,
      playoffTeams: o.playoffTeamIds.size, standings, matchups, race: raceOut, roster,
    };
  });

  // ---- Careers ----
  const careers = careerStats(league).map((c) => ({
    ...c,
    catPct: r3(winPct(c.catWins, c.catLosses, c.catTies)),
    winPct: r3(c.winPct), avgFinish: r3(c.avgFinish), playoffPct: r3(c.playoffPct),
    seasonsList: managerSeasons(league, c.managerId).map((s) => ({
      year: s.year, team: s.teamName, rank: s.regularRank, final: s.finalRank, n: s.teamCount, result: s.playoffResult,
      w: s.wins, l: s.losses, t: s.ties, cw: s.catWins, cl: s.catLosses, ct: s.catTies,
      catPct: r3(winPct(s.catWins, s.catLosses, s.catTies)),
    })),
    streaks: (() => { const st = managerStreaks(league, c.managerId); const f = (x: typeof st.win) => x && { n: x.length, year: x.year, from: x.fromWeek, to: x.toWeek, team: x.teamName }; return { win: f(st.win), loss: f(st.loss) }; })(),
  }));

  // ---- Elo power ratings (site: eloRatings) ----
  const elo = eloRatings(league);
  const eloOut = {
    params: ELO,
    predictiveSkill: r3(elo.predictiveSkill),
    current: elo.current.map((c) => ({ m: c.managerId, r: Math.round(c.rating) })),
    seasonEnd: Object.fromEntries(Object.entries(elo.seasonEnd).map(([y, row]) => [y, Object.fromEntries(Object.entries(row).map(([m, r]) => [m, Math.round(r)]))])),
    peak: Object.fromEntries(Object.entries(elo.peak).map(([m, p]) => [m, { r: Math.round(p.rating), year: p.year, wk: p.week }])),
    history: Object.fromEntries(Object.entries(elo.history).map(([m, pts]) => [m, pts.map((p) => [p.year, p.week, Math.round(p.rating)])])),
  };

  // ---- PROTOTYPE-ONLY METRICS (move into src/lib/analytics with tests) ----
  // Every weekly matchup from each manager's side, chronological.
  type Game = { year: number; wk: number; st: string; me: string; opp: string; my: number; their: number; tied: number; res: "W" | "L" | "T" };
  const games: Game[] = [];
  for (const s of seasons) for (const m of s.matchups) {
    for (const [me, opp, my, their] of [[m.h, m.a, m.hc, m.ac], [m.a, m.h, m.ac, m.hc]] as const) {
      games.push({ year: s.year, wk: m.wk, st: m.st, me, opp, my, their, tied: m.tc, res: m.win === null ? "T" : m.win === me ? "W" : "L" });
    }
  }
  games.sort((a, b) => a.year - b.year || a.wk - b.wk);
  // Weekly profile: average categories won, sweeps for/against, distribution of categories won (0-9).
  const weekly = managers.map((m) => {
    const g = games.filter((x) => x.me === m.id);
    if (!g.length) return null;
    return {
      managerId: m.id, games: g.length, avgCats: r3(g.reduce((a, x) => a + x.my, 0) / g.length),
      sweeps: g.filter((x) => x.my === 9).length, swept: g.filter((x) => x.their === 9).length,
      dist: Array.from({ length: 10 }, (_, k) => g.filter((x) => x.my === k).length),
    };
  }).filter(Boolean);
  // All-time race frames: cumulative values at the end of each season.
  const race = seasons.map((s) => ({
    year: s.year, label: s.label,
    rows: managers.map((m) => {
      const upTo = careers.find((c) => c.managerId === m.id)?.seasonsList.filter((x) => x.year <= s.year) ?? [];
      return { managerId: m.id, catWins: upTo.reduce((a, x) => a + x.cw, 0), wins: upTo.reduce((a, x) => a + x.w, 0), titles: upTo.filter((x) => x.final === 1).length, podiums: upTo.filter((x) => x.final <= 3).length, seasons: upTo.length, elo: eloOut.seasonEnd[s.year]?.[m.id] ?? null };
    }).filter((r) => r.seasons > 0),
  }));
  // One-category games, regular season.
  const heartbreaks = managers.map((m) => {
    const g = games.filter((x) => x.me === m.id && x.st === "regular");
    return { managerId: m.id, oneCatLosses: g.filter((x) => x.res === "L" && x.their - x.my === 1).length, oneCatWins: g.filter((x) => x.res === "W" && x.my - x.their === 1).length };
  }).filter((r) => r.oneCatLosses + r.oneCatWins > 0);

  const picks = leaguePicks(league);
  const reach = reachStats(league);
  const keeps = keepRates(league);
  const impact = draftImpact(league);

  const out = {
    generatedFrom: "src/lib/analytics via scripts/export-design-data.ts",
    league: { name: league.name, firstLabel: seasons[0].label, lastLabel: seasons.at(-1)!.label },
    problems, managers, seasons, careers,
    champions: championHistory(league),
    h2h: h2hMatrix(league),
    elo: eloOut,
    ratings: league.ratings ?? null,
    records: {
      playoffs: playoffRecords(league).map((r) => ({ ...r, avgSeed: r3(r.avgSeed), avgFinish: r3(r.avgFinish), avgOverSeed: r3(r.avgOverSeed) })),
      droughts: titleDroughts(league),
      margins: marginRecords(league),
      teamSeasons: teamSeasons(league).map((r) => ({ ...r, pct: r3(r.pct) })),
      consistency: consistency(league).map((r) => ({ ...r, avgPercentile: r3(r.avgPercentile), spread: r3(r.spread) })),
      seeds: seedHistory(league),
      parity: parity(league).map((p) => ({ ...p, spread: r3(p.spread), best: r3(p.best), worst: r3(p.worst), bubbleGap: r3(p.bubbleGap) })),
      streaks: { win: longestStreaks(league, "W", 8), loss: longestStreaks(league, "L", 8) },
      race: (() => { const rr = raceRecords(league); return { frontRunners: rr.frontRunners.slice(0, 8), comebacks: rr.comebacks, collapses: rr.collapses, heartbreaks: rr.heartbreaks }; })(),
      alternates: leagueAlternates(league).map((a) => ({
        year: a.year, label: a.label, method: a.method, altMethod: a.altMethod, spots: a.spots,
        out: a.out.map((r) => ({ m: r.managerId, team: r.teamName, rank: r.rank })), in: a.in.map((r) => ({ m: r.managerId, team: r.teamName, rank: r.rank })),
        actualTop: { m: a.actualTop.managerId, team: a.actualTop.teamName }, altTop: { m: a.altTop.managerId, team: a.altTop.teamName },
        finalistsOut: a.finalistsOut.map(mgrOf(league.seasons.find((s) => s.year === a.year)!)),
      })),
      luck: matchupLuck(league).map((r) => ({ year: r.year, label: r.label, m: r.managerId, team: r.teamName, games: r.games, actual: r.actual, expected: r3(r.expected), luck: r3(r.luck) })),
      careerLuck: careerLuck(league).map((r) => ({ ...r, luck: r3(r.luck) })),
      scorelines: scorelines(league),
      sweeps: sweeps(league),
      dominant: marginAverages(league).filter((r) => r.wins >= 5 && r.avgWinMargin !== null).sort((a, b) => b.avgWinMargin! - a.avgWinMargin!).slice(0, 8).map((r) => ({ ...r, avgWinMargin: r3(r.avgWinMargin), avgLossMargin: r3(r.avgLossMargin) })),
      namesakes: namesakes(league),
    },
    draft: {
      valueScale: VALUE_SCALE,
      picks: picks.map((p) => ({ y: p.year, rd: p.round, pk: p.pick, ov: p.overall, m: p.managerId, p: p.playerName, ar: p.actualRank, pr: p.preseasonRank, v: r1(p.value) })),
      managers: managerDraftStats(league).map((g) => ({
        managerId: g.managerId, drafts: g.drafts, picks: g.picks, avgValue: r3(g.avgValue), vsLeague: r3(g.vsLeague), hitRate: r3(g.hitRate),
        coreAvgRank: r3(g.coreAvgRank), coreAvgSlot: r3(g.coreAvgSlot), gems: g.gems,
        best: { p: g.best.playerName, y: g.best.label, v: r1(g.best.value), ov: g.best.overall, ar: g.best.actualRank },
        worst: { p: g.worst.playerName, y: g.worst.label, v: r1(g.worst.value), ov: g.worst.overall, ar: g.worst.actualRank },
      })),
      slotHistory: draftSlotHistory(league).map((h) => ({ year: h.year, label: h.label, n: h.teamCount, first: { p: h.firstPick.playerName, m: h.firstPick.managerId, ar: h.firstPick.actualRank }, firstTeamFinish: h.firstPickTeamFinish, champ: h.championManagerId, champSlot: h.championSlot })),
      bySlot: finishByDraftSlot(league).map((s) => ({ ...s, avgFinish: r3(s.avgFinish) })),
      positions: draftPositions(league).map((r) => ({ ...r, avgSlot: r3(r.avgSlot), avgSlotShare: r3(r.avgSlotShare) })),
      impact: impact && { teamSeasons: impact.teamSeasons, r: r3(impact.correlation), r2: r3(impact.correlation ** 2) },
      reach: reach && { ...reach, rows: reach.rows.map((r) => ({ ...r, avgEarly: r1(r.avgEarly), reachShare: r3(r.reachShare) })), groups: reach.groups.map((g) => ({ ...g, beatRate: r3(g.beatRate) })) },
      keeps: { correlation: r3(keeps.correlation), rows: keeps.rows.map((r) => ({ ...r, avgKept: r1(r.avgKept), keptShare: r3(r.keptShare) })) },
      favourites: favouritePlayers(league).map((f) => ({ m: f.managerId, p: f.playerName, picks: f.picks.map((p) => ({ y: p.year, rd: p.round, ov: p.overall, ar: p.actualRank, v: r1(p.value) })) })),
      gotAway: gotAway(league),
    },
    trades: {
      list: leagueTrades(league).map((t) => ({ year: t.year, label: t.label, date: t.date, status: t.status, winner: t.winnerManagerId, margin: r1(t.margin), sides: t.sides.map((s) => ({ m: s.managerId, team: s.teamName, value: r1(s.value), players: s.players.map((p) => ({ n: p.name, r: p.actualRank })) })) })),
      activity: managerActivity(league).map((a) => ({ ...a, netValue: r1(a.netValue) })),
      undrafted: undraftedGems(league),
      unowned: unownedStars(league),
      vsFinish: activityVsFinish(league),
    },
    extra: { weekly, race, heartbreaks, puntZ: PUNT_Z },
  };
  const path = process.argv[2] ?? "design/data.json";
  writeFileSync(path, JSON.stringify(out));
  console.log(`wrote ${path} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB); data problems: ${problems.length ? problems.join("; ") : "none"}`);
}

main();
