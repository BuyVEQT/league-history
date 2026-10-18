import type { finalTimeline } from "@/lib/analytics/cabocloFinal";
import { tt } from "./tt";

const pct8 = (v: number) => v.toFixed(8).replace(/^0/, "");

/**
 * Skip's season-ending FG% through the last game of the 2018-19 fantasy season, one step per shot, against the
 * line Klaw Leonard had already finished on. Blue above the line = Skip winning the category (and the Cup).
 */
export function FinalShotChart({ timeline, winnerLabel, loserLabel }: { timeline: ReturnType<typeof finalTimeline>; winnerLabel: string; loserLabel: string }) {
  const { target, start, points } = timeline;
  const W = 1000;
  const H = 340;
  const m = { t: 24, r: 24, b: 40, l: 70 };
  const pcts = [target, start.pct, ...points.map((p) => p.pct)];
  const pad = (Math.max(...pcts) - Math.min(...pcts)) * 0.18;
  const lo = Math.min(...pcts) - pad;
  const hi = Math.max(...pcts) + pad;
  const x = (min: number) => m.l + (min / 48) * (W - m.l - m.r);
  const y = (v: number) => m.t + ((hi - v) / (hi - lo)) * (H - m.t - m.b);
  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * (i + 0.5)) / 5);
  // Step line: flat between shots, jumping at each one.
  let d = `M${x(0)},${y(start.pct)}`;
  for (const p of points) d += `H${x(p.minute)}V${y(p.pct)}`;
  d += `H${x(48)}`;
  const last = points.at(-1)!;
  return (
    <svg className="viz cf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${loserLabel}'s field-goal percentage through the last game of the season, against ${winnerLabel}'s final ${pct8(target)}. ${loserLabel} went back in front with 2:58 left and fell behind on the last shot.`}>
      <rect x={m.l} y={m.t} width={W - m.l - m.r} height={y(target) - m.t} fill="var(--pos-wash)" opacity={0.55} />
      <text className="lbl" x={m.l + 8} y={m.t + 16} style={{ fill: "var(--pos)", fontWeight: 700 }}>
        ABOVE THE LINE: {loserLabel.toUpperCase()} WINS FG% AND THE CUP
      </text>
      {[1, 2, 3, 4].map((q) => (
        <g key={q}>
          {q > 1 && <line x1={x((q - 1) * 12)} x2={x((q - 1) * 12)} y1={m.t} y2={H - m.b} stroke="var(--border)" />}
          <text className="lbl" x={x((q - 0.5) * 12)} y={H - 14} textAnchor="middle">
            {q === 4 ? "4th quarter" : `${["1st", "2nd", "3rd"][q - 1]} quarter`}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <text key={t} className="lbl num" x={m.l - 8} y={y(t)} dy=".35em" textAnchor="end">
          {t.toFixed(4).replace(/^0/, "")}
        </text>
      ))}
      <line x1={m.l} x2={W - m.r} y1={y(target)} y2={y(target)} stroke="var(--gold)" strokeWidth={2.5} strokeDasharray="6 4" />
      <text className="ink" x={m.l + 8} y={y(target) + 18} style={{ fill: "var(--foreground)" }}>
        {winnerLabel}, final: {pct8(target)}
      </text>
      <path d={d} fill="none" stroke="var(--s1)" strokeWidth={2.5} strokeLinejoin="round" className="cf-line" />
      {points.map((p, i) => {
        const caboclo = p.player === "Bruno Caboclo";
        const isLast = i === points.length - 1;
        return (
          <g
            key={i}
            data-tt={tt(`Q${p.period} ${p.clock} · ${p.player}`, [
              ["Shot", p.description],
              ["Score", `MEM ${p.score.replace("-", " – LAC ")}`],
              [`${loserLabel} FG`, `${p.fgm}/${p.fga} = ${pct8(p.pct)}`],
              [winnerLabel, pct8(target)],
            ], p.leading ? `${loserLabel} ahead` : `${loserLabel} behind`)}
          >
            <circle cx={x(p.minute)} cy={y(p.pct)} r={14} fill="transparent" />
            <circle
              cx={x(p.minute)}
              cy={y(p.pct)}
              r={caboclo ? 6.5 : 4.5}
              fill={p.made ? "var(--pos)" : "var(--neg)"}
              stroke={isLast ? "var(--accent)" : caboclo ? "var(--foreground)" : "var(--surface)"}
              strokeWidth={isLast ? 3.5 : caboclo ? 2 : 1.5}
            />
          </g>
        );
      })}
      <g pointerEvents="none">
        <line x1={x(last.minute)} x2={x(last.minute) - 40} y1={y(last.pct)} y2={m.t + 44} stroke="var(--accent)" />
        <text className="ink" x={x(last.minute) - 44} y={m.t + 40} textAnchor="end" style={{ fill: "var(--accent-ink)" }}>
          Q4 {last.clock}: Caboclo misses from 6 ft
        </text>
        <text className="lbl" x={x(last.minute) - 44} y={m.t + 56} textAnchor="end">
          {loserLabel} drops to {pct8(last.pct)}
        </text>
      </g>
    </svg>
  );
}
