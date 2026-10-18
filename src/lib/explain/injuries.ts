/** Info-tip copy for the injury luck page. */
export const INJURY_TIPS = {
  page: "Built from games played only: there are no injury reports here. A player who sat for any reason (injury, rest, suspension, a trade to a team that benched him) counts as missing those games. Games are for the whole NBA season, wherever the player ended up, so a pick traded away still counts for the manager who drafted him.",
  played:
    "Share of possible games their round 1-3 picks played, across every draft. 100% = every early pick played every game. The NBA plays 82 games (72 in 2020-21).",
  vsLeague: "Percentage points above (+) or below (−) the league-wide share for round 1-3 picks. +5 means their early picks were available about one game in 20 more often than everyone else's.",
  lost: "Games their round 1-3 picks missed, on average, per draft. Three healthy early picks would lose 0; one star out for the season costs 82.",
  ironMen: "Round 1-3 picks who played 95% or more of the schedule (78+ of 82 games, 69+ of 72), out of all their round 1-3 picks.",
  all: "Share of possible games played by every pick they made, all 12-13 rounds. Late picks miss more (and some are cut and never matter), so this runs lower than the early-pick number.",
  grid: "Each square is one draft: the share of possible games that manager's round 1-3 picks played. Blue = healthier than the league average, red = more games lost, grey = about average. Hover a square for the three players.",
  losses: "Round 1-3 picks who missed the most games: the injuries that hurt most, because the pick spent on them couldn't be spent on anyone else.",
  ironList: "Round 1-3 picks who answered the bell: 95% or more of their team's games.",
  risks: "Players drafted in three or more seasons whose availability across those seasons was lowest. Each chip is one season: who drafted him and the games he played.",
  matter:
    "Every finished manager-season, split into three equal groups by how much their round 1-3 picks played. If injuries decided seasons, the healthiest third would finish clearly higher and win more titles.",
} as const;
