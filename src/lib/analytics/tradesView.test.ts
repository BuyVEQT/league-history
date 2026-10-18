import { describe, expect, it } from "vitest";
import type { ManagerActivityRow, TradeView } from "./trades";
import { activityBars, tradeLogSeasons, tradeSideShares } from "./tradesView";

const row = (managerId: string, moves: number, netValue: number): ManagerActivityRow => ({
  managerId,
  seasons: 1,
  moves,
  movesPerSeason: moves,
  trades: 1,
  vetoed: 0,
  tradeWins: 0,
  tradeLosses: 0,
  netValue,
  favoritePartner: null,
});

const trade = (year: number, status: TradeView["status"], values: number[]): TradeView => ({
  year,
  label: `${year - 1}-${String(year).slice(2)}`,
  date: `${year}-01-01`,
  status,
  basis: "after",
  winnerManagerId: null,
  margin: 0,
  sides: values.map((value, i) => ({ teamId: `t${i}`, managerId: `m${i}`, teamName: `T${i}`, players: [], value })),
});

describe("activityBars", () => {
  it("scales moves to the busiest manager and net value to the largest absolute net", () => {
    const out = activityBars([row("a", 100, 10), row("b", 50, -20), row("c", 0, 0)]);
    expect(out.map((r) => r.movesShare)).toEqual([1, 0.5, 0]);
    expect(out.map((r) => r.netShare)).toEqual([0.5, -1, 0]);
  });
  it("copes with nobody moving or trading", () => {
    const out = activityBars([row("a", 0, 0)]);
    expect(out[0].movesShare).toBe(0);
    expect(out[0].netShare).toBe(0);
  });
});

describe("tradeLogSeasons", () => {
  it("lists seasons newest first with completed and vetoed counts", () => {
    const out = tradeLogSeasons([trade(2024, "completed", [1, 2]), trade(2026, "vetoed", [1, 1]), trade(2026, "completed", [3, 1])]);
    expect(out).toEqual([
      { year: 2026, label: "2025-26", completed: 1, vetoed: 1 },
      { year: 2024, label: "2023-24", completed: 1, vetoed: 0 },
    ]);
  });
});

describe("tradeSideShares", () => {
  it("scales each side to the bigger side, with a floor of 1 so tiny trades don't look huge", () => {
    expect(tradeSideShares(trade(2026, "completed", [20, 5]))).toEqual([1, 0.25]);
    expect(tradeSideShares(trade(2026, "completed", [0.5, 0]))).toEqual([0.5, 0]);
  });
});
