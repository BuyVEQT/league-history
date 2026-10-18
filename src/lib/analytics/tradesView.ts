import type { ManagerActivityRow, TradeView } from "./trades";

/**
 * Presentation-only reshapes of ./trades outputs for the Trades page charts. No new formulas:
 * each helper just scales or groups numbers the analytics already computed.
 */

/** Each manager's moves as a share of the busiest manager's, and net trade value as a signed share of the largest |net|. */
export function activityBars(rows: ManagerActivityRow[]) {
  const maxMoves = Math.max(1, ...rows.map((r) => r.moves));
  const maxNet = Math.max(0, ...rows.map((r) => Math.abs(r.netValue))) || 1;
  return rows.map((r) => ({ ...r, movesShare: r.moves / maxMoves, netShare: r.netValue / maxNet }));
}

/** Seasons that had a trade, newest first, with completed and vetoed counts. */
export function tradeLogSeasons(trades: TradeView[]) {
  const years = [...new Set(trades.map((t) => t.year))].sort((a, b) => b - a);
  return years.map((year) => {
    const list = trades.filter((t) => t.year === year);
    return {
      year,
      label: list[0].label,
      completed: list.filter((t) => t.status === "completed").length,
      vetoed: list.filter((t) => t.status === "vetoed").length,
    };
  });
}

/** Each side's value as a share of the bigger side in the same trade (0..1), for the log's value bars. */
export function tradeSideShares(trade: TradeView): number[] {
  const max = Math.max(1, ...trade.sides.map((s) => s.value));
  return trade.sides.map((s) => Math.max(0, s.value) / max);
}
