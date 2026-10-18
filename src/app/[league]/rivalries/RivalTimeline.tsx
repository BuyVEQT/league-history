"use client";

import * as d3 from "d3";
import type { H2HGame } from "@/lib/analytics/headToHead";
import type { Stage } from "@/lib/types";
import { tt } from "@/components/viz/tt";
import { useD3Chart } from "@/components/viz/useD3Chart";

export const STAGE_LABEL: Record<Stage, string> = {
  regular: "Regular season",
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  final: "Final",
  third_place: "Third-place game",
};

/**
 * Every meeting on a season-by-season strip: a lollipop up for A's wins, down for B's, height = category margin,
 * gold ring = playoffs. Lollipops grow out from the center line, one after another.
 */
export function RivalTimeline({
  games,
  years,
  maxWeek,
  maxCats,
  aId,
  a,
  b,
}: {
  games: H2HGame[];
  years: { year: number; label: string }[];
  maxWeek: number;
  maxCats: number;
  aId: string;
  a: string;
  b: string;
}) {
  const ref = useD3Chart(
    (el, { width, reduced, first }) => {
      el.selectAll("*").remove();
      const W = width;
      const H = 170;
      const m = { t: 14, r: 2, b: 26, l: 2 };
      const svg = el
        .append("svg")
        .attr("class", "viz")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("role", "img")
        .attr("aria-label", `Every meeting between ${a} and ${b}: ${games.length} in all`);
      const x0 = d3
        .scaleBand<number>()
        .domain(years.map((y) => y.year))
        .range([m.l, W - m.r])
        .paddingInner(0.06);
      const x = (g: H2HGame) => (x0(g.year) ?? 0) + ((g.week - 0.5) / maxWeek) * x0.bandwidth();
      const mid = (H - m.b + m.t) / 2;
      const y = d3.scaleLinear().domain([-maxCats, maxCats]).range([H - m.b, m.t]);
      const short = x0.bandwidth() < 54;
      for (const yr of years) {
        svg.append("rect").attr("x", x0(yr.year)!).attr("y", m.t).attr("width", x0.bandwidth()).attr("height", H - m.b - m.t).attr("rx", 4).attr("fill", "var(--surface-2)");
        svg
          .append("text")
          .attr("class", "lbl")
          .attr("x", x0(yr.year)! + x0.bandwidth() / 2)
          .attr("y", H - 8)
          .attr("text-anchor", "middle")
          .text(short ? `'${String(yr.year).slice(2)}` : yr.label);
      }
      svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", mid).attr("y2", mid).attr("stroke", "var(--border-2)");
      svg.append("text").attr("class", "lbl").attr("x", m.l + 4).attr("y", m.t + 11).text(`▲ ${a}`);
      svg.append("text").attr("class", "lbl").attr("x", m.l + 4).attr("y", H - m.b - 5).text(`▼ ${b}`);
      const col = (g: H2HGame) => (g.winner === null ? "var(--border-2)" : g.winner === aId ? "var(--s1)" : "var(--s2)");
      const gs = svg
        .append("g")
        .selectAll("g")
        .data(games)
        .join("g")
        .attr("tabindex", 0)
        .attr("data-tt", (g) => {
          const po = g.stage !== "regular";
          return tt(
            `${g.year - 1}-${String(g.year).slice(2)} · ${po ? STAGE_LABEL[g.stage] : `Week ${g.week}`}`,
            [
              [a, g.aCats],
              [b, g.bCats],
              ["Tied categories", g.tiedCats],
            ],
            g.winner === null ? "Tied week" : `${g.winner === aId ? a : b} won${po && g.aCats === g.bCats ? " on seed" : ""}`,
          );
        });
      // Wide invisible hit target so small dots are easy to hover.
      gs.append("rect")
        .attr("x", (g) => x(g) - 5)
        .attr("width", 10)
        .attr("y", m.t)
        .attr("height", H - m.b - m.t)
        .attr("fill", "transparent");
      const line = gs
        .append("line")
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", mid)
        .attr("y2", (g) => y(g.aCats - g.bCats))
        .attr("stroke", col)
        .attr("stroke-width", 2);
      const dot = gs
        .append("circle")
        .attr("cx", x)
        .attr("cy", (g) => y(g.aCats - g.bCats))
        .attr("r", (g) => (g.stage === "regular" ? 4.5 : 6))
        .attr("fill", col)
        .attr("stroke", (g) => (g.stage === "regular" ? "var(--surface)" : "var(--gold)"))
        .attr("stroke-width", (g) => (g.stage === "regular" ? 1.5 : 2.5));
      // `first` is true on mount and again when the pair changes (new deps), not on a plain resize.
      if (first && !reduced) {
        const step = Math.min(18, 900 / Math.max(1, games.length));
        line.attr("y2", mid).transition().duration(600).delay((_, i) => i * step).ease(d3.easeCubicOut).attr("y2", (g) => y(g.aCats - g.bCats));
        dot.attr("cy", mid).transition().duration(600).delay((_, i) => i * step).ease(d3.easeCubicOut).attr("cy", (g) => y(g.aCats - g.bCats));
      }
    },
    [games, years, maxWeek, maxCats, aId, a, b],
    300,
  );
  return <div ref={ref} style={{ minHeight: 170 }} />;
}
