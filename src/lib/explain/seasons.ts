/**
 * Plain-language notes for the season, overview and leaderboard pages, for metrics that src/lib/explain.ts
 * doesn't cover yet. Same style: what it means and how to read it first, then the precise rule.
 */
export const SEASON_TIPS = {
  titles: "Championships: won the final in the playoff bracket.",
  finals: "Finals reached: titles plus runner-up finishes.",
  streak: "Straight regular-season matchups won (or lost) within one season. A tied week ends the streak, as in Yahoo's record book.",
  blowout: "The most lopsided regular-season matchup: the most categories won by in a single week.",
  raceStory:
    "Comeback = made the playoffs after sitting outside a playoff spot in the second half of the season. Collapse = missed the playoffs after sitting in the top half of the playoff field in the second half. Final-week knockout = in a playoff spot going into the last week, out after it.",
  replay:
    "The standings rebuilt after every regular-season week from the matchups played so far, ranked exactly like the final table. The bar is the win % the standings use; right of center = a winning record so far.",
  whatIf:
    "The same results re-ranked the other way: by weeks won instead of categories won (or the reverse, in seasons ranked by weeks won). Lines that cross the dashed playoff line are the teams the ranking method decided.",
  weekGrid:
    "Each cell is one weekly matchup and the number is categories won. Blue = won the week, red = lost, gray = tied; darker = a bigger margin. Gold outline = a playoff week.",
  bump: "Each line is one manager's final finish by season (1st = champion, at the top). Gaps are seasons they didn't play. Gold dots are titles.",
  finishHistory: "One dot per season, higher = better finish. Gold = champion, blue = top three.",
  race: "Running totals at the end of each season. Category wins are regular-season categories won; titles are championships; podiums are top-3 final finishes.",
  matchups: "Matchups played: weekly head-to-heads, regular season and playoffs.",
} as const;
