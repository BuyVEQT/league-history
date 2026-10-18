"use client";

import * as d3 from "d3";
import { formatPct } from "@/lib/analytics/format";
import { scorelineKind, type ScorelineKind } from "@/lib/analytics/recordsView";
import type { ScorelineSummary } from "@/lib/analytics/scorelines";
import { freshSvg, settle } from "./recordsD3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

const SCORELINE_COLORS: Record<ScorelineKind, string> = {
  close: "var(--accent)",
  mid: "var(--s1)",
  blowout: "var(--foreground)",
  sweep: "var(--gold)",
};

const NOTE: Record<ScorelineKind, string> = {
  close: "Decided by one category (or level)",
  mid: "Won by 2-6 categories",
  blowout: "A blowout (7+)",
  sweep: "A clean sweep",
};

/** How often each final score happens, most common first, coloured by margin. */
export function ScorelineHistogram({ rows }: { rows: ScorelineSummary["rows"] }) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      const animate = first && !reduced;
      const shown = rows.slice(0, W < 420 ? 6 : W < 560 ? 8 : 12);
      const H = 280;
      const m = { t: 22, r: 8, b: 30, l: 8 };
      const svg = freshSvg(el, W, H, "How often each final score happens");
      if (!shown.length) return;
      const x = d3.scaleBand().domain(shown.map((r) => r.score)).range([m.l, W - m.r]).padding(0.22);
      const y = d3.scaleLinear().domain([0, Math.max(...shown.map((r) => r.count))]).range([H - m.b, m.t]);
      const g = svg
        .append("g")
        .selectAll("g")
        .data(shown)
        .join("g")
        .attr("data-tt", (r) =>
          tt(
            `Final score ${r.score}`,
            [
              ["Matchups", r.count],
              ["Share", formatPct(r.share, 1)],
            ],
            NOTE[scorelineKind(r.score)],
          ),
        );
      g.append("rect").attr("x", (r) => x(r.score)!).attr("width", x.bandwidth()).attr("y", 0).attr("height", H).attr("fill", "transparent");
      settle(
        g
          .append("rect")
          .attr("x", (r) => x(r.score)!)
          .attr("width", x.bandwidth())
          .attr("rx", 4)
          .attr("fill", (r) => SCORELINE_COLORS[scorelineKind(r.score)]),
        animate,
        { y: H - m.b, height: 0 },
        { y: (r: { count: number }) => y(r.count), height: (r: { count: number }) => H - m.b - y(r.count) },
        { duration: 700, delay: (_: never, i: number) => i * 40 },
      );
      settle(
        g
          .append("text")
          .attr("class", "lbl num")
          .attr("x", (r) => x(r.score)! + x.bandwidth() / 2)
          .attr("y", (r) => y(r.count) - 6)
          .attr("text-anchor", "middle")
          .style("fill", "var(--ink-2)")
          .text((r) => formatPct(r.share, 0)),
        animate,
        { opacity: 0 },
        { opacity: 1 },
        { duration: 300, delay: (_: never, i: number) => 450 + i * 40, style: true },
      );
      g.append("text")
        .attr("class", "ink num")
        .attr("x", (r) => x(r.score)! + x.bandwidth() / 2)
        .attr("y", H - 10)
        .attr("text-anchor", "middle")
        .text((r) => r.score);
    },
    [rows],
  );
  return <div ref={ref} style={{ minHeight: 280 }} />;
}
