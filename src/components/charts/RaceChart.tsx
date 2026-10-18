"use client";

import * as d3 from "d3";
import { Crown, HeartCrack, Rocket, TrendingDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ordinal as ord } from "@/lib/analytics/format";
import type { ReplayFrame, Storyline, StoryKind } from "@/lib/analytics/seasonView";
import { tt } from "@/components/viz/tt";
import { useD3Chart } from "@/components/viz/useD3Chart";
import { SeasonReplay } from "./SeasonReplay";

export interface RaceLineData {
  teamId: string;
  teamName: string;
  managerName: string;
  /** Rank after each week in `weeks`. */
  ranks: number[];
  seed: number;
  finalRank: number;
  madePlayoffs: boolean;
  weeksInFirst: number;
}

interface Props {
  weeks: number[];
  lines: RaceLineData[];
  /** Playoff spots; draws the shaded playoff zone. 0 = none. */
  spots: number;
  stories: Storyline[];
  replay: { method: "categories" | "matchups"; frames: ReplayFrame[] };
  managerNames: Record<string, string>;
}

const ICON: Record<StoryKind, typeof Crown> = {
  "Front-runner": Crown,
  Comeback: Rocket,
  Collapse: TrendingDown,
  "Final-week knockout": HeartCrack,
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * The standings race. "Every week": every team's place after each week as a bump chart, with storyline
 * cards that light up the teams they're about. "Replay": the table itself, played back week by week.
 */
export function RaceChart({ weeks, lines, spots, stories, replay, managerNames }: Props) {
  const [mode, setMode] = useState<"lines" | "replay">("lines");
  const [story, setStory] = useState<number | null>(null);
  const focusRef = useRef<string[] | null>(null);
  const storyRef = useRef(false);
  const paintRef = useRef<(() => void) | null>(null);

  const ref = useD3Chart(
    (root, { width, reduced, first }) => {
      root.selectAll("*").remove();
      const n = lines.length;
      const narrow = width < 560;
      const W = width;
      const H = 26 * n + 40;
      const m = { t: 10, r: narrow ? 100 : 150, b: 26, l: 30 };
      const svg = root
        .append("svg")
        .attr("class", "viz")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("role", "img")
        .attr("aria-label", `Standings place of all ${n} teams after each of ${weeks.length} weeks; the shaded band is the playoff zone`);
      const x = d3.scalePoint<number>().domain(weeks).range([m.l, W - m.r]);
      const y = d3.scaleLinear().domain([1, Math.max(2, n)]).range([m.t + 8, H - m.b - 8]);
      if (spots > 0 && spots < n) {
        svg
          .append("rect")
          .attr("x", m.l - 8)
          .attr("width", W - m.r - m.l + 16)
          .attr("y", m.t)
          .attr("height", y(spots + 0.5) - m.t)
          .attr("fill", "var(--pos-wash)")
          .attr("opacity", 0.45)
          .attr("rx", 6);
        svg
          .append("text")
          .attr("class", "lbl")
          .attr("x", W - m.r - 4)
          .attr("y", y(spots + 0.5) - 5)
          .attr("text-anchor", "end")
          .style("fill", "var(--accent-ink)")
          .style("font-weight", 700)
          .text(narrow ? `top ${spots}` : `playoff line · top ${spots}`);
      }
      for (let k = 1; k <= n; k++) svg.append("text").attr("class", "lbl num").attr("x", m.l - 14).attr("y", y(k)).attr("dy", ".35em").attr("text-anchor", "end").text(k);
      const every = narrow ? 4 : 2;
      weeks.forEach((w, i) => {
        if ((i % every === 0 && i <= weeks.length - 1 - every) || i === weeks.length - 1)
          svg.append("text").attr("class", "lbl num").attr("x", x(w)!).attr("y", H - 6).attr("text-anchor", "middle").text(`wk ${w}`);
      });
      const line = d3
        .line<number>()
        .x((_, i) => x(weeks[i])!)
        .y((d) => y(d))
        .curve(d3.curveBumpX);
      const g = svg.append("g").selectAll("g").data(lines).join("g");
      const paths = g.append("path").attr("class", "rl").attr("d", (l) => line(l.ranks)).attr("fill", "none").attr("stroke-linecap", "round");
      const lastX = x(weeks.at(-1)!)!;
      const dots = g.append("circle").attr("cx", lastX).attr("cy", (l) => y(l.ranks.at(-1)!)).attr("r", 4.5);
      // End labels, nudged apart only when the chart is cramped.
      const labs = g
        .append("text")
        .attr("class", "ink")
        .attr("x", W - m.r + 10)
        .attr("y", (l) => y(l.ranks.at(-1)!))
        .attr("dy", ".35em")
        .text((l) => clip(l.teamName, narrow ? 12 : 20));

      const paint = () => {
        const focus = focusRef.current;
        const on = (l: RaceLineData) => !focus || focus.includes(l.teamId);
        const hi = (l: RaceLineData) => !!focus && focus.includes(l.teamId);
        paths
          .attr("stroke", (l) =>
            hi(l) ? (l.madePlayoffs ? "var(--s1)" : "var(--s2)") : l.finalRank === 1 ? "var(--gold)" : !focus ? (l.madePlayoffs ? "var(--ink-2)" : "var(--border-2)") : "var(--border)",
          )
          .attr("stroke-width", (l) => (hi(l) ? 3.4 : l.finalRank === 1 ? 2.6 : 1.6));
        dots.attr("fill", (l) => (l.finalRank === 1 ? "var(--gold)" : hi(l) ? (l.madePlayoffs ? "var(--s1)" : "var(--s2)") : "var(--border-2)"));
        labs.style("opacity", (l) => (on(l) ? 1 : 0.35)).style("font-weight", (l) => (hi(l) ? 800 : 600));
        g.filter((l) => hi(l) || (!focus && l.finalRank === 1)).raise();
      };
      paintRef.current = paint;
      paint();

      if (first && !reduced) {
        paths.each(function (_, i) {
          const L = this.getTotalLength();
          d3.select(this)
            .attr("stroke-dasharray", `${L} ${L}`)
            .attr("stroke-dashoffset", L)
            .transition()
            .delay(i * 25)
            .duration(1000)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0)
            .on("end", function () {
              d3.select(this).attr("stroke-dasharray", null).attr("stroke-dashoffset", null);
            });
        });
        dots.style("opacity", 0).transition().delay(900).duration(300).style("opacity", 1);
        labs.attr("opacity", 0).transition().delay(900).duration(300).attr("opacity", 1);
      }

      // Wide invisible hit lines: hover highlights a team and the tooltip follows the week under the pointer.
      g.append("path")
        .attr("d", (l) => line(l.ranks))
        .attr("fill", "none")
        .attr("stroke", "transparent")
        .attr("stroke-width", 14)
        .style("cursor", "default")
        .on("pointerenter", (_, l) => {
          if (storyRef.current) return;
          focusRef.current = [l.teamId];
          paint();
        })
        .on("pointermove", function (e, l) {
          const [mx] = d3.pointer(e, svg.node());
          const i = d3.minIndex(weeks, (w) => Math.abs(x(w)! - mx));
          this.setAttribute(
            "data-tt",
            tt(
              `${l.teamName} · week ${weeks[i]}`,
              [
                ["Place", ord(l.ranks[i])],
                ["Weeks in first", l.weeksInFirst],
                ["Seed", ord(l.seed)],
                ["Final finish", ord(l.finalRank)],
              ],
              l.managerName,
            ),
          );
        })
        .on("pointerleave", () => {
          if (storyRef.current) return;
          focusRef.current = null;
          paint();
        });
      return () => {
        paintRef.current = null;
      };
    },
    [weeks, lines, spots],
  );

  useEffect(() => {
    storyRef.current = story !== null;
    focusRef.current = story === null ? null : stories[story]?.teamIds ?? null;
    paintRef.current?.();
  }, [story, stories]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-sm text-[color:var(--ink-2)]">
          {mode === "lines"
            ? "Every team's place after every week; the shaded band is the playoff zone. Follow a storyline, or switch to Replay and press play."
            : `Bars run from .500: right of center is a winning ${replay.method === "categories" ? "category" : "matchup"} record.`}
        </p>
        <div className="seg" role="group" aria-label="Chart view">
          <button type="button" aria-pressed={mode === "lines"} onClick={() => setMode("lines")}>
            Every week
          </button>
          <button type="button" aria-pressed={mode === "replay"} onClick={() => setMode("replay")}>
            Replay
          </button>
        </div>
      </div>
      <div className="race-wrap" hidden={mode !== "lines"}>
          <div className="min-w-0">
            <div ref={ref} />
          </div>
          <aside className="stories" aria-label="Storylines">
            <div className="stories-k">Storylines</div>
            {stories.map((s, i) => {
              const Icon = ICON[s.kind];
              return (
                <button key={`${s.kind}-${i}`} type="button" className="story" aria-pressed={story === i} onClick={() => setStory((cur) => (cur === i ? null : i))}>
                  <span className="ic">
                    <Icon aria-hidden />
                  </span>
                  <span>
                    <b>{s.kind}</b>
                    <span className="st">{s.title}</span>
                    <span className="sd">{s.detail}</span>
                  </span>
                </button>
              );
            })}
            {stories.length <= 1 && <p className="text-sm text-muted">No comebacks, collapses or final-week knockouts this season.</p>}
          </aside>
      </div>
      {mode === "replay" && <SeasonReplay frames={replay.frames} spots={spots} method={replay.method} managerNames={managerNames} />}
      <details className="text-sm text-muted">
        <summary className="cursor-pointer">View the race as a table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Rank after each week</caption>
            <thead>
              <tr>
                <th className="px-2 py-1">Team</th>
                {weeks.map((w) => (
                  <th key={w} className="px-1.5 py-1 tabular-nums">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((s) => (
                <tr key={s.teamId}>
                  <td className="whitespace-nowrap px-2 py-1">
                    {s.teamName} <span className="text-muted">· {s.managerName}</span>
                  </td>
                  {s.ranks.map((r, i) => (
                    <td key={i} className={`px-1.5 py-1 tabular-nums ${spots && r <= spots ? "text-foreground" : ""}`}>
                      {r}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
