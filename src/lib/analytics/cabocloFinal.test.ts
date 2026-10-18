import { describe, expect, it } from "vitest";
import data from "../../../data/leagues/caboclo/caboclo-final.json";
import { elapsed, fgPct, finalTimeline, lastShotWhatIf, type CabocloFinal } from "./cabocloFinal";

const f = data as unknown as CabocloFinal;

describe("the Caboclo Cup final", () => {
  it("matches Yahoo's tiebreaker to 8 decimals", () => {
    for (const t of f.teams) expect(fgPct(t.fgm, t.fga)).toBeCloseTo(t.yahooFgPct, 8);
  });

  it("was tied at three decimals and decided at the fourth", () => {
    const [matt, skip] = ["matt", "jacob-g"].map((id) => f.teams.find((t) => t.managerId === id)!);
    const pct = (t: (typeof f.teams)[number]) => fgPct(t.fgm, t.fga);
    expect(pct(matt).toFixed(3)).toBe(pct(skip).toFixed(3));
    expect(pct(matt).toFixed(4)).not.toBe(pct(skip).toFixed(4));
    expect(pct(matt)).toBeGreaterThan(pct(skip));
  });

  it("has every Skip shot of the last game, ending on Yahoo's totals", () => {
    const { points, start, target } = finalTimeline(f, "matt", "jacob-g");
    expect(points).toHaveLength(16);
    expect(points.at(-1)).toMatchObject({ fgm: 266, fga: 567, player: "Bruno Caboclo", made: false });
    expect(start.leading).toBe(true);
    // Skip was back in front going into the very last shot.
    expect(points.at(-2)!.pct).toBeGreaterThan(target);
    expect(points.at(-1)!.leading).toBe(false);
  });

  it("flips the final if the last shot drops or is never taken", () => {
    const w = lastShotWhatIf(f, "matt", "jacob-g");
    expect(w.made.score).toEqual([3, 6]);
    expect(w.skipped.score).toEqual([4, 5]);
    expect(w.margin).toBeCloseTo(0.00014748, 7);
  });

  it("converts game clock to minutes played", () => {
    expect(elapsed(1, "12:00")).toBe(0);
    expect(elapsed(4, "1:50")).toBeCloseTo(46 + 1 / 6, 6);
  });
});
