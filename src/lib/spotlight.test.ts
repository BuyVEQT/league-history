import { describe, expect, it } from "vitest";
import { getLeague } from "./data";
import { spotlightCss, spotlightKey, spotlightOptions } from "./spotlight";

describe("spotlight", () => {
  it("generates no rule when nobody is spotlit", () => {
    expect(spotlightCss(null)).toBe("");
    expect(spotlightCss("")).toBe("");
  });

  it("fades everyone else: rows to 45%, chart marks to 22%, and marks the spotlit rows", () => {
    const css = spotlightCss("jacob-g");
    expect(css).toContain('body[data-spot] [data-m]:not([data-m="jacob-g"]) { opacity: .45 !important; }');
    expect(css).toContain('body[data-spot] svg [data-m]:not([data-m="jacob-g"])');
    expect(css).toContain("opacity: .22 !important");
    expect(css).toContain('tr[data-m="jacob-g"] > * { background-color: var(--accent-wash)');
    expect(css).toContain("inset 4px 0 0 var(--accent)");
  });

  it("escapes quotes so an odd id cannot break out of the selector", () => {
    expect(spotlightCss('a"b')).toContain('[data-m="a\\"b"]');
  });

  it("keys storage per league", () => {
    expect(spotlightKey("demo")).not.toBe(spotlightKey("caboclo"));
  });

  it("offers only managers who played", async () => {
    const league = (await getLeague("demo"))!;
    const opts = spotlightOptions(league);
    expect(opts.length).toBeGreaterThan(0);
    const played = new Set(league.seasons.flatMap((s) => s.teams.map((t) => t.managerId)));
    expect(opts.every((m) => played.has(m.id))).toBe(true);
  });
});
