import { describe, expect, it } from "vitest";
import type { PickValue } from "./draft";
import { cellKey, replayBoard, replayVerdict, tickerStep } from "./replayView";

const pk = (round: number, pick: number, overall: number, teamId: string, value: number): PickValue => ({
  year: 2025,
  label: "2024-25",
  round,
  pick,
  overall,
  teamId,
  managerId: teamId.slice(2),
  teamName: teamId.toUpperCase(),
  playerId: `p${overall}`,
  playerName: `Player ${overall}`,
  actualRank: null,
  preseasonRank: null,
  value,
});

// Two-team snake: A, B, then B, A. Given out of order.
const picks = [pk(2, 2, 4, "t:a", 5), pk(1, 1, 1, "t:a", -4), pk(2, 1, 3, "t:b", 1), pk(1, 2, 2, "t:b", -1)];

describe("replayBoard", () => {
  it("orders picks by overall, columns by round-one slot", () => {
    const b = replayBoard(picks);
    expect(b.order.map((p) => p.overall)).toEqual([1, 2, 3, 4]);
    expect(b.columns.map((c) => c.teamId)).toEqual(["t:a", "t:b"]);
    expect(b.rounds).toBe(2);
    expect(b.cells.get(cellKey("t:a", 2))?.overall).toBe(4);
  });
  it("handles an empty draft", () => {
    expect(replayBoard([])).toMatchObject({ order: [], columns: [], rounds: 0 });
  });
});

describe("replayVerdict", () => {
  it("takes the top steal and the top early bust", () => {
    const v = replayVerdict(picks);
    expect(v.steal?.overall).toBe(4);
    expect(v.bust?.overall).toBe(1);
    expect(replayVerdict([])).toEqual({ steal: null, bust: null });
  });
});

describe("tickerStep", () => {
  it("names the pick just made and who is on the clock", () => {
    const { order } = replayBoard(picks);
    const s = tickerStep(order, 3)!;
    expect(s.head).toBe("Round 2 · Pick 1 (#3)");
    expect(s.pick.teamId).toBe("t:b");
    expect(s.next?.teamId).toBe("t:a");
    expect(tickerStep(order, 4)?.next).toBeNull();
    expect(tickerStep(order, 0)).toBeNull();
  });
});
