/**
 * Info-tip notes for the manager and rivalry pages that the shared TIPS (src/lib/explain.ts) doesn't cover.
 * Same voice: what it means in everyday terms first, then the precise rule.
 */
export const MANAGER_TIPS = {
  titles: "Championships: won the final of the playoff bracket. Finals reached = titles plus runner-up finishes.",
  streak:
    "Straight regular-season matchups won (or lost) within one season. A tied week ends the streak, the way Yahoo's record book counts it.",
  careerPath:
    "Each season: the ring is where they ranked after the regular season (their playoff seed), the dot is where they finally finished. A blue line means they finished better than seeded, red means worse. 1st is at the top.",
  avgCats: "Each bar is the share of their weeks in which they won that many categories (regular season and playoffs). The black line is the same for the whole league, so bars right of the line = better weeks than usual.",
  sweep: "A clean sweep: winning every category in one weekly matchup (9-0).",
  h2h: "Built only from the weeks the two managers actually played each other, regular season and playoffs. Seasons where they weren't both in the league add nothing. Playoff ties are decided by the higher seed.",
  h2hGrid:
    "Read across a row for one manager's record against everyone. Blue = the row manager has won most of their meetings, red = lost most, gray = about even; the color is fullest at 80% (or 20%) and beyond. A missing square means the two never played.",
  tug: "The share of all their meetings each manager won: blue for the first manager, orange for the second, gray for tied weeks.",
  currentStreak: "Meetings in a row won by the same manager, counting back from their latest one. A tied week ends it.",
} as const;
