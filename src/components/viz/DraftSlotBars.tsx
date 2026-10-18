"use client";

import * as d3 from "d3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

export interface SlotBar {
  slot: number;
  seasons: number;
  avgFinish: number;
  titles: number;
}

const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/** A small trophy, 12px wide, centred on (0, 0) at its base. */
const TROPHY = "M-5,-12h10v3.5a5,5 0 0 1-10,0zM-1.2,-4h2.4v2.5h-2.4zM-3.5,-1.5h7v1.5h-7z";
const HANDLES = "M-5,-11h-1.6a2,2.6 0 0 0 1.8,4.2M5,-11h1.6a2,2.6 0 0 1-1.8,4.2";

/**
 * Average final finish by round-one draft slot (taller = better), a trophy per title won from the slot.
 * Port of the prototype's drawSlots.
 */
export function DraftSlotBars({ rows, teams }: { rows: SlotBar[]; teams: number }) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      el.selectAll("*").remove();
      const animate = first && !reduced;
      const H = 300;
      const m = { t: 22, r: 10, b: 40, l: 40 };
      const svg = el.append("svg").attr("class", "viz").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "Average final finish by first-round draft slot, with titles won from each slot");
      const x = d3
        .scaleBand<number>()
        .domain(rows.map((r) => r.slot))
        .range([m.l, W - m.r])
        .padding(0.25);
      const y = d3.scaleLinear().domain([teams, 1]).range([H - m.b, m.t]);
      const ticks = [1, 3, 6, 9, 12].filter((t) => t <= teams);
      ticks.forEach((t) => {
        svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", "var(--border)");
        svg.append("text").attr("class", "lbl num").attr("x", m.l - 6).attr("y", y(t)).attr("dy", ".35em").attr("text-anchor", "end").text(ord(t));
      });
      svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", H - m.b).attr("y2", H - m.b).attr("stroke", "var(--border-2)");
      rows.forEach((r) =>
        svg
          .append("text")
          .attr("class", "lbl num")
          .attr("x", x(r.slot)! + x.bandwidth() / 2)
          .attr("y", H - m.b + 16)
          .attr("text-anchor", "middle")
          .text(`#${r.slot}`),
      );
      svg.append("text").attr("class", "lbl").attr("x", W - m.r).attr("y", H - 4).attr("text-anchor", "end").text("first-round pick →");

      const avg = d3.mean(rows, (r) => r.avgFinish) ?? 0;
      const g = svg
        .append("g")
        .selectAll("g")
        .data(rows)
        .join("g")
        .attr("data-tt", (d) =>
          tt(
            `Pick #${d.slot}`,
            [
              ["Seasons", d.seasons],
              ["Average final finish", d.avgFinish.toFixed(1)],
              ["Titles from this slot", d.titles],
            ],
            d.slot > 10 ? "Only exists in 12-team seasons" : "",
          ),
        );
      // Invisible full-height hit area so the whole column answers the hover.
      g.append("rect")
        .attr("x", (d) => x(d.slot)!)
        .attr("width", x.bandwidth())
        .attr("y", m.t)
        .attr("height", H - m.b - m.t)
        .attr("fill", "transparent");
      const bars = g
        .append("rect")
        .attr("x", (d) => x(d.slot)!)
        .attr("width", x.bandwidth())
        .attr("rx", 4)
        .attr("fill", (d) => (d.avgFinish < avg ? "var(--s1)" : "var(--border-2)"));
      if (animate)
        bars
          .attr("y", H - m.b)
          .attr("height", 0)
          .transition()
          .duration(600)
          .delay((_, i) => i * 40)
          .attr("y", (d) => y(d.avgFinish))
          .attr("height", (d) => H - m.b - y(d.avgFinish));
      else bars.attr("y", (d) => y(d.avgFinish)).attr("height", (d) => H - m.b - y(d.avgFinish));

      g.each(function (d) {
        const cx = x(d.slot)! + x.bandwidth() / 2;
        const top = y(d.avgFinish) - 4;
        for (let k = 0; k < d.titles; k++) {
          const t = d3.select(this).append("g").attr("transform", `translate(${cx},${top - k * 15})`);
          t.append("path").attr("d", TROPHY).attr("fill", "var(--gold)");
          t.append("path").attr("d", HANDLES).attr("fill", "none").attr("stroke", "var(--gold)").attr("stroke-width", 1.4);
          if (animate) t.attr("opacity", 0).transition().delay(600 + d.slot * 40 + k * 80).duration(300).attr("opacity", 1);
        }
      });
    },
    [rows, teams],
    280,
  );
  return <div ref={ref} style={{ minHeight: 300 }} />;
}
