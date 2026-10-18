"use client";

import * as d3 from "d3";
import type { ConsistencyRow } from "@/lib/analytics/records";
import { freshSvg, settle } from "./recordsD3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

/** Typical finish (across) against year-to-year swing (up); names in a column on the right with leader lines. */
export function SteadyScatter({ rows, titles, names }: { rows: ConsistencyRow[]; titles: Record<string, number>; names: Record<string, string> }) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      const animate = first && !reduced;
      const H = 340;
      const m = { t: 18, r: W < 420 ? 84 : 110, b: 40, l: 46 };
      const svg = freshSvg(el, W, H, "Typical finish against year-to-year swing, by manager");
      if (!rows.length) return;
      const x = d3
        .scaleLinear()
        .domain([0, Math.max(0.8, Math.max(...rows.map((r) => r.avgPercentile)) + 0.05)])
        .range([m.l, W - m.r]);
      const y = d3
        .scaleLinear()
        .domain([0, Math.max(...rows.map((r) => r.spread)) * 1.15 || 0.1])
        .range([H - m.b, m.t])
        .nice();
      const yTop = y.domain()[1];
      svg
        .append("rect")
        .attr("x", m.l)
        .attr("y", y(yTop / 2))
        .attr("width", x(0.5) - m.l)
        .attr("height", H - m.b - y(yTop / 2))
        .attr("fill", "var(--pos-wash)")
        .attr("opacity", 0.6);
      svg.append("text").attr("class", "lbl").attr("x", m.l + 6).attr("y", H - m.b - 8).text("always near the top");
      for (const t of W < 420 ? [0, 0.4, 0.8].filter((v) => v <= x.domain()[1]) : x.ticks(5)) {
        svg
          .append("text")
          .attr("class", "lbl num")
          .attr("x", x(t))
          .attr("y", H - m.b + 16)
          .attr("text-anchor", "middle")
          .text(t === 0 ? "1st" : `top ${Math.round(t * 100)}%`);
      }
      for (const t of y.ticks(4)) {
        svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", "var(--border)");
        svg.append("text").attr("class", "lbl num").attr("x", m.l - 6).attr("y", y(t)).attr("dy", ".35em").attr("text-anchor", "end").text(`±${Math.round(t * 100)}%`);
      }
      svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 4).attr("text-anchor", "end").text("typical finish →");
      svg.append("text").attr("class", "lbl").attr("x", m.l).attr("y", m.t - 6).text("↑ swing");
      // Names sit in a column on the right, in the dots' vertical order, 15px apart, with leader lines to each dot.
      const colX = W - m.r + 14;
      const labs = rows.map((r) => ({ r, x0: x(r.avgPercentile), y0: y(r.spread), y: 0 })).sort((p, q) => p.y0 - q.y0);
      const span = (labs.length - 1) * 15;
      const mid = d3.mean(labs, (l) => l.y0) ?? H / 2;
      const top = Math.max(m.t, Math.min(mid - span / 2, H - m.b - span));
      labs.forEach((l, i) => (l.y = top + i * 15));
      const lg = svg.append("g").attr("pointer-events", "none");
      settle(
        lg
          .selectAll("path")
          .data(labs)
          .join("path")
          .attr("data-m", (l) => l.r.managerId)
          .attr("fill", "none")
          .attr("stroke", "var(--border-2)")
          .attr("d", (l) => `M${l.x0 + 8},${l.y0}C${colX - 30},${l.y0} ${colX - 30},${l.y} ${colX - 4},${l.y}`),
        animate,
        { opacity: 0 },
        { opacity: 1 },
        { duration: 400, delay: (_: never, i: number) => 300 + i * 30 },
      );
      lg.selectAll("text")
        .data(labs)
        .join("text")
        .attr("class", "ink")
        .attr("data-m", (l) => l.r.managerId)
        .attr("x", colX)
        .attr("y", (l) => l.y)
        .attr("dy", ".35em")
        .text((l) => names[l.r.managerId] ?? l.r.managerId);
      settle(
        svg
          .append("g")
          .selectAll("circle")
          .data(rows)
          .join("circle")
          .attr("data-m", (r) => r.managerId)
          .attr("cx", (r) => x(r.avgPercentile))
          .attr("cy", (r) => y(r.spread))
          .attr("fill", (r) => (titles[r.managerId] ? "var(--gold)" : "var(--s1)"))
          .attr("stroke", "var(--surface)")
          .attr("stroke-width", 2)
          .attr("data-tt", (r) =>
            tt(names[r.managerId] ?? r.managerId, [
              ["Seasons", r.seasons],
              ["Typical finish", `top ${Math.round(r.avgPercentile * 100)}%`],
              ["Swing", `±${Math.round(r.spread * 100)}%`],
              ["Titles", titles[r.managerId] ?? 0],
            ]),
          ),
        animate,
        { r: 0 },
        { r: 7 },
        { duration: 500, delay: (_: never, i: number) => i * 40 },
      );
    },
    [rows, titles, names],
  );
  return <div ref={ref} style={{ minHeight: 340 }} />;
}
