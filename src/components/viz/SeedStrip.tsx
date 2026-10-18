"use client";

import * as d3 from "d3";
import { ordinal } from "@/lib/analytics/format";
import type { SeedStripSeason } from "@/lib/analytics/recordsView";
import { freshSvg, settle } from "./recordsD3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

/** Each season's playoff field as a column of seeds; a gold dot drops (and bounces) to the champion's seed. */
export function SeedStrip({ rows, names }: { rows: SeedStripSeason[]; names: Record<string, string> }) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      const animate = first && !reduced;
      const maxSeed = Math.max(2, ...rows.map((r) => Math.max(r.spots, r.championSeed ?? 0)));
      const H = 250;
      const m = { t: 14, r: 10, b: 54, l: 52 };
      const svg = freshSvg(el, W, H, "Champion's playoff seed each season, and where the #1 seed finished");
      const x = d3.scaleBand<number>().domain(rows.map((r) => r.year)).range([m.l, W - m.r]).padding(0.3);
      const y = d3.scaleLinear().domain([1, maxSeed]).range([m.t + 8, H - m.b - 8]);
      for (let k = 1; k <= maxSeed; k++) {
        svg.append("text").attr("class", "lbl num").attr("x", m.l - 12).attr("y", y(k)).attr("dy", ".35em").attr("text-anchor", "end").text(`#${k}`);
      }
      svg.append("text").attr("class", "lbl").attr("x", 0).attr("y", m.t - 2).style("font-weight", 700).text("SEED");
      const label = (r: SeedStripSeason) => r.label;
      const g = svg
        .append("g")
        .selectAll("g")
        .data(rows)
        .join("g")
        .attr("transform", (r) => `translate(${x(r.year)! + x.bandwidth() / 2},0)`)
        .attr("data-tt", (r) =>
          tt(r.label, [
            ["Champion", r.championManagerId ? `${names[r.championManagerId] ?? r.championManagerId} (#${r.championSeed} seed)` : "Not decided yet"],
            ["Playoff teams", r.spots],
            ["#1 seed", `${r.topSeedTeam} (${names[r.topSeedManagerId] ?? r.topSeedManagerId})`],
            ["#1 seed finished", r.topSeedFinish === 1 ? "Won it" : ordinal(r.topSeedFinish)],
          ]),
        );
      g.append("rect").attr("x", -x.bandwidth() / 2).attr("width", x.bandwidth()).attr("y", 0).attr("height", H).attr("fill", "transparent");
      g.append("line")
        .attr("y1", y(1))
        .attr("y2", (r) => y(Math.max(1, r.spots)))
        .attr("stroke", "var(--border)")
        .attr("stroke-width", 10)
        .attr("stroke-linecap", "round");
      g.each(function (r) {
        d3.select(this)
          .selectAll("circle.s")
          .data(d3.range(1, r.spots + 1))
          .join("circle")
          .attr("class", "s")
          .attr("cy", (k) => y(k))
          .attr("r", 3)
          .attr("fill", "var(--border-2)");
      });
      const champs = g.filter((r) => r.championSeed !== null);
      settle(
        champs.append("circle").attr("r", 11).attr("fill", "var(--gold)").attr("stroke", "var(--surface)").attr("stroke-width", 3),
        animate,
        { cy: y(1) },
        { cy: (r: SeedStripSeason) => y(r.championSeed!) },
        { duration: 900, delay: (_: never, i: number) => 150 + i * 90, ease: d3.easeBounceOut },
      );
      settle(
        champs
          .append("text")
          .attr("y", (r) => y(r.championSeed!))
          .attr("dy", ".35em")
          .attr("text-anchor", "middle")
          .attr("pointer-events", "none")
          .style("font-size", "10px")
          .style("font-weight", 800)
          .style("fill", "#fff")
          .text((r) => r.championSeed!),
        animate,
        { opacity: 0 },
        { opacity: 1 },
        { duration: 250, delay: (_: never, i: number) => 1050 + i * 90, style: true },
      );
      g.append("text").attr("class", "ink").attr("y", H - m.b + 18).attr("text-anchor", "middle").text(label);
      g.append("text")
        .attr("class", "lbl")
        .attr("y", H - m.b + 34)
        .attr("text-anchor", "middle")
        .text((r) => (x.bandwidth() < 70 ? `#1: ${ordinal(r.topSeedFinish)}` : `#1 seed: ${ordinal(r.topSeedFinish)}`));
    },
    [rows, names],
    Math.max(280, rows.length * 80),
  );
  return (
    <div className="overflow-x-auto">
      <div ref={ref} className="rec-chart" style={{ minHeight: 250 }} />
    </div>
  );
}
