import type { League, ManagerId, Season } from "../types";
import { careerStats } from "./career";
import { managerDraftStats, seasonPicks } from "./draft";
import { formatPct, ordinal } from "./format";
import { goatScores } from "./goat";
import { seasonRace } from "./race";
import { consistency, titleDroughts } from "./records";
import { scoreline, sweeps } from "./scorelines";
import { seasonOutcome, teamIndex } from "./season";
import { longestStreaks } from "./streaks";
import { managerActivity, seasonTrades } from "./trades";
import { careerLuck, matchupLuck } from "./whatIf";

/** A superlative: who won it, the headline number and one line of context. */
export interface Award {
  title: string;
  icon: "trophy" | "star" | "rocket" | "heart" | "horseshoe" | "wave" | "broom" | "crown" | "road" | "swap" | "target" | "basement" | "shield" | "flame" | "bolt" | "clip";
  winners: ManagerId[];
  value: string;
  detail: string;
  gold?: boolean;
}

const signed = (n: number, digits = 1) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}`;
const top = <T,>(xs: T[], score: (x: T) => number): T | undefined => [...xs].sort((a, b) => score(b) - score(a))[0];

/** Season superlatives, in a fixed order. Awards a season has no data for are left out. */
export function seasonAwards(league: League, season: Season): Award[] {
  const outcome = seasonOutcome(season);
  const teams = teamIndex(season);
  const team = (id: string) => teams.get(id)!;
  const name = (id: ManagerId) => league.managers.find((m) => m.id === id)?.name ?? id;
  const out: (Award | null)[] = [];

  if (outcome.championTeamId) {
    const c = team(outcome.championTeamId);
    const ru = outcome.runnerUpTeamId ? team(outcome.runnerUpTeamId) : null;
    out.push({ title: "Champion", icon: "trophy", gold: true, winners: [c.managerId], value: c.name, detail: ru ? `Won the final over ${name(ru.managerId)}.` : "" });
  }
  const first = outcome.standings[0];
  if (first) {
    const cats = first.catWins + first.catLosses + first.catTies;
    out.push({
      title: "Regular-season MVP",
      icon: "star",
      winners: [first.managerId],
      value: season.scoring === "categories" ? formatPct((first.catWins + first.catTies / 2) / (cats || 1)) : `${first.wins}-${first.losses}-${first.ties}`,
      detail: `${first.teamName} · the #1 seed · finished ${ordinal(outcome.finalRank.get(first.teamId)!)}.`,
    });
  }
  const gains = outcome.standings.filter((r) => outcome.playoffTeamIds.has(r.teamId)).map((r) => ({ r, gain: r.rank - outcome.finalRank.get(r.teamId)! }));
  const riser = top(gains, (g) => g.gain);
  if (riser && riser.gain > 0) out.push({ title: "Cinderella", icon: "rocket", winners: [riser.r.managerId], value: `${ordinal(riser.r.rank)} → ${ordinal(outcome.finalRank.get(riser.r.teamId)!)}`, detail: `Climbed ${riser.gain} spots from their playoff seed.` });
  const faller = top(gains, (g) => -g.gain);
  if (faller && faller.gain < 0) out.push({ title: "Playoff heartbreak", icon: "heart", winners: [faller.r.managerId], value: `${ordinal(faller.r.rank)} → ${ordinal(outcome.finalRank.get(faller.r.teamId)!)}`, detail: `Dropped ${-faller.gain} spots from their seed in the playoffs.` });

  const luck = matchupLuck(league).filter((r) => r.year === season.year);
  const lucky = top(luck, (r) => r.luck);
  const unlucky = top(luck, (r) => -r.luck);
  if (lucky) out.push({ title: "Horseshoe", icon: "horseshoe", winners: [lucky.managerId], value: signed(lucky.luck), detail: `Won ${lucky.actual} matchups; their category totals said ${lucky.expected.toFixed(1)}.` });
  if (unlucky && unlucky !== lucky) out.push({ title: "Snake-bitten", icon: "wave", winners: [unlucky.managerId], value: signed(unlucky.luck), detail: `Won ${unlucky.actual} matchups; their category totals said ${unlucky.expected.toFixed(1)}.` });

  const sw = sweeps({ ...league, seasons: [season] });
  if (sw.length) {
    const counts = new Map<ManagerId, number>();
    for (const s of sw) counts.set(s.winnerManagerId, (counts.get(s.winnerManagerId) ?? 0) + 1);
    const [id, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push({ title: "Broom award", icon: "broom", winners: [id], value: `${n} × ${sw[0].score}`, detail: "Most perfect weeks this season." });
  }

  const race = seasonRace(season);
  const leader = top(race.lines, (l) => l.weeksInFirst);
  if (leader?.weeksInFirst) out.push({ title: "Front-runner", icon: "crown", winners: [leader.managerId], value: `${leader.weeksInFirst} weeks`, detail: `in first place, of ${race.weeks.length} · finished ${ordinal(leader.finalRank)}.` });
  const comeback = race.comebacks[0];
  if (comeback) out.push({ title: "Comeback of the year", icon: "road", winners: [comeback.managerId], value: `${ordinal(comeback.rank)} → ${ordinal(comeback.seed)}`, detail: `Sat ${ordinal(comeback.rank)} after week ${comeback.week}, made the playoffs, finished ${ordinal(comeback.finalRank)}.` });

  if (season.activity) {
    const [teamId, a] = Object.entries(season.activity).sort((x, y) => y[1].moves - x[1].moves)[0];
    out.push({ title: "Waiver warrior", icon: "swap", winners: [team(teamId).managerId], value: `${a.moves} moves`, detail: `Finished ${ordinal(outcome.finalRank.get(teamId)!)}.` });
  }

  const picks = seasonPicks(season);
  const steal = top(picks, (p) => p.value);
  if (steal) out.push({ title: "Steal of the draft", icon: "target", winners: [steal.managerId], value: steal.playerName, detail: `Taken #${steal.overall} (round ${steal.round}), finished ${steal.actualRank ? `#${steal.actualRank}` : "outside the top 300"} · ${signed(steal.value)}.` });
  const bust = top(picks.filter((p) => p.round <= 3), (p) => -p.value);
  if (bust) out.push({ title: "Bust of the year", icon: "basement", winners: [bust.managerId], value: bust.playerName, detail: `Taken #${bust.overall}, finished ${bust.actualRank ? `#${bust.actualRank}` : "outside the top 300"} · ${signed(bust.value)}.` });

  const heist = top(seasonTrades(season).filter((t) => t.status === "completed" && t.winnerManagerId), (t) => t.margin);
  if (heist) {
    const w = heist.sides.find((s) => s.managerId === heist.winnerManagerId)!;
    const l = heist.sides.find((s) => s.managerId !== heist.winnerManagerId)!;
    out.push({ title: "Heist of the year", icon: "shield", winners: [w.managerId], value: signed(heist.margin), detail: `Got ${w.players.map((p) => p.name).join(", ")} from ${name(l.managerId)} for ${l.players.map((p) => p.name).join(", ")}.` });
  }

  const blowout = top(season.matchups.filter((m) => m.stage === "regular"), (m) => Math.abs(m.homeCats - m.awayCats));
  if (blowout && blowout.homeCats !== blowout.awayCats) {
    const [w, l] = blowout.homeCats > blowout.awayCats ? [blowout.homeTeamId, blowout.awayTeamId] : [blowout.awayTeamId, blowout.homeTeamId];
    out.push({ title: "Biggest beatdown", icon: "flame", winners: [team(w).managerId], value: scoreline(blowout), detail: `Week ${blowout.week} over ${name(team(l).managerId)}.` });
  }
  return out.filter((a): a is Award => a !== null);
}

/** All-time superlatives across every season. */
export function allTimeAwards(league: League): Award[] {
  const careers = careerStats(league);
  const out: Award[] = [];
  const [goat, runnerUp] = goatScores(league);
  if (goat) out.push({ title: "The GOAT", icon: "crown", gold: true, winners: [goat.managerId], value: `${goat.score.toFixed(0)} / 100`, detail: `Best all-round career by GOAT score${runnerUp ? `; next is ${runnerUp.name} at ${runnerUp.score.toFixed(0)}` : ""}.` });
  const maxTitles = Math.max(0, ...careers.map((c) => c.titles));
  const kings = careers.filter((c) => c.titles === maxTitles && maxTitles > 0);
  if (kings.length) out.push({ title: "Most decorated", icon: "crown", gold: true, winners: kings.map((k) => k.managerId), value: `${maxTitles} title${maxTitles === 1 ? "" : "s"}`, detail: kings.length > 1 ? "Tied at the top." : "" });

  const podiums = careers.map((c) => {
    const seasons = league.seasons.filter((s) => s.teams.some((t) => t.managerId === c.managerId));
    const n = seasons.filter((s) => {
      const t = s.teams.find((x) => x.managerId === c.managerId)!;
      return seasonOutcome(s).finalRank.get(t.id)! <= 3;
    }).length;
    return { c, n };
  });
  const podium = top(podiums, (p) => p.n * 100 - (p.c.avgFinish ?? 99));
  if (podium?.n) out.push({ title: "Podium regular", icon: "trophy", winners: [podium.c.managerId], value: `${podium.n} podiums`, detail: `Top-3 finishes in ${podium.c.seasons} seasons.` });

  const catMachine = top(careers.filter((c) => c.seasons >= 3), (c) => c.catWins / Math.max(1, c.catWins + c.catLosses + c.catTies));
  if (catMachine) out.push({ title: "Category machine", icon: "star", winners: [catMachine.managerId], value: formatPct((catMachine.catWins + catMachine.catTies / 2) / Math.max(1, catMachine.catWins + catMachine.catLosses + catMachine.catTies)), detail: "Best career category win % (3+ seasons)." });

  const [steady] = consistency(league);
  if (steady) out.push({ title: "Mr. Steady", icon: "target", winners: [steady.managerId], value: `±${formatPct(steady.spread, 0)}`, detail: `Smallest year-to-year swing; typical finish top ${formatPct(steady.avgPercentile, 0)}.` });

  const [hot] = longestStreaks(league, "W", 1);
  if (hot) out.push({ title: "Heater", icon: "flame", winners: [hot.managerId], value: `${hot.length} straight`, detail: `${hot.teamName}, ${hot.label}, weeks ${hot.fromWeek}–${hot.toWeek}.` });
  const [cold] = longestStreaks(league, "L", 1);
  if (cold) out.push({ title: "Ice cold", icon: "basement", winners: [cold.managerId], value: `${cold.length} straight Ls`, detail: `${cold.teamName}, ${cold.label}, weeks ${cold.fromWeek}–${cold.toWeek}.` });

  const sw = sweeps(league);
  if (sw.length) {
    const counts = new Map<ManagerId, number>();
    for (const s of sw) counts.set(s.winnerManagerId, (counts.get(s.winnerManagerId) ?? 0) + 1);
    const [id, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push({ title: "Broom closet", icon: "broom", winners: [id], value: `${n} × ${sw[0].score}`, detail: "Most perfect weeks all time." });
  }

  const luck = careerLuck(league);
  if (luck.length) {
    out.push({ title: "Horseshoe", icon: "horseshoe", winners: [luck[0].managerId], value: signed(luck[0].luck), detail: `Most career matchup luck, over ${luck[0].seasons} seasons.` });
    const last = luck.at(-1)!;
    out.push({ title: "Snake-bitten", icon: "wave", winners: [last.managerId], value: signed(last.luck), detail: `Least career matchup luck, over ${last.seasons} seasons.` });
  }

  const drafter = top(managerDraftStats(league), (r) => r.vsLeague);
  if (drafter) out.push({ title: "Draft guru", icon: "clip", winners: [drafter.managerId], value: signed(drafter.vsLeague, 2), detail: `Best value per pick vs the league, ${drafter.drafts} drafts.` });
  const activity = managerActivity(league);
  const shark = top(activity.filter((a) => a.trades), (a) => a.netValue);
  if (shark) out.push({ title: "Trade shark", icon: "shield", winners: [shark.managerId], value: signed(shark.netValue), detail: `Best net trade value · ${shark.tradeWins}-${shark.tradeLosses} in trades.` });
  const hawk = top(activity.filter((a) => a.seasons), (a) => a.movesPerSeason);
  if (hawk) out.push({ title: "Wire hawk", icon: "swap", winners: [hawk.managerId], value: `${Math.round(hawk.movesPerSeason)}/season`, detail: "Most adds and drops per season." });

  const waiting = top(titleDroughts(league).filter((d) => d.titles === 0), (d) => d.current);
  if (waiting) out.push({ title: "Still waiting", icon: "road", winners: [waiting.managerId], value: `${waiting.current} seasons`, detail: "Longest active title drought (never won)." });
  return out;
}
