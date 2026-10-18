import { GOAT_RULE } from "./analytics/goat";
import { PUNT_Z } from "./analytics/players";

/**
 * Plain-language notes for the site's info tips. Each leads with what the number means in everyday
 * terms and how to read it, with an example, then gives the precise definition.
 */
export const TIPS = {
  goat: `One number for a whole career, from 0 to 100: 100 = the best in the league at everything that matters, 0 = the weakest of the regulars. A 90+ is hall-of-fame stuff; 50 is mid-pack. How it's built: ${GOAT_RULE}`,
  catPct:
    "Of every single category played in weekly matchups (points, rebounds, steals and so on), the share they won; ties count half. 50% is average. 57% ≈ winning about 5 of the 9 categories in a typical week.",
  catRecord:
    "Every individual category won, lost and tied, added up across matchups (9 a week). It shows how dominant a team really was, not just whether it squeaked out the week: 6-3 and 9-0 are both one win, but very different category records.",
  winPct: "Share of weekly matchups won; a tie counts as half a win. 50% = a .500 team.",
  avgFinish: "Average final placing over every season played, where 1 = champion. Lower is better: 3.0 means they usually end up on the podium.",
  playoffPct: "How often they made the playoffs: the share of their seasons that ended with a playoff spot.",
  vsSeed:
    "Do they rise or shrink in the playoffs? The average number of places gained (+) or lost (−) between their playoff seed and where they finally finished. +2.0 = they finish about two places better than seeded (say, seeded 5th and ending 3rd); −1.0 = a place worse. Only seasons they made the playoffs count.",
  matchupLuck:
    "Did they win more weeks than they \"should\" have? From how strong each team was category by category, we estimate how many matchups that usually wins and compare with what actually happened. +2.0 = about two extra wins that came from timing (lots of 5-4 squeakers); −2.0 = about two wins lost to bad timing. It mostly evens out over a career. Precisely: actual matchup wins minus expected wins, where each category is a weighted coin flip from both teams' season category win % (log5). Regular season only; ties count half.",
  power:
    "A running strength rating, like chess Elo. 1500 = average. Winning categories pushes it up, and beating a strong team pushes it up more. A 100-point edge means you'd expect to win about 64% of the categories against that opponent (roughly 6 of 9). Ratings drift halfway back to 1500 between seasons, since every draft resets most of a roster.",
  draftValue:
    "How much a pick beat or missed its draft slot. 0 = the player finished right where he was picked. +2 ≈ he finished about twice as high as drafted (taken 60th, finished 30th); +3 ≈ a 6th-round pick who played like a 2nd-rounder; −10 ≈ a top-5 pick who finished outside the top 150. Precisely: what his end-of-season rank was worth minus what the slot was expected to be worth, in 9-category z-score points above a replacement-level player.",
  draftVsAvg:
    "Are they a better drafter than the rest of the league? Their average draft value per pick, compared with the league's. 0 = an average drafter. +0.5 a pick adds up to about +6 over a 13-round draft, like turning two mid-round picks into 2nd-round-quality players every year. (Raw value is negative for almost everyone, because injuries and busts drag drafted players below their slot, so this compares with the league instead.)",
  slotLuck:
    "How much the draft order helped them before anyone made a pick. Picking 1st is a head start worth about +4.6 in draft-value points, about like a 6th-round pick turning into a late 1st-rounder; picking last costs about −1.8. + = they usually picked early (lucky), − = usually late.",
  hitRate: "Share of their picks that finished at or better than where they were taken. 40% = 4 in 10 picks paid off.",
  coreSlotFinish:
    "Where their first three picks each year were taken on average, and where those players actually finished. #18 → #25 means their early picks finished about 7 spots worse than drafted (players outside the top 300 count as #301).",
  explainedByDraft:
    "Roughly how much of the regular-season standings traces back to draft day. 20% would mean about a fifth of the gap between good and bad teams was set at the draft; the rest came from trades, waivers, injuries and luck. Precisely: r², the square of the correlation (r) between the value of the players a team drafted and its regular-season win %.",
  correlation:
    "r is a correlation, from −1 to +1. 0 = no link at all; ±0.1 to ±0.3 = a weak tendency; beyond ±0.3 = a clear one; ±1 = perfect lockstep. A negative number means the opposite tendency.",
  keepPicks:
    "Do teams that hang on to their own draft picks finish higher? This is the correlation (r, from −1 to +1) between the share of picks a team kept all season and how high it finished: + = keepers finish higher, − = teams that churn their roster do better, near 0 = it doesn't really matter.",
  reaches:
    "A reach is taking a player well before the pre-season rankings had him. This is how often those gut calls finished better than the rankings predicted, next to how often everyone else's picks did: do reaches beat the experts?",
  fallers: "Players who slid well past their pre-season rank before someone took them: how often they ended up beating that rank. A high number means waiting on a falling player tends to pay off.",
  spotsEarly:
    "How far ahead of the pre-season rankings they draft, on average. +10 = they typically take players 10 spots before the rankings say; a negative number = they wait for players to fall to them.",
  netTrade:
    "Did they come out ahead in their trades? The value of every player they received minus the value of everyone they gave up, added over all their trades. On one trade, +8 ≈ getting a top-10 player for someone barely worth a roster spot, and +4 ≈ upgrading a top-40 player to a top-10 one. Same value scale as the draft, based on how the players actually finished.",
  tradeMargin:
    "How much more value one side got than the other in a single trade. +8 ≈ getting a top-10 player for someone barely worth a roster spot; +4 ≈ upgrading a top-40 player to a top-10 one; near 0 = a fair swap. \"Worth\" on each side is the value of the players it received, on the same scale as the draft.",
  tradeRecord: "Trades won and lost: a trade is won by whichever side received more value.",
  swing:
    "How much their finish bounces around from year to year. ±18% in a 12-team league means their finish usually lands within about two places of their typical spot; ±35% is more like four places either way, boom or bust. Precisely: the standard deviation of finish as a share of the league.",
  typicalFinish:
    "Average finish as a share of the league, so 10- and 12-team seasons compare fairly: top 0% = always first, top 100% = always last. Top 25% in a 12-team league ≈ usually finishing about 4th.",
  parity:
    "How bunched-up the league was that season; lower = more even. ±5% means most teams' win % sat within about 5 points of the league average (roughly 45% to 55%); a bigger number means clear haves and have-nots. Precisely: the standard deviation of every team's regular-season win %.",
  bubbleGap: "How far the last playoff seed finished behind first place, in percentage points of win %. Small = a tight race at the top; big = one runaway team.",
  closeGames: "Record in matchups decided by a single category, like 5-4. Coin-flip weeks: a great record here is some nerve and some luck.",
  winMargin: "In the weeks they won, how many more categories they took than the opponent, on average. 3.0 = a typical win looked like 6-3.",
  roster: `How strong each team's season-end roster was in each category, compared with the rest of the league. 0 = average; +1.0 ≈ among the top two or three teams in that category; −1.0 ≈ among the bottom two or three. A likely punt is a category the team seems to have given up on purpose: ${Math.abs(PUNT_Z)}+ below the league and below its own average. Precisely: standard scores (z-scores) of the best players' full-season totals.`,
  higherSeed: "How often the better-seeded team won a playoff game. 50% would mean seeding doesn't matter at all; 75% means the favourite usually wins.",
  avgChampSeed: "The champion's regular-season rank, averaged over every season. 1.0 would mean the top seed always wins it all; higher = more playoff upsets.",
  catTotals: "Every individual category across all their matchups added up. Shows whether a lopsided head-to-head record was actually close underneath.",
  h2hGrid: "Green = the row manager has won most of their meetings (55%+), red = lost most (45% or less), blank = about even. Read across a row for one manager's record against everyone.",
  reaching:
    "How far ahead of the pre-season rankings they take players in rounds 1-8, on average. +10 = usually 10 spots before the rankings say; negative = they let players fall to them.",
  picksKept: "How many of their own draft picks were still on the roster when the season ended. Low = they churn the roster through trades and waivers.",
  draftBoard:
    "Each cell shows where the player finished the season (#rank) and his draft value: + = he beat his draft slot, − = he missed it. +3 ≈ a 6th-round pick who played like a 2nd-rounder.",
  managerCards:
    "Cat. win = share of individual categories won, week to week (50% is average). Avg finish = average final placing (1 = champion; lower is better).",
} as const;

