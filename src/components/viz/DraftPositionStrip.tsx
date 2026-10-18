"use client";

import * as d3 from "d3";
import { tt } from "./tt";
import { useD3Chart } from "./useD3Chart";

export interface PositionStripRow {
  managerId: string;
  name: string;
  drafts: number;
  firstPicks: number;
  secondPicks: number;
  topThreeFinishers: number;
  avgSlot: number;
  slotLuck: number;
}

export interface PositionStripSlot {
  managerId: string;
  label: string;
  slot: number;
  playerName: string;
  actualRank: number | null;
  /** The upcoming, not-yet-played draft: drawn as an outlined dot. */
  next: boolean;
}

const sgn = (n: number, d = 1) => {
  const r = Number(n.toFixed(d));
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r).toFixed(d)}`;
};

/**
 * Per-manager dot strip of round-one draft slots (gold = #1, outlined = next season), a ring at the
 * average slot, chips for #1 / #2 picks and top-3 finishers, and slot luck as a diverging bar.
 * Port of the prototype's drawPositions, plus slot luck and the next-season dot.
 */
export function DraftPositionStrip({ rows, slots, maxSlot }: { rows: PositionStripRow[]; slots: PositionStripSlot[]; maxSlot: number }) {
  const ref = useD3Chart(
    (el, { width: W, reduced, first }) => {
      el.selectAll("*").remove();
      const animate = first && !reduced;
      const rh = 32;
      const m = { t: 26, r: 430, l: 100, b: 4 };
      const H = m.t + rows.length * rh + m.b;
      const R = W - m.r; // start of the right-hand columns
      const svg = el.append("svg").attr("class", "viz").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", "First-round draft slots by manager, with average slot, #1 and #2 picks, top-3 finishers drafted and slot luck");
      const x = d3.scaleLinear().domain([1, maxSlot]).range([m.l + 10, R - 14]);
      const luckMax = d3.max(rows, (r) => Math.abs(r.slotLuck)) || 1;
      const lx = d3.scaleLinear().domain([-luckMax, luckMax]).range([R + 186, R + 296]);

      d3.range(1, maxSlot + 1).forEach((k) => {
        svg.append("line").attr("x1", x(k)).attr("x2", x(k)).attr("y1", m.t - 6).attr("y2", H).attr("stroke", "var(--border)");
        svg.append("text").attr("class", "lbl num").attr("x", x(k)).attr("y", 14).attr("text-anchor", "middle").text(`#${k}`);
      });
      const head = (at: number, text: string, anchor = "start") =>
        svg.append("text").attr("class", "lbl").attr("x", at).attr("y", 14).attr("text-anchor", anchor).style("font-weight", 700).text(text);
      head(R + 16, "#1 · #2 · top-3");
      head(R + 178, "Slot luck", "end");
      head(R + 312, "Avg slot");
      svg.append("line").attr("x1", lx(0)).attr("x2", lx(0)).attr("y1", m.t - 6).attr("y2", H).attr("stroke", "var(--border-2)");

      const g = svg
        .append("g")
        .selectAll("g")
        .data(rows)
        .join("g")
        .attr("transform", (_, i) => `translate(0,${m.t + i * rh})`);
      g.append("text").attr("class", "ink").attr("x", m.l - 6).attr("y", rh / 2).attr("dy", ".35em").attr("text-anchor", "end").text((r) => r.name);
      g.append("line").attr("x1", x(1)).attr("x2", x(maxSlot)).attr("y1", rh / 2).attr("y2", rh / 2).attr("stroke", "var(--border-2)");

      g.each(function (r) {
        const row = d3.select(this);
        const mine = slots.filter((s) => s.managerId === r.managerId).sort((a, b) => Number(a.next) - Number(b.next));
        const dots = row
          .selectAll<SVGCircleElement, PositionStripSlot>("circle.d")
          .data(mine)
          .join("circle")
          .attr("class", "d")
          .attr("cy", rh / 2)
          .attr("r", 5.5)
          .attr("fill", (s) => (s.next ? "var(--surface)" : s.slot === 1 ? "var(--gold)" : "var(--s1)"))
          .attr("fill-opacity", (s) => (s.next ? 1 : 0.75))
          .attr("stroke", (s) => (s.next ? "var(--accent)" : "var(--surface)"))
          .attr("stroke-width", (s) => (s.next ? 2 : 1.5))
          .attr("data-tt", (s) =>
            tt(
              `${r.name} · ${s.label}`,
              s.next ? [["Round-one slot", `#${s.slot}`]] : [["Round-one slot", `#${s.slot}`], ["Took", s.playerName], ["Player finished", s.actualRank === null ? "300+" : `#${s.actualRank}`]],
              s.next ? "Next season's draft order" : "",
            ),
          );
        if (animate)
          dots
            .attr("cx", x((1 + maxSlot) / 2))
            .attr("opacity", 0)
            .transition()
            .duration(700)
            .delay((_, i) => i * 40)
            .attr("cx", (s) => x(s.slot))
            .attr("opacity", 1);
        else dots.attr("cx", (s) => x(s.slot));
      });

      const ring = g
        .append("circle")
        .attr("cx", (r) => x(r.avgSlot))
        .attr("cy", rh / 2)
        .attr("r", 9)
        .attr("fill", "none")
        .attr("stroke", "var(--foreground)")
        .attr("stroke-width", 2)
        .style("pointer-events", "stroke")
        .attr("data-tt", (r) => tt(`${r.name}: average slot`, [["Average round-one slot", `#${r.avgSlot.toFixed(1)}`], ["Drafts", r.drafts]]));
      if (animate) ring.attr("opacity", 0).transition().delay(500).duration(400).attr("opacity", 1);

      const chip = (dx: number, key: "firstPicks" | "secondPicks" | "topThreeFinishers", label: string) =>
        g.each(function (r) {
          const v = r[key];
          const on = v > 0;
          const c = d3.select(this).append("g").attr("data-tt", tt(r.name, [[label, v]]));
          c.append("rect").attr("x", R + dx).attr("y", rh / 2 - 10).attr("width", 34).attr("height", 20).attr("rx", 10).attr("fill", on ? "var(--accent-wash)" : "var(--surface-2)");
          c.append("text")
            .attr("x", R + dx + 17)
            .attr("y", rh / 2)
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .attr("class", "num")
            .style("font-size", "12px")
            .style("font-weight", 800)
            .style("fill", on ? "var(--accent-ink)" : "var(--muted)")
            .text(v);
        });
      chip(16, "firstPicks", "#1 picks");
      chip(56, "secondPicks", "#2 picks");
      chip(96, "topThreeFinishers", "Top-3 finishers drafted");

      // Slot luck: number, then a diverging bar from zero.
      g.append("text")
        .attr("class", "num")
        .attr("x", R + 178)
        .attr("y", rh / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .style("font-size", "12.5px")
        .style("font-weight", 700)
        .style("fill", (r) => (r.slotLuck > 0.25 ? "var(--positive)" : r.slotLuck < -0.25 ? "var(--negative)" : "var(--ink-2)"))
        .text((r) => sgn(r.slotLuck));
      const bar = g
        .append("rect")
        .attr("y", rh / 2 - 4)
        .attr("height", 8)
        .attr("rx", 3)
        .attr("fill", (r) => (r.slotLuck >= 0 ? "var(--pos)" : "var(--neg)"))
        .attr("data-tt", (r) => tt(`${r.name}: slot luck`, [["Per draft", sgn(r.slotLuck)], ["Average slot", `#${r.avgSlot.toFixed(1)}`]], "+ = early slots (lucky), − = late"));
      if (animate)
        bar
          .attr("x", lx(0))
          .attr("width", 0)
          .transition()
          .duration(700)
          .delay((_, i) => 200 + i * 30)
          .attr("x", (r) => Math.min(lx(0), lx(r.slotLuck)))
          .attr("width", (r) => Math.abs(lx(r.slotLuck) - lx(0)));
      else bar.attr("x", (r) => Math.min(lx(0), lx(r.slotLuck))).attr("width", (r) => Math.abs(lx(r.slotLuck) - lx(0)));

      g.append("text")
        .attr("class", "lbl num")
        .attr("x", R + 312)
        .attr("y", rh / 2)
        .attr("dy", ".35em")
        .text((r) => `avg #${r.avgSlot.toFixed(1)} · ${r.drafts} draft${r.drafts === 1 ? "" : "s"}`);
    },
    [rows, slots, maxSlot],
    860,
  );
  return (
    <div className="overflow-x-auto">
      <div ref={ref} style={{ minWidth: 860, minHeight: 26 + rows.length * 32 }} />
    </div>
  );
}
