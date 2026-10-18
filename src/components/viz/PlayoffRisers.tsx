"use client";

import * as d3 from "d3";
import { useMemo } from "react";
import { signed } from "@/components/draft";
import { ordinal } from "@/lib/analytics/format";
import type { PlayoffRow } from "@/lib/analytics/records";
import { freshSvg, settle } from "./recordsD3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

/** An arrow per manager from average playoff seed to average final finish: pointing left = finishes better than seeded. */
export function PlayoffRisers({ rows, names }: { rows: PlayoffRow[]; names: Record<string, string> }) {
  const sorted = useMemo(() => rows.filter((r) => r.appearances).sort((a, b) => b.avgOverSeed - a.avgOverSeed), [rows]);
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      const animate = first && !reduced;
      const narrow = W < 560;
      const rh = 30;
      const m = { t: 26, r: narrow ? 64 : 160, b: 8, l: narrow ? 74 : 96 };
      const H = m.t + m.b + sorted.length * rh;
      const svg = freshSvg(el, W, H, "Average playoff seed against average final finish, by manager");
      const hi = Math.max(8, Math.ceil(Math.max(...sorted.flatMap((r) => [r.avgSeed, r.avgFinish]))));
      const x = d3.scaleLinear().domain([1, hi]).range([m.l, W - m.r]);
      for (let v = 1; v <= hi; v++) {
        svg.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t - 6).attr("y2", H - m.b).attr("stroke", "var(--border)");
        if (!narrow || v % 2 === 1) svg.append("text").attr("class", "lbl num").attr("x", x(v)).attr("y", 12).attr("text-anchor", "middle").text(ordinal(v));
      }
      const defs = svg.append("defs");
      for (const k of ["pos", "neg"]) {
        defs
          .append("marker")
          .attr("id", `rec-ar-${k}`)
          .attr("viewBox", "0 0 10 10")
          .attr("refX", 8)
          .attr("refY", 5)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto-start-reverse")
          .append("path")
          .attr("d", "M0,0L10,5L0,10z")
          .attr("fill", `var(--${k})`);
      }
      const g = svg
        .append("g")
        .selectAll("g")
        .data(sorted)
        .join("g")
        .attr("transform", (_, i) => `translate(0,${m.t + i * rh})`)
        .attr("data-tt", (r) =>
          tt(names[r.managerId] ?? r.managerId, [
            ["Playoff trips", r.appearances],
            ["Avg seed", r.avgSeed.toFixed(1)],
            ["Avg finish", r.avgFinish.toFixed(1)],
            ["Places gained", signed(r.avgOverSeed, 1)],
            ["Playoff W-L", `${r.playoffWins}-${r.playoffLosses}`],
            ["Finals / titles", `${r.finals} / ${r.titles}`],
          ]),
        );
      g.append("rect").attr("width", W).attr("height", rh).attr("fill", "transparent");
      g.append("text")
        .attr("class", "ink")
        .attr("x", m.l - 12)
        .attr("y", rh / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text((r) => names[r.managerId] ?? r.managerId);
      const arrow = (r: PlayoffRow) => Math.abs(r.avgOverSeed) > 0.15;
      settle(
        g
          .append("line")
          .attr("y1", rh / 2)
          .attr("y2", rh / 2)
          .attr("x1", (r) => x(r.avgSeed))
          .attr("stroke", (r) => (r.avgOverSeed >= 0 ? "var(--pos)" : "var(--neg)"))
          .attr("stroke-width", 3)
          .attr("marker-end", (r) => (arrow(r) ? `url(#rec-ar-${r.avgOverSeed >= 0 ? "pos" : "neg"})` : null)),
        animate,
        { x2: (r: PlayoffRow) => x(r.avgSeed) },
        // Pull the line back a touch so the arrowhead's tip lands on the finish.
        { x2: (r: PlayoffRow) => x(r.avgFinish) + (arrow(r) ? (r.avgOverSeed > 0 ? 4 : -4) : 0) },
        { duration: 800, delay: (_: never, i: number) => i * 40, ease: d3.easeCubicOut },
      );
      g.append("circle")
        .attr("cx", (r) => x(r.avgSeed))
        .attr("cy", rh / 2)
        .attr("r", 4)
        .attr("fill", "var(--surface)")
        .attr("stroke", "var(--ink-2)")
        .attr("stroke-width", 1.5);
      g.append("text")
        .attr("class", "lbl num")
        .attr("x", W - m.r + 12)
        .attr("y", rh / 2)
        .attr("dy", ".35em")
        .style("fill", "var(--ink-2)")
        .text((r) =>
          narrow ? signed(r.avgOverSeed, 1) : `${signed(r.avgOverSeed, 1)} · ${r.playoffWins}-${r.playoffLosses}${r.titles ? ` · ${r.titles} title${r.titles > 1 ? "s" : ""}` : ""}`,
        );
    },
    [sorted, names],
  );
  return <div ref={ref} style={{ minHeight: 34 + sorted.length * 30 }} />;
}
