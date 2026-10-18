/** Plain-language notes for the week page. Same style as src/lib/explain.ts. */
export const WEEK_TIPS = {
  blowout: "The most lopsided matchup this week: the most categories won by.",
  closest: "The tightest matchup this week: the smallest gap in categories won. A third number is categories tied.",
  upset: "Regular weeks: standings place going into the week; the biggest gap where the lower-ranked team won. Playoff weeks: the biggest seed gap where the lower seed won.",
  tied: "Categories that finished level, added up across every matchup this week.",
  scoreboard:
    "Each bar is the nine categories: the winner's in blue from the left, ties in gray, the loser's in orange. The small number on the left is each team's place going into the week (its seed in the playoffs).",
  standings: "The table as it stood after this week, ranked exactly like the final standings. Arrows show movement since the week before; the orange line is the playoff cut.",
} as const;
