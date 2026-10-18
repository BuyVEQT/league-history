import { careerStats } from "@/lib/analytics/career";
import { managerDraftStats } from "@/lib/analytics/draft";
import { goatScores } from "@/lib/analytics/goat";
import { marginRecords, playoffRecords } from "@/lib/analytics/records";
import { managerActivity } from "@/lib/analytics/trades";
import { careerLuck } from "@/lib/analytics/whatIf";
import { TIPS } from "@/lib/explain";
import type { League } from "@/lib/types";

export interface Badge {
  name: string;
  tone: "gold" | "orange" | "";
  rule: string;
}

/** Badges go to the single league leader in each, so they mean something. Shared by the card grid and the profile. */
export function managerBadges(league: League): Map<string, Badge[]> {
  const badges = new Map<string, Badge[]>();
  const give = (id: string | undefined, name: string, tone: Badge["tone"], rule: string) => {
    if (id) badges.set(id, [...(badges.get(id) ?? []), { name, tone, rule }]);
  };
  give(goatScores(league)[0]?.managerId, "GOAT", "gold", `Highest GOAT score. ${TIPS.goat}`);
  for (const c of careerStats(league).filter((c) => c.titles >= 2)) give(c.managerId, "Dynasty", "gold", "Two or more titles.");
  const best = <T,>(xs: T[], f: (x: T) => number) => [...xs].sort((a, b) => f(b) - f(a))[0];
  give(best(managerDraftStats(league), (r) => r.vsLeague)?.managerId, "Draft guru", "orange", `Best average draft value per pick vs the league. ${TIPS.draftVsAvg}`);
  const act = managerActivity(league);
  give(best(act.filter((a) => a.seasons), (a) => a.movesPerSeason)?.managerId, "Wire hawk", "", "Most adds and drops per season.");
  give(best(act.filter((a) => a.trades), (a) => a.netValue)?.managerId, "Trade shark", "", `Best net value from trades. ${TIPS.netTrade}`);
  give(careerLuck(league)[0]?.managerId, "Horseshoe", "", `Most career matchup luck. ${TIPS.matchupLuck}`);
  give(best(playoffRecords(league).filter((r) => r.appearances >= 3), (r) => r.avgOverSeed)?.managerId, "Playoff riser", "", `Gains the most places on their seed in the playoffs (3+ appearances). ${TIPS.vsSeed}`);
  give(
    best(marginRecords(league).filter((r) => r.closeWins + r.closeLosses >= 10), (r) => r.closeWins / (r.closeWins + r.closeLosses))?.managerId,
    "Ice in veins",
    "",
    `Best record in one-category matchups (10+). ${TIPS.closeGames}`,
  );
  return badges;
}
