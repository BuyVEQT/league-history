"use client";

import * as d3 from "d3";
import { ordinal as ord } from "@/lib/analytics/format";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

export type WireScatterRow = { key: string; managerId?: string; teamName: string; manager: string; label: string; moves: number; final: number; finalLabel: string; teams: number };

/** Every team-season: adds & drops (x) against final finish (y, 1st at top). Champions in gold. Drawn at the container's width. */
export function WireScatter({ rows }: { rows: WireScatterRow[] }) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      el.selectAll("*").remove();
      const H = W < 460 ? 200 : 230;
      const m = { t: 10, r: 14, b: 34, l: 40 };
      const maxTeams = Math.max(12, ...rows.map((r) => r.teams));
      const x = d3
        .scaleLinear()
        .domain([0, Math.max(20, d3.max(rows, (r) => r.moves) ?? 0)])
        .nice()
        .range([m.l, W - m.r]);
      const y = d3.scaleLinear().domain([1, maxTeams]).range([m.t, H - m.b]);
      const svg = el
        .append("svg")
        .attr("class", "viz")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("role", "img")
        .attr("aria-label", "Adds and drops against final finish for every team-season; champions in gold");
      const yTicks = [1, 4, 8, maxTeams];
      svg
        .append("g")
        .selectAll("line")
        .data(yTicks)
        .join("line")
        .attr("x1", m.l)
        .attr("x2", W - m.r)
        .attr("y1", (t) => y(t))
        .attr("y2", (t) => y(t))
        .attr("stroke", "var(--border)");
      svg
        .append("g")
        .selectAll("text")
        .data(yTicks)
        .join("text")
        .attr("class", "lbl num")
        .attr("x", m.l - 6)
        .attr("y", (t) => y(t))
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text((t) => ord(t));
      svg.append("line").attr("x1", m.l).attr("x2", m.l).attr("y1", m.t).attr("y2", H - m.b).attr("stroke", "var(--border-2)");
      svg
        .append("g")
        .selectAll("text")
        .data(x.ticks(W < 460 ? 4 : 6))
        .join("text")
        .attr("class", "lbl num")
        .attr("x", (t) => x(t))
        .attr("y", H - m.b + 16)
        .attr("text-anchor", "middle")
        .text((t) => t);
      svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 4).attr("text-anchor", "end").text("adds & drops that season →");
      // Champions last so the gold dots sit on top.
      const data = [...rows].sort((a, b) => Number(a.final === 1) - Number(b.final === 1));
      const dots = svg
        .append("g")
        .selectAll("circle")
        .data(data)
        .join("circle")
        .attr("data-m", (d) => d.managerId ?? null)
        .attr("cx", (d) => x(d.moves))
        .attr("cy", (d) => y(d.final))
        .attr("fill", (d) => (d.final === 1 ? "var(--gold)" : "var(--s1)"))
        .attr("fill-opacity", 0.7)
        .attr("stroke", "var(--surface)")
        .attr("data-tt", (d) =>
          tt(d.teamName, [
            ["Manager", d.manager],
            ["Season", d.label],
            ["Moves", d.moves],
            ["Final finish", d.finalLabel],
          ]),
        );
      if (first && !reduced) {
        dots
          .attr("r", 0)
          .transition()
          .duration(400)
          .delay((_, i) => Math.min(i * 5, 600))
          .attr("r", 4.5);
      } else dots.attr("r", 4.5);
    },
    [rows],
  );
  return <div ref={ref} />;
}
