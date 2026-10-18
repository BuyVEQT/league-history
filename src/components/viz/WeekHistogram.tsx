import { tt } from "./tt";

/** Share of weeks with k categories won (bars) against the league's average week (line). */
export function WeekHistogram({ dist, leagueDist, name }: { dist: number[]; leagueDist: number[]; name: string }) {
  const W = 560;
  const H = 250;
  const m = { t: 12, r: 8, b: 40, l: 40 };
  const n = dist.reduce((a, b) => a + b, 0) || 1;
  const ln = leagueDist.reduce((a, b) => a + b, 0) || 1;
  const rows = dist.map((c, k) => ({ k, c, me: c / n, lg: leagueDist[k] / ln }));
  const max = Math.ceil(Math.max(...rows.map((r) => Math.max(r.me, r.lg))) * 1.1 * 20) / 20;
  const band = (W - m.l - m.r) / rows.length;
  const cx = (k: number) => m.l + band * (k + 0.5);
  const y = (v: number) => H - m.b - (v / max) * (H - m.t - m.b);
  const ticks = [0, max / 2, max].map((v) => Math.round(v * 100) / 100);
  const bw = Math.min(26, band * 0.65);
  const line = rows.map((r, i) => `${i ? "L" : "M"}${cx(r.k)},${y(r.lg)}`).join("");
  return (
    <svg className="viz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Categories won per week by ${name}, against the league average`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--border)" />
          <text className="lbl num" x={m.l - 6} y={y(t)} dy=".35em" textAnchor="end">
            {Math.round(t * 100)}%
          </text>
        </g>
      ))}
      {rows.map((r) => (
        <g key={r.k} data-tt={tt(`Won ${r.k} of ${rows.length - 1} categories`, [[name, `${r.c} weeks (${Math.round(r.me * 100)}%)`], ["League average", `${Math.round(r.lg * 100)}%`]])}>
          <rect x={cx(r.k) - band / 2} y={0} width={band} height={H} fill="transparent" />
          <rect className="mg-grow" style={{ animationDelay: `${r.k * 45}ms` }} x={cx(r.k) - bw / 2} y={y(r.me)} width={bw} height={Math.max(0, H - m.b - y(r.me))} rx={3} fill="var(--s1)" />
          <text className="lbl num" x={cx(r.k)} y={H - m.b + 16} textAnchor="middle">
            {r.k}
          </text>
        </g>
      ))}
      <path className="mg-draw" pathLength={1} d={line} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
      <text className="lbl" x={W - m.r} y={H - 2} textAnchor="end">
        categories won →
      </text>
    </svg>
  );
}
