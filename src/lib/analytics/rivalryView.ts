/** Display reshapes for the rivalry page: read straight off headToHead()'s list of games. */
import type { ManagerId } from "../types";
import type { H2HGame } from "./headToHead";

/** The current run in the series: consecutive wins by the same manager counting back from the latest meeting. */
export function seriesStreak(games: H2HGame[]): { winner: ManagerId; length: number } | null {
  let winner: ManagerId | null = null;
  let length = 0;
  for (let i = games.length - 1; i >= 0; i--) {
    const w = games[i].winner;
    if (w === null) break;
    if (winner === null) winner = w;
    if (w !== winner) break;
    length++;
  }
  return winner === null ? null : { winner, length };
}

/** The meeting with the widest category margin (the earliest if tied). */
export function biggestBeatdown(games: H2HGame[]): H2HGame | null {
  let best: H2HGame | null = null;
  for (const g of games) if (!best || Math.abs(g.aCats - g.bCats) > Math.abs(best.aCats - best.bCats)) best = g;
  return best;
}
