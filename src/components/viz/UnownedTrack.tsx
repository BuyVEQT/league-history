"use client";

import { useState } from "react";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

export type UnownedRow = { playerName: string; label: string; actualRank: number; draftedBy: string | null };

/** Stars nobody owned: one row per player, a track from #1 to #60, and a dot that slides in to where he finished. */
export function UnownedTrack({ rows: all, maxRank = 60, initial = 12 }: { rows: UnownedRow[]; maxRank?: number; initial?: number }) {
  const [open, setOpen] = useState(false);
  const rows = open ? all : all.slice(0, initial);
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      el.selectAll("*").remove();
      const narrow = W < 460;
      const rh = 34;
      const m = { t: 20, r: 14, l: narrow ? 140 : 190 };
      const H = m.t + rows.length * rh;
      const x = (v: number) => m.l + ((v - 1) / (maxRank - 1)) * (W - m.l - m.r);
      const svg = el
        .append("svg")
        .attr("class", "viz")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("role", "img")
        .attr("aria-label", `Top-${maxRank} finishers who were free agents at season end, by final rank`);
      [1, 20, 40, maxRank].forEach((v) => {
        svg.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t - 4).attr("y2", H).attr("stroke", "var(--border)");
        svg.append("text").attr("class", "lbl num").attr("x", x(v)).attr("y", 11).attr("text-anchor", "middle").text(`#${v}`);
      });
      const g = svg
        .append("g")
        .selectAll("g")
        .data(rows)
        .join("g")
        .attr("transform", (_, i) => `translate(0,${m.t + i * rh})`)
        .attr("data-tt", (r) =>
          tt(r.playerName, [
            ["Season", r.label],
            ["Finished", `#${r.actualRank}`],
            ["Drafted by", r.draftedBy ?? "Nobody (undrafted)"],
          ], "A free agent when the season ended"),
        );
      const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
      g.append("text")
        .attr("class", "ink")
        .attr("x", m.l - 12)
        .attr("y", rh / 2 - 6)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text((r) => clip(r.playerName, narrow ? 18 : 26));
      g.append("text")
        .attr("class", "lbl")
        .style("font-size", "11px")
        .attr("x", m.l - 12)
        .attr("y", rh / 2 + 8)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text((r) => clip(`${r.label} · ${r.draftedBy ? `drafted by ${r.draftedBy}` : "undrafted"}`, narrow ? 24 : 34));
      g.append("line")
        .attr("x1", x(1))
        .attr("x2", x(maxRank))
        .attr("y1", rh / 2)
        .attr("y2", rh / 2)
        .attr("stroke", "var(--border)")
        .attr("stroke-width", 6)
        .attr("stroke-linecap", "round");
      const animate = first && !reduced;
      const dot = g.append("circle").attr("cy", rh / 2).attr("r", 8).attr("fill", "var(--accent)").attr("stroke", "var(--surface)").attr("stroke-width", 2);
      const num = g
        .append("text")
        .attr("y", rh / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .style("font-weight", 800)
        .style("fill", "#fff")
        .style("pointer-events", "none")
        .text((r) => r.actualRank);
      if (animate) {
        dot.attr("cx", x(maxRank)).transition().duration(800).delay((_, i) => i * 50).attr("cx", (r) => x(r.actualRank));
        num.attr("x", x(maxRank)).transition().duration(800).delay((_, i) => i * 50).attr("x", (r) => x(r.actualRank));
      } else {
        dot.attr("cx", (r) => x(r.actualRank));
        num.attr("x", (r) => x(r.actualRank));
      }
    },
    [open, all, maxRank],
  );
  return (
    <>
      <div ref={ref} />
      {all.length > initial && (
        <button type="button" className="show-more" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Show fewer" : `Show all ${all.length}`}
        </button>
      )}
    </>
  );
}
