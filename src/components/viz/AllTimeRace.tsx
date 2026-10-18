"use client";

import { useEffect, useState } from "react";
import type { RaceRow } from "@/lib/analytics/weekly";
import { tt } from "./tt";

type Metric = "catWins" | "titles" | "podiums";
const METRICS: [Metric, string][] = [
  ["catWins", "Category wins"],
  ["titles", "Titles"],
  ["podiums", "Podiums"],
];
const ROW = 30;

/** Running all-time totals as a bar race: scrub or play through the seasons. */
export function AllTimeRace({ frames, names }: { frames: { label: string; rows: RaceRow[] }[]; names: Record<string, string> }) {
  const last = frames.length - 1;
  const [idx, setIdx] = useState(last);
  const [metric, setMetric] = useState<Metric>("catWins");
  const [playing, setPlaying] = useState(false);

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
    }, 1200);
    return () => clearInterval(timer);
  }, [playing, last]);

  const frame = frames[idx];
  const order = [...frame.rows].sort((a, b) => b[metric] - a[metric] || b.catWins - a.catWins || names[a.managerId].localeCompare(names[b.managerId]));
  const rank = new Map(order.map((r, i) => [r.managerId, i]));
  const max = Math.max(1, ...order.map((r) => r[metric]));
  const lead = order[0]?.[metric] ?? 0;
  // Everyone who ever plays keeps a row, so bars slide rather than pop in.
  const everyone = frames[last].rows.map((r) => r.managerId);
  const seasons = Math.max(...frame.rows.map((r) => r.seasons));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="play-btn"
          onClick={() => {
            if (playing) return setPlaying(false);
            if (idx === last) setIdx(0);
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
          aria-label="Season"
          onChange={(e) => {
            setPlaying(false);
            setIdx(Number(e.target.value));
          }}
        />
        <span className="text-sm text-muted">
          {frame.label} · after {seasons} season{seasons === 1 ? "" : "s"}
        </span>
        <div className="seg ml-auto" role="group" aria-label="Measure">
          {METRICS.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={metric === k} onClick={() => setMetric(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="race" style={{ height: everyone.length * ROW + 8 }} role="img" aria-label={`All-time ${METRICS.find(([k]) => k === metric)![1].toLowerCase()} through ${frame.label}`}>
        {everyone.map((id) => {
          const r = frame.rows.find((x) => x.managerId === id);
          const i = rank.get(id) ?? everyone.length;
          const v = r?.[metric] ?? 0;
          return (
            <div
              key={id}
              className="race-row"
              data-m={r ? id : undefined}
              data-m-mark
              data-panel={`manager:${id}`}
              style={{ transform: `translateY(${(r ? i : order.length + everyone.indexOf(id)) * ROW}px)`, opacity: r ? 1 : 0 }}
              data-tt={
                r
                  ? tt(names[id], [
                      ["Category wins", r.catWins],
                      ["Matchup wins", r.wins],
                      ["Titles", r.titles],
                      ["Podiums (top 3)", r.podiums],
                      ["Seasons played", r.seasons],
                    ], `Through ${frame.label}`)
                  : undefined
              }
            >
              <span className="nm">{names[id]}</span>
              <span className="trk">
                <span className={`bar ${v === lead && lead > 0 ? "lead" : ""}`} style={{ width: `calc(${(v / max) * 100}% - 40px)` }} />
                <span className="v">{v}</span>
              </span>
            </div>
          );
        })}
        <span className="race-year">{frame.label}</span>
      </div>
    </div>
  );
}
