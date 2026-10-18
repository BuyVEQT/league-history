"use client";

import * as d3 from "d3";
import type { StreakRow } from "@/lib/analytics/streaks";
import { clip, freshSvg, settle } from "./recordsD3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

/** Longest streaks, each bar placed where the run fell on its season's week axis (W blue, L red), length in the bar. */
export function StreakBars({
  rows,
  names,
  lastWeek,
  kind,
}: {
  rows: StreakRow[];
  names: Record<string, string>;
  /** Last regular-season week, by season year. */
  lastWeek: Record<number, number>;
  kind: "W" | "L";
}) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      const animate = first && !reduced;
      const rh = 34;
      const m = { t: 18, r: 10, l: W < 420 ? 96 : 130 };
      const H = m.t + rows.length * rh;
      const color = kind === "W" ? "var(--pos)" : "var(--neg)";
      const maxWk = Math.max(1, ...rows.map((r) => lastWeek[r.year] ?? r.toWeek));
      const svg = freshSvg(el, W, H, kind === "W" ? "Longest winning streaks, placed on the season's weeks" : "Longest losing streaks, placed on the season's weeks");
      const x = d3.scaleLinear().domain([1, maxWk + 1]).range([m.l, W - m.r]);
      const ticks = [1, ...d3.range(5, maxWk + 1, 5)];
      for (const w of ticks) svg.append("text").attr("class", "lbl num").attr("x", x(w)).attr("y", 10).attr("text-anchor", "middle").text(`wk ${w}`);
      const g = svg
        .append("g")
        .selectAll("g")
        .data(rows)
        .join("g")
        .attr("transform", (_, i) => `translate(0,${m.t + i * rh})`)
        .attr("data-tt", (r) =>
          tt(r.teamName, [
            ["Manager", names[r.managerId] ?? r.managerId],
            ["Season", r.label],
            ["Streak", `${r.length} straight ${kind === "W" ? "wins" : "losses"}`],
            ["Weeks", `${r.fromWeek}–${r.toWeek} of ${lastWeek[r.year] ?? "?"}`],
          ]),
        );
      g.append("text")
        .attr("class", "ink")
        .attr("x", m.l - 10)
        .attr("y", rh / 2 - 6)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text((r) => clip(names[r.managerId] ?? r.managerId, 14));
      g.append("text").attr("class", "lbl").attr("x", m.l - 10).attr("y", rh / 2 + 8).attr("dy", ".35em").attr("text-anchor", "end").text((r) => r.label);
      g.append("rect").attr("x", m.l).attr("width", W - m.l - m.r).attr("y", rh / 2 - 9).attr("height", 18).attr("rx", 4).attr("fill", "var(--surface-2)");
      // Season length: a faint end marker so a run that ends the season reads as such.
      g.append("line")
        .attr("x1", (r) => x((lastWeek[r.year] ?? maxWk) + 1))
        .attr("x2", (r) => x((lastWeek[r.year] ?? maxWk) + 1))
        .attr("y1", rh / 2 - 9)
        .attr("y2", rh / 2 + 9)
        .attr("stroke", "var(--border-2)");
      settle(
        g.append("rect").attr("x", (r) => x(r.fromWeek)).attr("y", rh / 2 - 9).attr("height", 18).attr("rx", 4).attr("fill", color),
        animate,
        { width: 0 },
        { width: (r: StreakRow) => x(r.toWeek + 1) - x(r.fromWeek) },
        { duration: 700, delay: (_: never, i: number) => i * 60 },
      );
      settle(
        g
          .append("text")
          .attr("x", (r) => x(r.fromWeek) + 7)
          .attr("y", rh / 2)
          .attr("dy", ".35em")
          .attr("pointer-events", "none")
          .style("fill", "#fff")
          .style("font-weight", 800)
          .style("font-size", "12px")
          .text((r) => r.length),
        animate,
        { opacity: 0 },
        { opacity: 1 },
        { duration: 300, delay: (_: never, i: number) => 400 + i * 60, style: true },
      );
    },
    [rows, names, lastWeek, kind],
    300,
  );
  return <div ref={ref} style={{ minHeight: 18 + rows.length * 34 }} />;
}
