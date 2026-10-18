"use client";

import * as d3 from "d3";
import { signed } from "@/components/draft";
import type { LuckRow } from "@/lib/analytics/whatIf";
import { freshSvg, settle } from "./recordsD3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

/** Every team-season: expected matchup wins (across) against actual (up). Above the diagonal = lucky. */
export function LuckScatter({ rows, names }: { rows: LuckRow[]; names: Record<string, string> }) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      const animate = first && !reduced;
      const H = 340;
      const m = { t: 18, r: 14, b: 40, l: 44 };
      const svg = freshSvg(el, W, H, "Expected against actual matchup wins for every team-season");
      if (!rows.length) return;
      const lo = Math.floor(Math.min(...rows.map((r) => Math.min(r.actual, r.expected))) - 0.5);
      const hi = Math.ceil(Math.max(...rows.map((r) => Math.max(r.actual, r.expected))) + 0.5);
      const x = d3.scaleLinear().domain([lo, hi]).range([m.l, W - m.r]);
      const y = d3.scaleLinear().domain([lo, hi]).range([H - m.b, m.t]);
      svg.append("path").attr("d", `M${x(lo)},${y(lo)}L${x(hi)},${y(hi)}L${x(lo)},${y(hi)}Z`).attr("fill", "var(--pos-wash)").attr("opacity", 0.45);
      for (const t of x.ticks(6)) {
        svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", m.t).attr("y2", H - m.b).attr("stroke", "var(--border)").attr("opacity", 0.6);
        svg.append("text").attr("class", "lbl num").attr("x", x(t)).attr("y", H - m.b + 16).attr("text-anchor", "middle").text(t);
      }
      for (const t of y.ticks(6)) {
        svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", "var(--border)").attr("opacity", 0.6);
        svg.append("text").attr("class", "lbl num").attr("x", m.l - 8).attr("y", y(t)).attr("dy", ".35em").attr("text-anchor", "end").text(t);
      }
      svg.append("line").attr("x1", x(lo)).attr("y1", y(lo)).attr("x2", x(hi)).attr("y2", y(hi)).attr("stroke", "var(--ink-2)").attr("stroke-dasharray", "4 4");
      svg.append("text").attr("class", "lbl").attr("x", x(lo) + 8).attr("y", y(hi) + 14).style("font-weight", 700).style("fill", "var(--pos)").text("LUCKY ↖");
      svg.append("text").attr("class", "lbl").attr("x", x(hi) - 8).attr("y", y(lo) - 8).attr("text-anchor", "end").style("font-weight", 700).style("fill", "var(--neg)").text("↘ UNLUCKY");
      svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 4).attr("text-anchor", "end").text("weeks they should have won →");
      svg.append("text").attr("class", "lbl").attr("x", m.l).attr("y", m.t - 6).text("weeks won ↑");
      const c = svg
        .append("g")
        .selectAll("circle")
        .data(rows)
        .join("circle")
        .attr("data-m", (r) => r.managerId)
        .attr("cx", (r) => x(r.expected))
        .attr("cy", (r) => y(r.actual))
        .attr("fill", (r) => (r.luck >= 0 ? "var(--pos)" : "var(--neg)"))
        .attr("fill-opacity", (r) => 0.35 + Math.min(0.6, Math.abs(r.luck) / 3))
        .attr("stroke", "var(--surface)")
        .attr("data-tt", (r) =>
          tt(`${r.teamName} · ${r.label}`, [
            ["Manager", names[r.managerId] ?? r.managerId],
            ["Weeks won", r.actual],
            ["Expected", r.expected.toFixed(1)],
            ["Luck", `${signed(r.luck, 1)} weeks`],
          ]),
        );
      settle(c, animate, { r: 0 }, { r: 5.5 }, { duration: 500, delay: (_: never, i: number) => i * 6 });
      const ends = rows.length > 1 ? [rows[0], rows[rows.length - 1]] : rows;
      ends.forEach((r, i) => {
        const right = i === 1 || x(r.expected) < m.l + 120;
        svg
          .append("text")
          .attr("class", "ink")
          .attr("data-m", r.managerId)
          .attr("pointer-events", "none")
          .attr("x", x(r.expected) + (right ? 9 : -9))
          .attr("y", y(r.actual))
          .attr("dy", ".35em")
          .attr("text-anchor", right ? "start" : "end")
          .text(`${names[r.managerId] ?? r.managerId} ${r.label}`);
      });
    },
    [rows, names],
  );
  return <div ref={ref} style={{ minHeight: 340 }} />;
}

/** Career matchup luck per manager: diverging bars from zero, blue = lucky, red = unlucky. */
export function LuckCareerBars({ rows, names }: { rows: { managerId: string; seasons: number; luck: number }[]; names: Record<string, string> }) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      const animate = first && !reduced;
      const rh = 24;
      const m = { t: 4, r: 44, l: 84 };
      const H = m.t + rows.length * rh;
      const svg = freshSvg(el, W, H, "Career matchup luck by manager");
      const mx = Math.max(0.5, ...rows.map((r) => Math.abs(r.luck)));
      const x = d3.scaleLinear().domain([-mx, mx]).range([m.l, W - m.r]);
      svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", H).attr("stroke", "var(--border-2)");
      const g = svg
        .append("g")
        .selectAll("g")
        .data(rows)
        .join("g")
        .attr("data-m", (r) => r.managerId)
        .attr("transform", (_, i) => `translate(0,${m.t + i * rh})`)
        .attr("data-tt", (r) =>
          tt(names[r.managerId] ?? r.managerId, [
            ["Career luck", `${signed(r.luck, 1)} weeks`],
            ["Seasons", r.seasons],
          ]),
        );
      g.append("rect").attr("width", W).attr("height", rh).attr("fill", "transparent");
      g.append("text")
        .attr("class", "ink")
        .attr("x", m.l - 8)
        .attr("y", rh / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text((r) => names[r.managerId] ?? r.managerId);
      settle(
        g
          .append("rect")
          .attr("y", 5)
          .attr("height", rh - 10)
          .attr("rx", 3)
          .attr("fill", (r) => (r.luck >= 0 ? "var(--pos)" : "var(--neg)")),
        animate,
        { x: x(0), width: 0 },
        { x: (r: { luck: number }) => Math.min(x(0), x(r.luck)), width: (r: { luck: number }) => Math.abs(x(r.luck) - x(0)) },
        { duration: 600, delay: (_: never, i: number) => i * 30 },
      );
      g.append("text")
        .attr("class", "lbl num")
        .attr("x", W - m.r + 6)
        .attr("y", rh / 2)
        .attr("dy", ".35em")
        .style("fill", "var(--ink-2)")
        .text((r) => signed(r.luck, 1));
    },
    [rows, names],
    240,
  );
  return <div ref={ref} style={{ minHeight: 4 + rows.length * 24 }} />;
}
