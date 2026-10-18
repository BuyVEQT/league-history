"use client";

import * as d3 from "d3";
import { signed } from "@/components/draft";
import type { luckMini } from "@/lib/analytics/managerView";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

type Data = ReturnType<typeof luckMini>;

/** Matchup luck per season as diverging bars: up and blue = won more weeks than deserved, down and red = fewer. */
export function LuckMini({ data, years, name }: { data: Data; years: { year: number; label: string }[]; name: string }) {
  const ref = useD3Chart(
    (el, { width, reduced, first }) => {
      el.selectAll("*").remove();
      if (!data.rows.length) return;
      const W = width;
      const H = 54;
      const x = d3
        .scaleBand<number>()
        .domain(years.map((y) => y.year))
        .range([0, W])
        .padding(0.25);
      const mx = data.maxAbs || 1;
      const y = d3.scaleLinear().domain([-mx, mx]).range([H - 2, 2]);
      const svg = el
        .append("svg")
        .attr("class", "viz")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("role", "img")
        .attr("aria-label", `${name}'s matchup luck by season: ${data.rows.map((r) => `${r.label} ${signed(r.luck, 1)}`).join(", ")}`);
      svg.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "var(--border-2)");
      const top = (v: number) => Math.min(y(0), y(v));
      const h = (v: number) => Math.max(1.5, Math.abs(y(v) - y(0)));
      const bars = svg
        .selectAll("rect.b")
        .data(data.rows)
        .join("rect")
        .attr("class", "b")
        .attr("x", (r) => x(r.year) ?? 0)
        .attr("width", x.bandwidth())
        .attr("rx", 2)
        .attr("fill", (r) => (r.luck >= 0 ? "var(--pos)" : "var(--neg)"))
        .attr("y", (r) => top(r.luck))
        .attr("height", (r) => h(r.luck))
        .attr("data-tt", (r) =>
          tt(`${r.teamName} · ${r.label}`, [
            ["Matchups won", r.actual],
            ["Expected", r.expected.toFixed(1)],
            ["Luck", signed(r.luck, 1)],
          ]),
        );
      if (first && !reduced) {
        bars
          .attr("y", y(0))
          .attr("height", 0)
          .transition()
          .delay((_, i) => i * 60)
          .duration(450)
          .ease(d3.easeCubicOut)
          .attr("y", (r) => top(r.luck))
          .attr("height", (r) => h(r.luck));
      }
    },
    [data, years, name],
    120,
  );
  return <div ref={ref} className="fs-chart" />;
}
