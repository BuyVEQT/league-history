import type { ManagerId, TeamId } from "../types";
import { topBusts, topSteals, type PickValue } from "./draft";

/**
 * Presentation-only reshaping of ./draft's seasonPicks() for the draft-night replay on a board.
 * No new formulas: picks keep the values the draft analytics computed; this only orders and labels them.
 */

export interface ReplayColumn {
  teamId: TeamId;
  managerId: ManagerId;
  teamName: string;
}

export interface ReplayBoard {
  /** Every pick in the order it was made (snake order = overall). */
  order: PickValue[];
  /** Board columns, in round-one order. */
  columns: ReplayColumn[];
  rounds: number;
  /** Lookup: `${teamId}|${round}` → pick. */
  cells: Map<string, PickValue>;
}

export const cellKey = (teamId: string, round: number) => `${teamId}|${round}`;

export function replayBoard(picks: PickValue[]): ReplayBoard {
  const order = [...picks].sort((a, b) => a.overall - b.overall);
  const columns = order
    .filter((p) => p.round === 1)
    .sort((a, b) => a.pick - b.pick)
    .map((p) => ({ teamId: p.teamId, managerId: p.managerId, teamName: p.teamName }));
  const rounds = order.reduce((n, p) => Math.max(n, p.round), 0);
  const cells = new Map(order.map((p) => [cellKey(p.teamId, p.round), p]));
  return { order, columns, rounds, cells };
}

/** The draft's verdict: its biggest steal (any round) and biggest bust (rounds 1-3), as the board's lists rank them. */
export function replayVerdict(picks: PickValue[]): { steal: PickValue | null; bust: PickValue | null } {
  return { steal: topSteals(picks, 1)[0] ?? null, bust: topBusts(picks, 1)[0] ?? null };
}

export interface TickerStep {
  /** "Round 2 · Pick 2 (#14)" */
  head: string;
  pick: PickValue;
  /** Whoever picks next; null after the last pick. */
  next: PickValue | null;
}

/** Ticker copy after `shown` picks have been made (shown ≥ 1). */
export function tickerStep(order: PickValue[], shown: number): TickerStep | null {
  const pick = order[shown - 1];
  if (!pick) return null;
  return { head: `Round ${pick.round} · Pick ${pick.pick} (#${pick.overall})`, pick, next: order[shown] ?? null };
}
