/** Plain-language info tips for the Trades & moves page, for metrics ../explain.ts doesn't cover. */
export const TRADE_TIPS = {
  moves:
    "Adds and drops: every time a team picks a player up off waivers or free agency (and drops someone to make room), as counted by the league host for the season. 60 in a season ≈ more than three moves a week.",
  network:
    "Each line is completed trades between two managers; the thicker the line, the more often they've dealt. Bigger circles = managers who trade more. Vetoed trades aren't drawn.",
  wire: "Average adds and drops per team-season, split by how teams finished. If champions and top teams make more moves than the bottom third, grinding the waiver wire pays.",
  afterTrade:
    "Trades are judged on games after the trade: each player is re-ranked on only the games he played for his new team, from the trade date to the end of the regular season, so a side gets no credit for what a player did before he arrived. #42 · 31g = played like the 42nd-best player over 31 games. Where game logs aren't available, the trade falls back to full-season ranks.",
  tradeLog:
    "Each bar is the value of the players a side received, scaled to the bigger side of the same trade. Blue = the side that won it; gray = the other side. Vetoed trades are dimmed.",
  undrafted:
    "Players nobody drafted who finished in the top 75, with the team that had them when the season ended (not necessarily who picked them up first). #19 = finished as the 19th-best player that season.",
  unowned:
    "Top-60 finishers who were free agents when the season ended: usually injured stars who got dropped, or late-season breakouts nobody grabbed in time. The dot is where he finished, from #1 (left) to #60 (right).",
} as const;
