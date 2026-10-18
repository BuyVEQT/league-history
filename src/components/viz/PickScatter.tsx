"use client";

import { useState, type ReactNode } from "react";
import { rankLabel, signed } from "@/components/draft";
import { tt } from "./tt";

/** One pick, trimmed to what the scatter draws: year, overall pick, round, finish and preseason rank, value, manager, player. */
export type ScatterPick = { y: number; ov: number; rd: number; ar: number | null; pr: number | null; v: number; m: string; p: string; id?: string };

const W = 1140;
const H = 480;
const m = { t: 18, r: 18, b: 40, l: 50 };
/** Picks that finished outside the top 300 sit in a band just below #300. */
const UNRANKED = 301;

/** Every pick ever: overall pick across, finish rank down. Above the diagonal beat the slot. */
export function PickScatter({
  picks,
  names,
  seasons,
  manager: controlled,
  onManager,
}: {
  picks: ScatterPick[];
  names: Record<string, string>;
  seasons: { year: number; label: string }[];
  /** Highlighted manager, when a parent owns it (the draft report card); "" = everyone. */
  manager?: string;
  onManager?: (id: string) => void;
}) {
  const [own, setOwn] = useState("");
  const manager = controlled ?? own;
  const setManager = onManager ?? setOwn;
  const [year, setYear] = useState("");
  const maxOv = Math.max(...picks.map((p) => p.ov));
  const x = (v: number) => m.l + ((v - 1) / (maxOv - 1 || 1)) * (W - m.l - m.r);
  const y = (v: number) => m.t + ((v - 1) / 309) * (H - m.t - m.b);
  const step = maxOv > 200 ? 50 : 20;
  const xTicks = Array.from({ length: Math.floor(maxOv / step) }, (_, i) => (i + 1) * step);
  const labelOf = new Map(seasons.map((s) => [s.year, s.label]));
  const managers = Object.keys(names)
    .filter((id) => picks.some((p) => p.m === id))
    .sort((a, b) => names[a].localeCompare(names[b]));

  const any = manager !== "" || year !== "";
  const on = (p: ScatterPick) => (!manager || p.m === manager) && (!year || String(p.y) === year);
  // Highlighted dots draw last so they sit on top.
  const ordered = any ? [...picks.filter((p) => !on(p)), ...picks.filter(on)] : picks;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Picker id="sc-m" label="Highlight manager" value={manager} onChange={setManager}>
          <option value="">Everyone</option>
          {managers.map((id) => (
            <option key={id} value={id}>
              {names[id]}
            </option>
          ))}
        </Picker>
        <Picker id="sc-y" label="Season" value={year} onChange={setYear}>
          <option value="">All seasons</option>
          {seasons.map((s) => (
            <option key={s.year} value={s.year}>
              {s.label}
            </option>
          ))}
        </Picker>
      </div>
      <svg className="viz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Every draft pick: draft slot against end-of-season rank">
        <path d={`M${x(1)},${y(1)}L${x(maxOv)},${y(maxOv)}L${x(maxOv)},${y(1)}Z`} fill="var(--pos-wash)" opacity={0.5} />
        <line x1={x(1)} y1={y(1)} x2={x(maxOv)} y2={y(maxOv)} stroke="var(--ink-2)" strokeDasharray="4 4" />
        <text className="lbl" x={x(maxOv) - 4} y={y(maxOv) - 8} textAnchor="end">
          finished exactly where drafted
        </text>
        <text className="lbl" x={x(maxOv * 0.72)} y={y(30)} style={{ fontWeight: 700, fill: "var(--pos)" }}>
          STEALS ↖
        </text>
        <text className="lbl" x={x(4)} y={y(270)} style={{ fontWeight: 700, fill: "var(--neg)" }}>
          ↙ BUSTS
        </text>
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="var(--border-2)" />
        <line x1={m.l} x2={m.l} y1={m.t} y2={H - m.b} stroke="var(--border-2)" />
        {xTicks.map((t) => (
          <text key={t} className="lbl num" x={x(t)} y={H - m.b + 16} textAnchor="middle">
            #{t}
          </text>
        ))}
        {[1, 50, 100, 150, 200, 250, 300].map((t) => (
          <text key={t} className="lbl num" x={m.l - 6} y={y(t)} dy=".35em" textAnchor="end">
            {t === 300 ? "300+" : `#${t}`}
          </text>
        ))}
        <text className="lbl" x={W - m.r} y={H - 4} textAnchor="end">
          overall pick →
        </text>
        <text className="lbl" x={m.l + 4} y={m.t - 6}>
          finish rank ↓ (1 = best)
        </text>
        <g className="dr-sweep">
        {ordered.map((p) => {
          const lit = any && on(p);
          return (
            <circle
              key={`${p.y}-${p.ov}`}
              cx={x(p.ov)}
              // Unranked picks get a small deterministic jitter so they don't stack into one line.
              cy={p.ar === null ? y(UNRANKED) + (((p.ov * 37 + p.y) % 11) - 5) : y(p.ar)}
              r={lit ? 5.5 : 3.2}
              fill={p.ar === null ? "var(--border-2)" : p.v >= 0 ? "var(--pos)" : "var(--neg)"}
              fillOpacity={!any ? 0.55 : lit ? 0.95 : 0.08}
              stroke={lit ? "var(--surface)" : "none"}
              style={{ transition: "r .35s, fill-opacity .35s" }}
              data-panel={p.id ? `player:${p.id}` : undefined}
              data-tt={tt(p.p, [
                ["Season", labelOf.get(p.y) ?? String(p.y)],
                ["Drafted by", names[p.m] ?? p.m],
                ["Pick", `Rd ${p.rd}, #${p.ov}`],
                ["Finished", rankLabel(p.ar)],
                ["Preseason rank", p.pr === null ? "—" : `#${p.pr}`],
                ["Value", signed(p.v, 1)],
              ])}
            />
          );
        })}
        </g>
      </svg>
      <div className="viz-legend">
        <span>
          <i className="dot" style={{ background: "var(--pos)" }} />
          Steal (finished better than drafted)
        </span>
        <span>
          <i className="dot" style={{ background: "var(--neg)" }} />
          Bust
        </span>
        <span>
          <i className="dot" style={{ background: "var(--border-2)" }} />
          Outside the top 300 (shown at 300+)
        </span>
      </div>
    </div>
  );
}

function Picker({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-[color:var(--border-2)] bg-surface px-2 py-1.5 text-sm font-semibold">
        {children}
      </select>
    </div>
  );
}
