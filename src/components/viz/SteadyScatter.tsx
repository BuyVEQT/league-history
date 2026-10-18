import type { ConsistencyRow } from "@/lib/analytics/records";
import { tt } from "./tt";

/** Typical finish (across) against year-to-year swing (up); names in a column on the right with leader lines. */
export function SteadyScatter({ rows, titles, nameOf }: { rows: ConsistencyRow[]; titles: Record<string, number>; nameOf: (id: string) => string }) {
  const W = 560;
  const H = 340;
  const m = { t: 14, r: 112, b: 40, l: 48 };
  const xMax = Math.max(0.8, Math.ceil((Math.max(...rows.map((r) => r.avgPercentile)) + 0.05) * 10) / 10);
  const yMax = Math.ceil(Math.max(...rows.map((r) => r.spread)) * 1.15 * 10) / 10 || 0.1;
  const x = (v: number) => m.l + (v / xMax) * (W - m.l - m.r);
  const y = (v: number) => H - m.b - (v / yMax) * (H - m.t - m.b);
  const xTicks = Array.from({ length: Math.round(xMax / 0.2) + 1 }, (_, i) => i * 0.2);
  const yTicks = Array.from({ length: Math.round(yMax / 0.1) + 1 }, (_, i) => i * 0.1);
  const colX = W - m.r + 14;
  const labs = rows.map((r) => ({ r, x0: x(r.avgPercentile), y0: y(r.spread) })).sort((p, q) => p.y0 - q.y0);
  const span = (labs.length - 1) * 15;
  const mid = labs.reduce((a, l) => a + l.y0, 0) / (labs.length || 1);
  const top = Math.max(m.t, Math.min(mid - span / 2, H - m.b - span));
  return (
    <svg className="viz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Typical finish against year-to-year swing, by manager">
      <rect x={m.l} y={y(yMax / 2)} width={x(0.5) - m.l} height={H - m.b - y(yMax / 2)} fill="var(--pos-wash)" opacity={0.6} />
      <text className="lbl" x={m.l + 6} y={H - m.b - 8}>
        always near the top
      </text>
      {xTicks.map((t) => (
        <text key={t} className="lbl num" x={x(t)} y={H - m.b + 16} textAnchor="middle">
          {t === 0 ? "1st" : `top ${Math.round(t * 100)}%`}
        </text>
      ))}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--border)" />
          <text className="lbl num" x={m.l - 6} y={y(t)} dy=".35em" textAnchor="end">
            ±{Math.round(t * 100)}%
          </text>
        </g>
      ))}
      <text className="lbl" x={W - m.r} y={H - 4} textAnchor="end">
        typical finish →
      </text>
      <text className="lbl" x={m.l} y={m.t - 2}>
        ↑ swing
      </text>
      {labs.map((l, i) => {
        const ly = top + i * 15;
        return (
          <g key={l.r.managerId} pointerEvents="none">
            <path d={`M${l.x0 + 8},${l.y0}C${colX - 30},${l.y0} ${colX - 30},${ly} ${colX - 4},${ly}`} fill="none" stroke="var(--border-2)" />
            <text className="ink" x={colX} y={ly} dy=".35em">
              {nameOf(l.r.managerId)}
            </text>
          </g>
        );
      })}
      {rows.map((r) => (
        <circle
          key={r.managerId}
          cx={x(r.avgPercentile)}
          cy={y(r.spread)}
          r={7}
          fill={titles[r.managerId] ? "var(--gold)" : "var(--s1)"}
          stroke="var(--surface)"
          strokeWidth={2}
          data-tt={tt(nameOf(r.managerId), [
            ["Seasons", r.seasons],
            ["Typical finish", `top ${Math.round(r.avgPercentile * 100)}%`],
            ["Swing", `±${Math.round(r.spread * 100)}%`],
            ["Titles", titles[r.managerId] ?? 0],
          ])}
        />
      ))}
    </svg>
  );
}
