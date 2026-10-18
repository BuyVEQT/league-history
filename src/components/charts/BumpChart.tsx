"use client";

import * as d3 from "d3";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatPct, ordinal } from "@/lib/analytics/format";
import type { FinishPoint } from "@/lib/analytics/leaderboardView";
import { openPanel } from "@/components/panel/openPanel";
import { useLeagueBase } from "@/components/useLeagueBase";
import { tt } from "@/components/viz/tt";
import { useD3Chart } from "@/components/viz/useD3Chart";

export interface BumpSeries {
  id: string;
  name: string;
  pts: FinishPoint[];
}

const SLOTS = ["var(--s1)", "var(--s2)", "var(--s3)"];
const MAX_PINS = 3;

type P = FinishPoint & { id: string };

/**
 * Where everyone finished: one line per manager, final finish by season (1st at the top). Everyone is a
 * thin gray line; up to three pinned managers are drawn in color and labelled. Hovering finds the nearest
 * point and lights up that manager's line; clicking opens their side panel (Cmd/Ctrl-click: profile).
 */
export function BumpChart({ series, years, maxTeams, initialPins }: { series: BumpSeries[]; years: { year: number; label: string }[]; maxTeams: number; initialPins: string[] }) {
  const [pins, setPins] = useState<string[]>(initialPins.slice(0, MAX_PINS));
  const pinsRef = useRef(pins);
  const renderRef = useRef<((animate: boolean) => void) | null>(null);
  const router = useRouter();
  const base = useLeagueBase();
  const nameOf = new Map(series.map((s) => [s.id, s.name]));

  const ref = useD3Chart(
    (root, { width, reduced, first }) => {
      root.selectAll("*").remove();
      const W = width;
      const narrow = W < 560;
      const H = Math.round(Math.min(440, Math.max(320, W * 0.42)));
      const m = { t: 14, r: narrow ? 16 : 92, b: 28, l: 34 };
      const svg = root
        .append("svg")
        .attr("class", "viz")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("role", "img")
        .attr("aria-label", `Final finish by season for all ${series.length} managers; 1st is at the top`);
      const plot = svg.append("g");
      const overlay = svg.append("rect").attr("x", 0).attr("y", 0).attr("width", W).attr("height", H).attr("fill", "transparent").style("cursor", "pointer");
      const ys = years.map((y) => y.year);
      const x = d3.scalePoint<number>().domain(ys).range([m.l, W - m.r]).padding(0.15);
      const y = d3.scaleLinear().domain([1, Math.max(2, maxTeams)]).range([m.t, H - m.b]);
      const labelOf = new Map(years.map((y) => [y.year, y.label]));
      const line = d3
        .line<P>()
        .x((d) => x(d.year)!)
        .y((d) => y(d.final))
        .curve(d3.curveMonotoneX);
      // Contiguous runs, so missed seasons stay gaps.
      const runs = (pts: P[]) => {
        const out: P[][] = [];
        let cur: P[] = [];
        for (const p of pts) {
          if (cur.length && ys.indexOf(p.year) !== ys.indexOf(cur[cur.length - 1].year) + 1) {
            out.push(cur);
            cur = [];
          }
          cur.push(p);
        }
        if (cur.length) out.push(cur);
        return out;
      };
      const data = series.map((s) => ({ id: s.id, pts: s.pts.map((p) => ({ ...p, id: s.id })) }));
      const all = data.flatMap((s) => s.pts);
      const delaunay = d3.Delaunay.from(
        all,
        (d) => x(d.year)!,
        (d) => y(d.final),
      );
      let hoverId: string | null = null;
      const ticks = [1, 3, 6, 9, 12].filter((t) => t <= maxTeams);

      const render = (animate: boolean) => {
        const pinned = pinsRef.current;
        plot.selectAll("*").remove();
        plot
          .append("g")
          .selectAll("line")
          .data(d3.range(1, maxTeams + 1))
          .join("line")
          .attr("x1", m.l)
          .attr("x2", W - m.r)
          .attr("y1", (d) => y(d))
          .attr("y2", (d) => y(d))
          .attr("stroke", "var(--border)")
          .attr("stroke-width", (d) => (d === 1 ? 1.5 : 1));
        plot
          .append("g")
          .selectAll("text")
          .data(ticks)
          .join("text")
          .attr("class", "lbl num")
          .attr("x", m.l - 10)
          .attr("y", (d) => y(d))
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .text((d) => ordinal(d));
        plot
          .append("g")
          .selectAll("text")
          .data(ys)
          .join("text")
          .attr("class", "lbl")
          .attr("x", (d) => x(d)!)
          .attr("y", H - 6)
          .attr("text-anchor", "middle")
          .text((d) => (narrow ? `'${String(d).slice(2)}` : (labelOf.get(d) ?? String(d))));

        const active = (id: string) => pinned.includes(id) || id === hoverId;
        const color = (id: string) => (pinned.includes(id) ? SLOTS[pinned.indexOf(id)] : id === hoverId ? "var(--foreground)" : "var(--border-2)");
        const sorted = [...data].sort((a, b) => Number(active(a.id)) - Number(active(b.id)));
        const lg = plot.append("g");
        for (const s of sorted) {
          const on = active(s.id);
          runs(s.pts).forEach((r) => {
            const p = lg
              .append("path")
              .attr("data-m", s.id)
              .attr("d", line(r))
              .attr("fill", "none")
              .attr("stroke", color(s.id))
              .attr("stroke-width", on ? 3 : 1.6)
              .attr("stroke-linecap", "round")
              .attr("opacity", hoverId && !on ? 0.5 : 1);
            if (animate && pinned.includes(s.id)) {
              const L = (p.node() as SVGPathElement).getTotalLength();
              p.attr("stroke-dasharray", `${L} ${L}`)
                .attr("stroke-dashoffset", L)
                .transition()
                .duration(800)
                .ease(d3.easeCubicOut)
                .attr("stroke-dashoffset", 0)
                .on("end", function () {
                  d3.select(this).attr("stroke-dasharray", null);
                });
            }
          });
          lg.append("g")
            .attr("data-m", s.id)
            .selectAll("circle")
            .data(s.pts)
            .join("circle")
            .attr("cx", (d) => x(d.year)!)
            .attr("cy", (d) => y(d.final))
            .attr("r", (d) => (d.final === 1 ? 6.5 : on ? 4.5 : 3))
            .attr("fill", (d) => (d.final === 1 ? "var(--gold)" : color(s.id)))
            .attr("stroke", "var(--surface)")
            .attr("stroke-width", 2);
        }
        if (!narrow) {
          const labs = data
            .filter((s) => active(s.id) && s.pts.length)
            .map((s) => {
              const last = s.pts[s.pts.length - 1];
              return { id: s.id, y: y(last.final), x: x(last.year)! };
            })
            .sort((a, b) => a.y - b.y);
          for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 15) labs[i].y = labs[i - 1].y + 15;
          plot
            .append("g")
            .selectAll("text")
            .data(labs)
            .join("text")
            .attr("class", "ink")
            .attr("data-m", (d) => d.id)
            .attr("x", (d) => d.x + 12)
            .attr("y", (d) => d.y)
            .attr("dy", ".35em")
            .text((d) => nameOf.get(d.id) ?? d.id);
        }
      };
      renderRef.current = render;

      overlay
        .on("pointermove", function (e) {
          if (!all.length) return;
          const [mx, my] = d3.pointer(e, svg.node());
          const d = all[delaunay.find(mx, my)];
          if (d.id !== hoverId) {
            hoverId = d.id;
            render(false);
          }
          this.setAttribute(
            "data-tt",
            tt(
              `${nameOf.get(d.id)} · ${d.label}`,
              [
                ["Team", d.teamName],
                ["Final finish", `${ordinal(d.final)} of ${d.teams}`],
                ["Result", d.result],
                ["Category win %", formatPct(d.catPct)],
              ],
              "Click for details · pin names above",
            ),
          );
        })
        .on("pointerleave", function () {
          hoverId = null;
          this.removeAttribute("data-tt");
          render(false);
        })
        .on("click", (e: MouseEvent) => {
          if (!hoverId) return;
          if (e.metaKey || e.ctrlKey) router.push(`${base}/managers/${hoverId}`);
          else openPanel("manager", hoverId);
        });

      render(first && !reduced);
      return () => {
        renderRef.current = null;
      };
    },
    [series, years, maxTeams],
  );

  useEffect(() => {
    if (pinsRef.current === pins) return;
    pinsRef.current = pins;
    renderRef.current?.(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [pins]);

  const toggle = (id: string) => setPins((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-MAX_PINS)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pin up to three managers">
        {series.map((s) => {
          const k = pins.indexOf(s.id);
          return (
            <button key={s.id} type="button" className="pill" data-m={s.id} aria-pressed={k >= 0} onClick={() => toggle(s.id)}>
              {k >= 0 && <span className="size-2 rounded-full" style={{ background: SLOTS[k] }} />}
              {s.name}
            </button>
          );
        })}
      </div>
      <div ref={ref} />
      <div className="viz-legend">
        <span>
          <i className="dot" style={{ background: "var(--gold)" }} />
          Champion
        </span>
        {pins.map((id, k) => (
          <span key={id}>
            <i className="line" style={{ background: SLOTS[k] }} />
            {nameOf.get(id)}
          </span>
        ))}
        <span>
          <i className="line" style={{ background: "var(--border-2)" }} />
          Other managers
        </span>
      </div>
    </div>
  );
}
