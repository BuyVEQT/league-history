"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { ReplayFrame } from "@/lib/analytics/seasonView";
import { tt } from "@/components/viz/tt";
import { useD3Chart } from "@/components/viz/useD3Chart";

const ROW = 28;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const rec = (w: number, l: number, t: number) => `${w}-${l}-${t}`;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * The standings replayed week by week: bars run left or right from .500, rows re-sort as the weeks go by.
 * Play steps through the season; the slider jumps to any week.
 */
export function SeasonReplay({
  frames,
  spots,
  method,
  managerNames,
}: {
  frames: ReplayFrame[];
  spots: number;
  method: "categories" | "matchups";
  managerNames: Record<string, string>;
}) {
  const last = frames.length - 1;
  const [idx, setIdx] = useState(last);
  const [playing, setPlaying] = useState(false);
  const idxRef = useRef(idx);
  const renderRef = useRef<((i: number, dur: number) => void) | null>(null);
  const reducedRef = useRef(false);
  const pctLabel = method === "categories" ? "Category win %" : "Matchup win %";

  const ref = useD3Chart(
    (root, { width, reduced, first }) => {
      reducedRef.current = reduced;
      root.selectAll("*").remove();
      const narrow = width < 600;
      const m = { t: 22, r: 16, b: 6, l: narrow ? 118 : 210 };
      const n = frames[0]?.rows.length ?? 0;
      const H = m.t + m.b + n * ROW;
      const svg = root
        .append("svg")
        .attr("class", "viz")
        .attr("viewBox", `0 0 ${width} ${H}`)
        .attr("role", "img")
        .attr("aria-label", `Standings replay: ${pctLabel.toLowerCase()} of every team, week by week, with bars from .500`);
      // Symmetric around .500, wide enough for the most extreme record in any week (at least .25-.75).
      const reach = Math.max(0.25, Math.ceil(Math.max(...frames.flatMap((f) => f.rows.map((r) => Math.abs(r.pct - 0.5)))) * 10) / 10);
      const x = d3.scaleLinear().domain([0.5 - reach, 0.5 + reach]).range([m.l, width - m.r]).clamp(true);
      const axis = svg.append("g");
      const step = reach > 0.3 ? 0.2 : 0.1;
      const ticks = d3.range(-Math.floor(reach / step + 1e-9), Math.floor(reach / step + 1e-9) + 1).map((k) => Math.round((0.5 + k * step) * 10) / 10);
      for (const v of ticks) {
        axis.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t - 4).attr("y2", H - m.b).attr("stroke", Math.abs(v - 0.5) < 1e-9 ? "var(--border-2)" : "var(--border)");
        axis.append("text").attr("class", "lbl num").attr("x", x(v)).attr("y", 12).attr("text-anchor", "middle").text(v <= 0 ? "0" : v >= 1 ? "1" : v.toFixed(1).replace(/^0/, ""));
      }
      if (spots > 0 && spots < n) {
        axis.append("line").attr("x1", 0).attr("x2", width).attr("y1", m.t + spots * ROW).attr("y2", m.t + spots * ROW).attr("stroke", "var(--accent)").attr("stroke-width", 1.5);
        axis
          .append("text")
          .attr("class", "lbl")
          .attr("x", width - m.r)
          .attr("y", m.t + spots * ROW - 5)
          .attr("text-anchor", "end")
          .style("fill", "var(--accent-ink)")
          .style("font-weight", 700)
          .text(`Playoff line · top ${spots} make it`);
      }
      const g = svg.append("g");

      const render = (i: number, dur: number) => {
        const f = frames[i];
        if (!f) return;
        const sel = g.selectAll<SVGGElement, (typeof f.rows)[number]>("g.rp").data(f.rows, (d) => d.teamId);
        const ent = sel
          .enter()
          .append("g")
          .attr("class", "rp")
          .attr("transform", (_, k) => `translate(0,${m.t + k * ROW})`);
        ent.append("text").attr("class", "lbl num rk").attr("x", 0).attr("y", ROW / 2).attr("dy", ".35em");
        ent.append("text").attr("class", "ink tm").attr("x", 22).attr("y", ROW / 2).attr("dy", ".35em");
        ent
          .append("rect")
          .attr("class", "bar")
          .attr("height", 16)
          .attr("y", (ROW - 16) / 2)
          .attr("rx", 3)
          .attr("x", x(0.5))
          .attr("width", 0);
        ent.append("text").attr("class", "lbl num rc").attr("y", ROW / 2).attr("dy", ".35em").attr("x", x(0.5));
        ent.append("rect").attr("class", "hit").attr("fill", "transparent").attr("height", ROW);
        const all = ent.merge(sel);
        const ease = d3.easeCubicInOut;
        all.transition().duration(dur).ease(ease).attr("transform", (_, k) => `translate(0,${m.t + k * ROW})`);
        all.select(".rk").text((d) => d.rank);
        all.select(".tm").text((d) => (narrow ? clip(managerNames[d.managerId] ?? d.teamName, 14) : clip(d.teamName, 26)));
        all
          .select(".bar")
          .attr("fill", (d) => (d.pct >= 0.5 ? "var(--pos)" : "var(--neg)"))
          .transition()
          .duration(dur)
          .ease(ease)
          .attr("x", (d) => Math.min(x(0.5), x(d.pct)))
          .attr("width", (d) => Math.max(2, Math.abs(x(d.pct) - x(0.5))));
        all
          .select(".rc")
          .attr("text-anchor", (d) => (d.pct >= 0.5 ? "start" : "end"))
          .text((d) => pct(d.pct))
          .transition()
          .duration(dur)
          .ease(ease)
          .attr("x", (d) => (d.pct >= 0.5 ? x(d.pct) + 6 : x(d.pct) - 6));
        all
          .select(".hit")
          .attr("width", width)
          .attr(
            "data-tt",
            (d) =>
              tt(
                d.teamName,
                [
                  ["Manager", managerNames[d.managerId] ?? ""],
                  ["Place", d.rank],
                  [pctLabel, pct(d.pct)],
                  ["Categories W-L-T", rec(d.catWins, d.catLosses, d.catTies)],
                  ["Matchups W-L-T", rec(d.wins, d.losses, d.ties)],
                ],
                `Through week ${f.week}`,
              ),
          );
        sel.exit().remove();
      };
      renderRef.current = render;
      render(idxRef.current, first && !reduced ? 700 : 0);
      return () => {
        renderRef.current = null;
      };
    },
    [frames, spots, method],
  );

  // Move to a new week (slider or Play).
  useEffect(() => {
    if (idxRef.current === idx) return;
    idxRef.current = idx;
    renderRef.current?.(idx, reducedRef.current ? 0 : playing ? 550 : 300);
  }, [idx, playing]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIdx((i) => {
        if (i >= last) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 700);
    return () => clearInterval(timer);
  }, [playing, last]);

  if (!frames.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="play-btn"
          onClick={() => {
            if (playing) return setPlaying(false);
            if (idx >= last) setIdx(0);
            setPlaying(true);
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
            {playing ? <path d="M7 4h4v16H7zM13 4h4v16h-4z" /> : <path d="M7 4v16l13-8L7 4Z" />}
          </svg>
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          className="scrub"
          min={0}
          max={last}
          value={idx}
          aria-label="Week"
          onChange={(e) => {
            setPlaying(false);
            setIdx(Number(e.target.value));
          }}
        />
        <span className="min-w-[120px] text-sm text-muted tabular-nums" aria-live="polite">
          Week {frames[idx].week} of {frames[last].week}
        </span>
      </div>
      <div ref={ref} />
    </div>
  );
}
