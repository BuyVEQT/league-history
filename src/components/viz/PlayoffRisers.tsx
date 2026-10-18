import { signed } from "@/components/draft";
import { ordinal } from "@/lib/analytics/format";
import type { PlayoffRow } from "@/lib/analytics/records";
import { tt } from "./tt";

/** An arrow per manager from average playoff seed to average final finish: pointing left = finishes better than seeded. */
export function PlayoffRisers({ rows, nameOf }: { rows: PlayoffRow[]; nameOf: (id: string) => string }) {
  const sorted = rows.filter((r) => r.appearances).sort((a, b) => b.avgOverSeed - a.avgOverSeed);
  const W = 1000;
  const rh = 30;
  const m = { t: 26, r: 170, b: 6, l: 100 };
  const H = m.t + m.b + sorted.length * rh;
  const hi = Math.max(8, Math.ceil(Math.max(...sorted.flatMap((r) => [r.avgSeed, r.avgFinish]))));
  const x = (v: number) => m.l + ((v - 1) / (hi - 1)) * (W - m.l - m.r);
  return (
    <svg className="viz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Average playoff seed against average final finish, by manager">
      <defs>
        {(["pos", "neg"] as const).map((k) => (
          <marker key={k} id={`ar-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0L10,5L0,10z" fill={`var(--${k})`} />
          </marker>
        ))}
      </defs>
      {Array.from({ length: hi }, (_, i) => i + 1).map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={m.t - 6} y2={H - m.b} stroke="var(--border)" />
          <text className="lbl num" x={x(v)} y={12} textAnchor="middle">
            {ordinal(v)}
          </text>
        </g>
      ))}
      {sorted.map((r, i) => {
        const cy = m.t + i * rh + rh / 2;
        const up = r.avgOverSeed >= 0;
        const arrow = Math.abs(r.avgOverSeed) > 0.15;
        const end = x(r.avgFinish) + (arrow ? (up ? 5 : -5) : 0);
        return (
          <g
            key={r.managerId}
            data-tt={tt(nameOf(r.managerId), [
              ["Playoff trips", r.appearances],
              ["Avg seed", r.avgSeed.toFixed(1)],
              ["Avg finish", r.avgFinish.toFixed(1)],
              ["Places gained", signed(r.avgOverSeed, 1)],
              ["Playoff W-L", `${r.playoffWins}-${r.playoffLosses}`],
              ["Finals / titles", `${r.finals} / ${r.titles}`],
            ])}
          >
            <rect x={0} y={cy - rh / 2} width={W} height={rh} fill="transparent" />
            <text className="ink" x={m.l - 12} y={cy} dy=".35em" textAnchor="end">
              {nameOf(r.managerId)}
            </text>
            <line x1={x(r.avgSeed)} x2={end} y1={cy} y2={cy} stroke={up ? "var(--pos)" : "var(--neg)"} strokeWidth={3.5} markerEnd={arrow ? `url(#ar-${up ? "pos" : "neg"})` : undefined} />
            <circle cx={x(r.avgSeed)} cy={cy} r={4.5} fill="var(--surface)" stroke="var(--ink-2)" strokeWidth={1.5} />
            <text className="lbl num" x={W - m.r + 14} y={cy} dy=".35em">
              {signed(r.avgOverSeed, 1)} · {r.playoffWins}-{r.playoffLosses}
              {r.titles ? ` · ${r.titles} title${r.titles > 1 ? "s" : ""}` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
