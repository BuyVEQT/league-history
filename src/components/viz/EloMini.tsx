"use client";

import * as d3 from "d3";
import type { EloMiniData } from "@/lib/analytics/managerView";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

/** Career power-rating sparkline: one line per season on a shared scale, dashed 1500 average, peak in gold. */
export function EloMini({ data, name }: { data: EloMiniData; name: string }) {
  const ref = useD3Chart(
    (el, { width, reduced, first }) => {
      el.selectAll("*").remove();
      if (!data.seasons.length) return;
      const W = width;
      const H = 54;
      const xs = d3
        .scaleBand<number>()
        .domain(data.years.map((y) => y.year))
        .range([0, W])
        .paddingInner(0.08);
      const x = (year: number, week: number) => (xs(year) ?? 0) + ((week - 1) / Math.max(1, data.maxWeek - 1)) * xs.bandwidth();
      const y = d3.scaleLinear().domain([Math.min(data.min, 1500), Math.max(data.max, 1500)]).range([H - 4, 4]);
      const svg = el
        .append("svg")
        .attr("class", "viz")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("role", "img")
        .attr(
          "aria-label",
          `${name}'s power rating over the career${data.peak ? `, peaking at ${data.peak.rating.toFixed(0)} in ${data.peak.label}` : ""}`,
        );
      svg.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(1500)).attr("y2", y(1500)).attr("stroke", "var(--border-2)").attr("stroke-dasharray", "3 3");
      const line = d3
        .line<{ week: number; rating: number }>()
        .curve(d3.curveMonotoneX);
      const paths = svg
        .append("g")
        .selectAll("path")
        .data(data.seasons)
        .join("path")
        .attr("d", (s) => line.x((p) => x(s.year, p.week)).y((p) => y(p.rating))(s.points))
        .attr("fill", "none")
        .attr("stroke", "var(--s1)")
        .attr("stroke-width", 1.8)
        .attr("stroke-linejoin", "round");
      const pk = data.peak
        ? svg
            .append("circle")
            .attr("cx", x(data.peak.year, data.peak.week))
            .attr("cy", y(data.peak.rating))
            .attr("r", 3.5)
            .attr("fill", "var(--gold)")
            .attr("stroke", "var(--surface)")
            .attr("stroke-width", 1)
        : null;
      if (first && !reduced) {
        paths.each(function (_, i) {
          const p = this as SVGPathElement;
          const len = p.getTotalLength();
          d3.select(p)
            .attr("stroke-dasharray", `${len} ${len}`)
            .attr("stroke-dashoffset", len)
            .transition()
            .delay(i * 90)
            .duration(420)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0)
            .on("end", function () {
              d3.select(this).attr("stroke-dasharray", null);
            });
        });
        pk?.attr("r", 0).transition().delay(data.seasons.length * 90 + 250).duration(300).attr("r", 3.5);
      }
      const bySeason = new Map(data.seasons.map((s) => [s.year, s]));
      svg
        .append("g")
        .selectAll("rect")
        .data(data.years)
        .join("rect")
        .attr("x", (d) => xs(d.year) ?? 0)
        .attr("width", xs.bandwidth())
        .attr("y", 0)
        .attr("height", H)
        .attr("fill", "transparent")
        .attr("data-tt", (d) => {
          const s = bySeason.get(d.year);
          if (!s) return tt(d.label, [], "Not in the league");
          const isPeak = data.peak?.year === d.year;
          return tt(
            d.label,
            [
              ["Start", s.start.toFixed(0)],
              ["End", s.end.toFixed(0)],
              ["High", s.high.toFixed(0)],
            ],
            isPeak ? `Career peak: ${data.peak!.rating.toFixed(0)}, week ${data.peak!.week}` : "",
          );
        });
    },
    [data, name],
    120,
  );
  return <div ref={ref} className="fs-chart" />;
}
