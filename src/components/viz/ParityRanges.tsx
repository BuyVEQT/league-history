"use client";

import * as d3 from "d3";
import { formatPct } from "@/lib/analytics/format";
import type { ParityRow } from "@/lib/analytics/records";
import { freshSvg, settle } from "./recordsD3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

/** Worst→best win % per season, an orange tick at the last playoff seed; the most even season in blue. */
export function ParityRanges({ rows }: { rows: ParityRow[] }) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      const animate = first && !reduced;
      const rh = 36;
      const m = { t: 24, r: 62, l: 70 };
      const H = m.t + rows.length * rh;
      const svg = freshSvg(el, W, H, "Range of win % in each season, worst to best, with the last playoff seed marked");
      if (!rows.length) return;
      const lo = Math.min(...rows.map((r) => r.worst)) - 0.02;
      const hi = Math.max(...rows.map((r) => r.best)) + 0.02;
      const x = d3.scaleLinear().domain([lo, hi]).range([m.l, W - m.r]);
      const ticks = x.ticks(W < 420 ? 3 : 5).filter((v) => Math.abs(v * 20 - Math.round(v * 20)) < 1e-9);
      for (const v of ticks) {
        svg
          .append("line")
          .attr("x1", x(v))
          .attr("x2", x(v))
          .attr("y1", m.t - 6)
          .attr("y2", H)
          .attr("stroke", Math.abs(v - 0.5) < 1e-9 ? "var(--border-2)" : "var(--border)");
        svg.append("text").attr("class", "lbl num").attr("x", x(v)).attr("y", 12).attr("text-anchor", "middle").text(`${Math.round(v * 100)}%`);
      }
      const tight = Math.min(...rows.map((r) => r.spread));
      const g = svg
        .append("g")
        .selectAll("g")
        .data(rows)
        .join("g")
        .attr("transform", (_, i) => `translate(0,${m.t + i * rh})`)
        .attr("data-tt", (r) =>
          tt(
            r.label,
            [
              ["Best", formatPct(r.best)],
              ["Worst", formatPct(r.worst)],
              ["Spread (SD)", `±${(r.spread * 100).toFixed(1)} pts`],
              ["1st to last playoff seed", r.bubbleGap === null ? "—" : `${(r.bubbleGap * 100).toFixed(1)} pts`],
            ],
            r.spread === tight ? "Most even season" : "",
          ),
        );
      g.append("rect").attr("width", W).attr("height", rh).attr("fill", "transparent");
      g.append("text").attr("class", "ink").attr("x", m.l - 10).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").text((r) => r.label);
      const mid = (r: ParityRow) => x((r.best + r.worst) / 2);
      settle(
        g
          .append("line")
          .attr("y1", rh / 2)
          .attr("y2", rh / 2)
          .attr("stroke", (r) => (r.spread === tight ? "var(--s1)" : "var(--border-2)"))
          .attr("stroke-width", 10)
          .attr("stroke-linecap", "round"),
        animate,
        { x1: mid, x2: mid },
        { x1: (r: ParityRow) => x(r.worst), x2: (r: ParityRow) => x(r.best) },
        { duration: 700, delay: (_: never, i: number) => i * 40 },
      );
      settle(
        g
          .filter((r) => r.bubbleGap !== null)
          .append("line")
          .attr("x1", (r) => x(r.best - r.bubbleGap!))
          .attr("x2", (r) => x(r.best - r.bubbleGap!))
          .attr("y1", rh / 2 - 9)
          .attr("y2", rh / 2 + 9)
          .attr("stroke", "var(--accent)")
          .attr("stroke-width", 3),
        animate,
        { opacity: 0 },
        { opacity: 1 },
        { duration: 300, delay: (_: never, i: number) => 600 + i * 40 },
      );
      g.append("text")
        .attr("class", "lbl num")
        .attr("x", W - m.r + 10)
        .attr("y", rh / 2)
        .attr("dy", ".35em")
        .style("fill", "var(--ink-2)")
        .text((r) => `±${(r.spread * 100).toFixed(1)}`);
    },
    [rows],
  );
  return <div ref={ref} style={{ minHeight: 24 + rows.length * 36 }} />;
}
