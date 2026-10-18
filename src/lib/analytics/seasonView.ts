import type { Season } from "../types";
import { ordinal as ord, winPct } from "./format";
import type { SeasonRace } from "./race";
import { rankMethod, seasonStandings } from "./season";

/**
 * Display-only reshaping for the season page's charts. No new formulas: every number comes from
 * seasonRace / seasonStandings (and format's winPct, the same tie-as-half rule the standings use).
 */

export interface ReplayRow {
  teamId: string;
  managerId: string;
  teamName: string;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  catWins: number;
  catLosses: number;
  catTies: number;
  /** The win % the standings are ranked by (category win % or matchup win %), 0.5 when nothing played. */
  pct: number;
}

export interface ReplayFrame {
  week: number;
  rows: ReplayRow[];
}

/** The standings as they stood after each regular-season week, in standings order. */
export function replayFrames(season: Season, weeks: number[]): { method: "categories" | "matchups"; frames: ReplayFrame[] } {
  const method = rankMethod(season);
  return {
    method,
    frames: weeks.map((week) => ({
      week,
      rows: seasonStandings(season, { throughWeek: week }).map((r) => ({
        teamId: r.teamId,
        managerId: r.managerId,
        teamName: r.teamName,
        rank: r.rank,
        wins: r.wins,
        losses: r.losses,
        ties: r.ties,
        catWins: r.catWins,
        catLosses: r.catLosses,
        catTies: r.catTies,
        pct: (method === "categories" ? winPct(r.catWins, r.catLosses, r.catTies) : r.winPct) ?? 0.5,
      })),
    })),
  };
}

export type StoryKind = "Front-runner" | "Comeback" | "Collapse" | "Final-week knockout";

export interface Storyline {
  kind: StoryKind;
  /** Teams to highlight in the race chart. */
  teamIds: string[];
  title: string;
  detail: string;
}

/** The race's storylines as clickable cards: the front-runner, comebacks, collapses and the final-week knockout. */
export function raceStorylines(race: SeasonRace): Storyline[] {
  const name = new Map(race.lines.map((l) => [l.teamId, l.teamName]));
  const out: Storyline[] = [];
  const leader = [...race.lines].sort((a, b) => b.weeksInFirst - a.weeksInFirst)[0];
  if (leader?.weeksInFirst) {
    out.push({
      kind: "Front-runner",
      teamIds: [leader.teamId],
      title: leader.teamName,
      detail: `${leader.weeksInFirst} of ${race.weeks.length} weeks in first${leader.weeksInFirst === race.weeks.length ? " (wire to wire)" : ""} · finished ${ord(leader.finalRank)}`,
    });
  }
  for (const c of race.comebacks) {
    out.push({ kind: "Comeback", teamIds: [c.teamId], title: c.teamName, detail: `${ord(c.rank)} in week ${c.week} → ${ord(c.seed)} seed · finished ${ord(c.finalRank)}` });
  }
  for (const c of race.collapses) {
    out.push({ kind: "Collapse", teamIds: [c.teamId], title: c.teamName, detail: `${ord(c.rank)} in week ${c.week} → missed the playoffs (${ord(c.seed)})` });
  }
  if (race.lastWeekOut.length) {
    out.push({
      kind: "Final-week knockout",
      teamIds: [...race.lastWeekOut, ...race.lastWeekIn],
      title: race.lastWeekOut.map((id) => name.get(id)!).join(", "),
      detail: `Knocked out in the last week${race.lastWeekIn.length ? ` by ${race.lastWeekIn.map((id) => name.get(id)!).join(", ")}` : ""}`,
    });
  }
  return out;
}
