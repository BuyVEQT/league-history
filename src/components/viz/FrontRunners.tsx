"use client";

import * as d3 from "d3";
import { ordinal } from "@/lib/analytics/format";
import type { FrontRunnerRecord } from "@/lib/analytics/race";
import { clip, freshSvg, settle } from "./recordsD3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

/** Share of the regular season spent in first place; gold when that team went on to win the title. */
export function FrontRunners({ rows, names }: { rows: FrontRunnerRecord[]; names: Record<string, string> }) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      const animate = first && !reduced;
      const rh = 34;
      const m = { t: 4, r: 96, l: W < 420 ? 120 : 170 };
      const H = m.t + rows.length * rh;
      const svg = freshSvg(el, W, H, "Team-seasons that spent the most of the regular season in first place");
      const x = d3.scaleLinear().domain([0, 1]).range([0, W - m.l - m.r]);
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
            ["Weeks in first", `${r.weeksInFirst} of ${r.weeks}`],
            ["Finished", r.finalRank === 1 ? "Champion" : ordinal(r.finalRank)],
          ]),
        );
      g.append("rect").attr("x", 0).attr("width", W).attr("height", rh).attr("fill", "transparent");
      g.append("text")
        .attr("class", "ink")
        .attr("x", m.l - 10)
        .attr("y", rh / 2 - 7)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text((r) => clip(r.teamName, W < 420 ? 15 : 22));
      g.append("text")
        .attr("class", "lbl")
        .attr("x", m.l - 10)
        .attr("y", rh / 2 + 8)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text((r) => `${names[r.managerId] ?? r.managerId}, ${r.label}`);
      g.append("rect").attr("x", m.l).attr("y", 9).attr("height", rh - 18).attr("width", x(1)).attr("rx", 3).attr("fill", "var(--surface-2)");
      settle(
        g
          .append("rect")
          .attr("x", m.l)
          .attr("y", 9)
          .attr("height", rh - 18)
          .attr("rx", 3)
          .attr("fill", (r) => (r.finalRank === 1 ? "var(--gold)" : "var(--s1)")),
        animate,
        { width: 0 },
        { width: (r: FrontRunnerRecord) => x(r.weeksInFirst / r.weeks) },
        { duration: 700, delay: (_: never, i: number) => i * 50 },
      );
      g.append("text")
        .attr("class", "lbl num")
        .attr("x", W - m.r + 8)
        .attr("y", rh / 2)
        .attr("dy", ".35em")
        .style("fill", "var(--ink-2)")
        .text((r) => `${r.weeksInFirst}/${r.weeks} · ${r.finalRank === 1 ? "won it" : ordinal(r.finalRank)}`);
    },
    [rows, names],
  );
  return <div ref={ref} style={{ minHeight: 4 + rows.length * 34 }} />;
}
