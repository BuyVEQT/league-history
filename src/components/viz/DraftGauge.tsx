"use client";

import * as d3 from "d3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

/**
 * Semicircle gauge sweeping to `share` (0-1, the r² from draftImpact), with the percentage counting up.
 * Port of the prototype's drawGauge.
 */
export function DraftGauge({ share, correlation, teamSeasons }: { share: number; correlation: number; teamSeasons: number }) {
  const pct = Math.round(share * 100);
  const label = `The draft explains about ${pct}% of the regular-season standings`;
  const ref = useD3Chart(
    (el, { width, reduced, first }) => {
      el.selectAll("*").remove();
      const W = Math.min(width, 340);
      const H = 214;
      const r = 120;
      const cx = W / 2;
      const cy = 140;
      const animate = first && !reduced;
      const svg = el
        .append("svg")
        .attr("class", "viz")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("max-width", `${W}px`)
        .style("margin", "0 auto")
        .attr("role", "img")
        .attr("aria-label", label);
      const g = svg
        .append("g")
        .attr(
          "data-tt",
          tt("How much does draft day decide?", [
            ["Explained by the draft (r²)", `${pct}%`],
            ["Correlation (r)", correlation.toFixed(2)],
            ["Team-seasons", teamSeasons],
          ]),
        );
      const arc = d3.arc<{ startAngle: number; endAngle: number }>().innerRadius(r - 22).outerRadius(r).cornerRadius(6);
      const start = -Math.PI / 2;
      const end = start + Math.PI * Math.max(0, Math.min(1, share));
      g.append("path").attr("transform", `translate(${cx},${cy})`).attr("d", arc({ startAngle: start, endAngle: Math.PI / 2 })).attr("fill", "var(--surface-2)");
      const fg = g.append("path").attr("transform", `translate(${cx},${cy})`).attr("fill", "var(--accent)");
      const txt = g
        .append("text")
        .attr("x", cx)
        .attr("y", cy - 8)
        .attr("text-anchor", "middle")
        .attr("class", "num")
        .style("font-family", "var(--font-display)")
        .style("font-weight", 900)
        .style("font-size", "54px")
        .style("fill", "var(--foreground)");
      if (animate) {
        fg.attr("d", arc({ startAngle: start, endAngle: start }))
          .transition()
          .duration(1100)
          .ease(d3.easeCubicOut)
          .attrTween("d", () => {
            const i = d3.interpolate(start, end);
            return (t) => arc({ startAngle: start, endAngle: i(t) }) ?? "";
          });
        txt
          .text("0%")
          .transition()
          .duration(1100)
          .ease(d3.easeCubicOut)
          .tween("text", function () {
            const i = d3.interpolateRound(0, pct);
            return (t) => {
              this.textContent = `${i(t)}%`;
            };
          });
      } else {
        fg.attr("d", arc({ startAngle: start, endAngle: end }));
        txt.text(`${pct}%`);
      }
      g.append("text").attr("x", cx - r + 11).attr("y", cy + 16).attr("text-anchor", "middle").attr("class", "lbl").text("0%");
      g.append("text").attr("x", cx + r - 11).attr("y", cy + 16).attr("text-anchor", "middle").attr("class", "lbl").text("100%");
      const cap = g.append("text").attr("x", cx).attr("y", cy + 40).attr("text-anchor", "middle").attr("class", "lbl").style("font-weight", 600).style("fill", "var(--ink-2)");
      // Two lines, so the caption never runs past the gauge's width.
      ["of the regular-season standings", "is explained by the draft"].forEach((line, i) =>
        cap.append("tspan").attr("x", cx).attr("dy", i ? "1.3em" : 0).text(line),
      );
    },
    [share, correlation, teamSeasons],
    260,
  );
  return <div ref={ref} style={{ minHeight: 214 }} />;
}
