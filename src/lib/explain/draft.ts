/** Info-tip copy for the draft pages that src/lib/explain.ts doesn't already cover (from the prototype's App.TIP, in the site's voice). */
export const DRAFT_TIPS = {
  slotLuckRule:
    "Slot luck = what a draft slot is worth: the value of every pick it gets across a 13-round snake draft, minus the average slot's, averaged over their drafts. + means lucky (early slots), − unlucky. Picking 1st is worth about +4.6 a draft in a 12-team league, picking last about −1.8. Draft value already compares each pick with its slot, so this is the luck that value doesn't count.",
  grade:
    "A quick letter for value vs avg: A = +0.30 or more per pick above the league average, B = +0.10 or more, C = within ±0.10, D = −0.10 or worse, F = −0.30 or worse. Placeholder cut-offs for the league to tune.",
  gems: "Late gems: picks from round 8 or later who finished inside the top 75. The sign of a manager who does their homework on the back half of the draft.",
  scatter:
    "Every draft pick: where he was taken (across) against where he finished (down). Dots above the dashed line finished better than their slot (steals); below it, worse (busts). Players who finished outside the top 300 sit in a band at the bottom.",
  position:
    "Every round-one slot each manager has drawn. Early slots get the surest stars. The ring is their average slot; the chips count #1 and #2 picks and the players they drafted who finished the season top 3.",
  favourites: "Players one manager keeps coming back to: drafted in three or more different seasons. Each chip is one of those drafts: blue = he beat his slot that year, red = he fell short.",
  gotAway:
    "Drafted players who finished in the top 40 on someone else's roster, or on nobody's. Traded = dealt away by the drafting team in a completed trade; otherwise dropped.",
  firstPicks: "Who held the first overall pick each season, where that player finished the season, and where the team holding the pick finished.",
  slotMatter:
    "Average final finish of the team drafting from each round-one slot (1st = champion), with a trophy for every title won from that slot. Slots 11-12 only exist in 12-team seasons, so they rest on fewer seasons.",
} as const;
