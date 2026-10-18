/**
 * Plain-language notes for Records-page metrics that src/lib/explain.ts has no tip for yet.
 * Same voice: what it means and how to read it, with an example, then the precise rule.
 */
export const RECORD_TIPS = {
  seeds:
    "Where each champion came from. A seed is the team's regular-season rank: a #1-seed champion means the favourite held on; a #5 means a playoff run out of nowhere. The third-place game is left out of the higher-seed count.",
  streak:
    "Straight weekly matchups won (or lost) in a row within one regular season. 8 = two months without losing a week. A tied week ends the streak, the way Yahoo's record book counts it.",
  frontRunner:
    "Share of the regular season spent on top of the standings. 12/20 = in first place after 12 of the 20 weeks. Gold = they went on to win the title.",
  raceStory:
    "Comeback = made the playoffs after sitting outside a playoff spot in the second half of the season. Collapse = missed them after sitting in the top half of the playoff places. Final-week heartbreak = in a playoff spot going into the last week, out after it.",
  luckScatter:
    "Each dot is one team-season: how many weeks its category results usually win (across) against how many it actually won (up). Dots above the dashed line won more weeks than expected (lucky); below it, fewer (unlucky). A dot 2 weeks above the line ≈ two extra wins from timing.",
  whatIf:
    "The same weekly results ranked the other way: by weeks won instead of category win % (or the reverse, if that's how the league ranks). Shows which seasons' playoff fields or first place would have changed.",
  scorelines:
    "How often each final score happens, regular season and playoffs. A third number is tied categories: 5-3-1 = five won, three lost, one level.",
  sweep: "A clean sweep: winning every single category in a week (9-0).",
  blowout: "A blowout is a week won by 7 or more categories, like 8-1.",
  drought:
    "Seasons played since their last title, or since joining if they've never won. Gold = a title year; pink = a season since the last one; dashed = not in the league that year.",
  namesake: "Teams named after a player: did the team actually have him, and how did both the player and the team finish?",
} as const;
