import { ordinal } from "@/lib/analytics/format";
import type { careerPath } from "@/lib/analytics/weekly";
import { tt } from "./tt";

type Point = ReturnType<typeof careerPath>[number];

/** Each season (dots pop in one season at a time; CSS, so it stays a server component): regular-season seed (ring) and final finish (dot, gold for a title), joined by a line colored by the playoff move. */
export function CareerPath({ points, years, maxTeams }: { points: Point[]; years: { year: number; label: string }[]; maxTeams: number }) {
  const W = 560;
  const H = 250;
  const m = { t: 14, r: 14, b: 26, l: 38 };
  const step = (W - m.l - m.r) / years.length;
  const x = (year: number) => m.l + step * (years.findIndex((y) => y.year === year) + 0.5);
  const y = (rank: number) => m.t + ((rank - 1) / (maxTeams - 1)) * (H - m.t - m.b);
  const ticks = [1, Math.round(maxTeams / 3), Math.round((2 * maxTeams) / 3), maxTeams];
  return (
    <svg className="viz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Regular-season seed and final finish by season">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--border)" />
          <text className="lbl num" x={m.l - 8} y={y(t)} dy=".35em" textAnchor="end">
            {ordinal(t)}
          </text>
        </g>
      ))}
      {years.map((yr) => (
        <text key={yr.year} className="lbl" x={x(yr.year)} y={H - 6} textAnchor="middle">
          &apos;{String(yr.year).slice(2)}
        </text>
      ))}
      {points.map((p, i) => {
        const stroke = p.final < p.seed ? "var(--pos)" : p.final > p.seed ? "var(--neg)" : "var(--border-2)";
        return (
          <g
            key={p.year}
            data-tt={tt(`${p.label} · ${p.teamName}`, [
              ["Seed", `${p.seed} of ${p.teams}`],
              ["Final", ordinal(p.final)],
              ["Result", p.result],
            ])}
          >
            <rect x={x(p.year) - step / 2} y={0} width={step} height={H} fill="transparent" />
            <line className="mg-fade" style={{ animationDelay: `${i * 70 + 150}ms` }} x1={x(p.year)} x2={x(p.year)} y1={y(p.seed)} y2={y(p.final)} stroke={stroke} strokeWidth={2} />
            <circle className="mg-pop" style={{ animationDelay: `${i * 70}ms` }} cx={x(p.year)} cy={y(p.seed)} r={5} fill="var(--surface)" stroke="var(--ink-2)" strokeWidth={2} />
            <circle className="mg-pop" style={{ animationDelay: `${i * 70 + 120}ms` }} cx={x(p.year)} cy={y(p.final)} r={p.final === 1 ? 8 : 6} fill={p.final === 1 ? "var(--gold)" : "var(--s1)"} stroke="var(--surface)" strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
}
