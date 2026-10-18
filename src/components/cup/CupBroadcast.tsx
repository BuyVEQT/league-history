"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { TimelinePoint } from "@/lib/analytics/cabocloFinal";
import { tt } from "@/components/viz/tt";
import { useD3Chart } from "@/components/viz/useD3Chart";
import { pct4, pct8, reducedMotion } from "./shared";

const BRUNO = "Bruno Caboclo";
const HOLIDAY = "Justin Holiday";

interface Props {
  start: { fgm: number; fga: number; pct: number; leading: boolean };
  points: TimelinePoint[];
  target: number;
  winner: { teamName: string; fgm: number; fga: number };
  loserName: string;
}

/**
 * "Garbage time in LA": a scoreboard and Skip's week FG% after each Grizzlies shot, played back shot by shot.
 * Rest state is tip-off, so the ending isn't spoiled; reduced motion starts at the end.
 */
export function CupBroadcast({ start, points: P, target, winner, loserName }: Props) {
  const N = P.length;
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(start.pct);
  const pctRef = useRef(start.pct);
  const last = P[N - 1];

  useEffect(() => {
    if (reducedMotion()) queueMicrotask(() => setI(N));
  }, [N]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setI((k) => {
        if (k + 1 >= N) setPlaying(false);
        return Math.min(N, k + 1);
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [playing, N]);

  const p = i > 0 ? P[i - 1] : null;
  const cur = p ? p.pct : start.pct;
  const lead = p ? p.leading : start.leading;
  const leadChanges = P.slice(0, i).reduce((c, q, k) => c + ((k ? P[k - 1].leading : start.leading) !== q.leading ? 1 : 0), 0);

  // Tween the big FG% number between shots.
  useEffect(() => {
    const from = pctRef.current;
    pctRef.current = cur;
    if (reducedMotion()) return void queueMicrotask(() => setShown(cur));
    const f = d3.interpolateNumber(from, cur);
    const t = d3.timer((ms) => {
      const k = Math.min(1, ms / 500);
      setShown(f(k));
      if (k >= 1) t.stop();
    });
    return () => t.stop();
  }, [cur]);

  const cabMakes = P.filter((q) => q.player === BRUNO && q.made);
  const hol = P.filter((q) => q.player === HOLIDAY);
  const holMiss = hol.filter((q) => !q.made).length;
  const lastHolMiss = P.reduce((k, q, j) => (q.player === HOLIDAY && !q.made && q.period < 4 ? j : k), 0);
  const holLayup = P.findIndex((q, j) => j > 0 && q.player === HOLIDAY && q.made && q.period === 4);
  const cabFirst = P.indexOf(cabMakes[0]);
  const cabLast = P.indexOf(cabMakes[cabMakes.length - 1]);

  const ref = useD3Chart<HTMLDivElement>(
    (root, { width }) => {
      root.selectAll("*").remove();
      const W = width;
      const H = 300;
      const m = { t: 30, r: W < 520 ? 70 : 150, b: 30, l: 62 };
      const svg = root.append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("class", "viz").attr("role", "img").attr("aria-label", `${loserName}'s week field-goal percentage through the last game, shot ${i} of ${N}`);
      const x = d3.scaleLinear().domain([0, 48]).range([m.l, W - m.r]);
      const y = d3
        .scaleLinear()
        .domain(d3.extent([start.pct, ...P.map((q) => q.pct), target]) as [number, number])
        .nice()
        .range([H - m.b, m.t]);
      [1, 2, 3, 4].forEach((q) => {
        svg.append("rect").attr("x", x((q - 1) * 12)).attr("width", x(12) - x(0)).attr("y", m.t).attr("height", H - m.t - m.b).attr("fill", q % 2 ? "var(--surface-2)" : "transparent");
        svg.append("text").attr("class", "lbl").attr("x", x((q - 0.5) * 12)).attr("y", H - 8).attr("text-anchor", "middle").text(`Q${q}`);
      });
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((v) => pct4(+v)));
      svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(target)).attr("y2", y(target)).attr("stroke", "var(--gold)").attr("stroke-width", 2.5);
      svg.append("text").attr("class", "ink").attr("x", m.l + 6).attr("y", y(target) + 15).style("fill", "var(--gold)").text(`${winner.teamName} finished ${pct8(target)}`);
      svg.append("text").attr("class", "lbl").attr("x", m.l + 6).attr("y", m.t - 10).text("Above the gold line, Jacob wins the title");
      const series = [{ minute: 0, pct: start.pct, p: null as TimelinePoint | null }, ...P.map((q) => ({ minute: q.minute, pct: q.pct, p: q as TimelinePoint | null }))];
      const step = d3
        .line<(typeof series)[number]>()
        .x((d) => x(d.minute))
        .y((d) => y(d.pct))
        .curve(d3.curveStepAfter);
      svg.append("path").attr("fill", "none").attr("stroke", "var(--foreground)").attr("stroke-width", 2.2).attr("d", step(series.slice(0, i + 1)));
      svg
        .append("g")
        .selectAll("circle")
        .data(series.slice(1, i + 1))
        .join("circle")
        .attr("cx", (d) => x(d.minute))
        .attr("cy", (d) => y(d.pct))
        .attr("r", (d) => (d.p!.player === BRUNO ? 7 : 4.5))
        .attr("fill", (d) => (d.p!.made ? "var(--pos)" : "var(--neg)"))
        .attr("stroke", (d) => (d.p!.player === BRUNO ? "var(--foreground)" : "var(--surface)"))
        .attr("stroke-width", 2)
        .attr("data-tt", (d) => tt(`Q${d.p!.period} ${d.p!.clock} · ${d.p!.player}`, [["Play", d.p!.description], ["Score (MEM–LAC)", d.p!.score], [`${loserName} FG%`, pct8(d.pct)]], d.p!.leading ? "Jacob ahead" : "Jacob behind"));
      if (i === N) svg.append("circle").attr("cx", x(last.minute)).attr("cy", y(last.pct)).attr("r", 15).attr("fill", "none").attr("stroke", "var(--neg)").attr("stroke-width", 2).attr("class", "pulse");
      const notes = [
        { at: lastHolMiss, x: x(P[lastHolMiss].minute) - 8, y: y(P[lastHolMiss].pct) + 22, a: "end", t: `Holiday: ${holMiss} misses in ${hol.length} shots` },
        { at: cabLast, x: x(P[cabFirst].minute) + 14, y: y(P[cabFirst].pct) + 5, a: "start", t: `Bruno: ${cabMakes.length} straight`, hot: true },
        ...(holLayup >= 0 ? [{ at: holLayup, x: x(P[holLayup].minute) - 4, y: y(P[holLayup].pct) - 16, a: "end", t: `${P[holLayup].clock} Holiday layup: ahead` }] : []),
      ].filter((n) => i > n.at);
      svg
        .append("g")
        .selectAll("text")
        .data(notes)
        .join("text")
        .attr("class", (d) => (d.hot ? "ink ann hot" : "ink ann"))
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .attr("text-anchor", (d) => d.a)
        .text((d) => d.t);
      const e = series[i];
      svg.append("text").attr("class", "ink").attr("x", x(e.minute) + 12).attr("y", y(e.pct)).attr("dy", ".35em").text(pct4(e.pct)).style("fill", e.pct > target ? "var(--pos)" : "var(--neg)");
      if (i === N) svg.append("text").attr("class", "lbl").attr("x", x(e.minute) + 12).attr("y", y(e.pct) + 16).text(`${last.clock}: the last shot`);
    },
    [i, P, start, target],
  );

  const go = (k: number) => {
    setPlaying(false);
    setI(Math.max(0, Math.min(N, k)));
  };
  const score = p ? p.score.split("-") : ["0", "0"];

  return (
    <>
      <div className="cast-ctl mb-3">
        <button
          type="button"
          className="cup-btn primary"
          onClick={() => {
            if (playing) return setPlaying(false);
            if (i >= N) setI(0);
            setPlaying(true);
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            {playing ? <path d="M7 4h4v16H7zM13 4h4v16h-4z" /> : <path d="M7 4v16l13-8L7 4Z" />}
          </svg>
          <span>{playing ? "Pause" : i >= N ? "Play it again" : i ? "Resume" : "Play the final"}</span>
        </button>
        <button type="button" className="cup-btn" aria-label="Previous shot" onClick={() => go(i - 1)}>
          ‹
        </button>
        <button type="button" className="cup-btn" aria-label="Next shot" onClick={() => go(i + 1)}>
          ›
        </button>
      </div>
      <div className="cast-grid">
        <div className="board" aria-live="polite">
          <div className="board-top">
            <span className="num">{p ? `Q${p.period} · ${p.clock}` : "Tip-off"}</span>
            <span className="num">
              MEM {score[0]} – LAC {score[1]}
            </span>
          </div>
          <div className="board-row">
            <span>{loserName} FG% (Jacob)</span>
            <b className="num">{pct8(shown)}</b>
            <span className="num muted">
              {p ? p.fgm : start.fgm}/{p ? p.fga : start.fga}
            </span>
          </div>
          <div className="board-row tgt">
            <span>{winner.teamName} FG%, final</span>
            <b className="num">{pct8(target)}</b>
            <span className="num muted">
              {winner.fgm}/{winner.fga}
            </span>
          </div>
          <div key={`${i}-${lead}`} className={`board-status ${lead ? "up" : "down"} ${i ? "bump" : ""}`}>
            {lead ? "AHEAD" : "BEHIND"}
          </div>
          <div className="board-play">
            {p ? (
              <>
                <b>{p.player}</b> {p.made ? "makes" : "misses"} {p.description.replace(/^(makes|misses) /, "")}
                {i === N && (
                  <>
                    <br />
                    <b>The last shot of the season.</b>
                  </>
                )}
              </>
            ) : (
              "Every other game is final. Jacob leads FG% going in. Only two of his players are left: Holiday and Caboclo."
            )}
          </div>
          <div className="board-meta">
            <span>
              Lead changes <b className="num">{leadChanges}</b>
            </span>
            <span>
              Shot <b className="num">{i}</b>/{N}
            </span>
          </div>
        </div>
        <div ref={ref} className="min-w-0" />
      </div>
    </>
  );
}