/** What each award is for and how its winner is picked, keyed by award title. Mirrors ./analytics/awards. */
export const AWARD_RULES: { season: Record<string, string>; allTime: Record<string, string> } = {
  season: {
    Champion: "The league title: whoever won the championship final.",
    "Regular-season MVP":
      "Best regular season: the #1 seed, the team on top of the standings when the regular season ended. The number is their category win %, the share of every category they won week to week.",
    Cinderella:
      "Biggest playoff overachiever: the playoff team that climbed the most places from its seed to its final finish. 5th → 1st = seeded fifth, won it all.",
    "Playoff heartbreak": "The playoff team that fell the most places from its seed to its final finish. 2nd → 8th = seeded second, finished eighth.",
    Horseshoe:
      "Luckiest team of the season: won the most matchups beyond what its category strength usually earns. +1.6 = about 1.6 more weekly wins than expected, usually from winning a lot of 5-4 coin flips.",
    "Snake-bitten":
      "Unluckiest team of the season: won the fewest matchups compared with what its category strength usually earns. −2.0 = about two weekly wins lost to bad timing.",
    "Broom award": "Most clean sweeps this season: weeks a team won every single category (9-0).",
    "Front-runner": "Most weeks sitting in first place in the regular-season standings.",
    "Comeback of the year":
      "Biggest midseason climb: the team furthest down the standings in the second half of the season (outside the playoff spots) that still made the playoffs. 9th → 4th = 9th at its low point, ended as the 4th seed.",
    "Waiver warrior": "Most roster moves (adds and drops) this season.",
    "Steal of the draft": `The pick that beat its draft slot by the most. ${TIPS.draftValue}`,
    "Bust of the year": "The worst early pick: in rounds 1-3, the player who fell furthest short of his draft slot, by draft value. −10 ≈ a top-5 pick who finished outside the top 150.",
    "Heist of the year": `The most lopsided completed trade of the season, credited to the side that got more. ${TIPS.tradeMargin}`,
    "Biggest beatdown": "The most lopsided regular-season matchup: the most categories won by in a single week.",
  },
  allTime: {
    "The GOAT": `The best all-round career by GOAT score. ${TIPS.goat}`,
    "Most decorated": "Most championships, all time.",
    "Podium regular": "Most top-3 final finishes. A tie goes to the better average finish.",
    "Category machine": `Best career category win % (3+ seasons). ${TIPS.catPct}`,
    "Mr. Steady": `Smallest year-to-year swing in final finish (3+ seasons). ${TIPS.swing}`,
    Heater: "Longest winning streak: straight regular-season matchups won within one season.",
    "Ice cold": "Longest losing streak: straight regular-season matchups lost within one season.",
    "Broom closet": "Most clean sweeps all time: weeks they won every single category (9-0).",
    Horseshoe: `Most career matchup luck, added up over every season. ${TIPS.matchupLuck}`,
    "Snake-bitten": "Least career matchup luck: the most weekly wins lost to timing, added up over every season. −3.0 ≈ three matchups their category results usually win, but didn't.",
    "Draft guru": `Best drafter. ${TIPS.draftVsAvg}`,
    "Trade shark": `Best trader. ${TIPS.netTrade}`,
    "Wire hawk": "Most adds and drops per season on average: the busiest manager on the waiver wire.",
    "Still waiting": "Longest active title drought for someone who has never won: seasons played without a title.",
  },
};
