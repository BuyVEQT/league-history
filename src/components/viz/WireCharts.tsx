import type { ActivityVsFinish } from "@/lib/analytics/trades";
import { ordinal } from "@/lib/analytics/format";
import { tt } from "./tt";

type TeamSeason = { year: number; label: string; teamName: string; managerId: string; moves: number; final: number; teams: number };

/** Average adds/drops per team-season by finish group, then every team-season as moves against final finish. */
export function WireCharts({ vf, rows, nameOf }: { vf: ActivityVsFinish; rows: TeamSeason[]; nameOf: (id: string) => string }) {
  return (
    <div className="space-y-4">
      <WireBars vf={vf} />
      <div>
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-[.12em] text-muted">Every team-season</div>
        <WireScatter rows={rows} nameOf={nameOf} />
      </div>
    </div>
  );
}

function WireBars({ vf }: { vf: ActivityVsFinish }) {
  const rows: [string, number, string][] = [
    ["Champions", vf.championsAvg, "var(--gold)"],
    ["Top third", vf.topThirdAvg, "var(--s1)"],
    ["League average", vf.leagueAvg, "var(--ink-2)"],
    ["Bottom third", vf.bottomThirdAvg, "var(--border-2)"],
  ];
  const W = 560;
  const rh = 34;
  const m = { t: 4, r: 50, l: 118 };
  const H = m.t + rows.length * rh;
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const x = (v: number) => (v / max) * (W - m.l - m.r);
  return (
    <svg className="viz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Average moves by final finish group">
      {rows.map(([label, v, color], i) => (
        <g key={label} transform={`translate(0,${m.t + i * rh})`} data-tt={tt(label, [["Moves per team-season", Math.round(v)]], `across ${vf.seasons} seasons`)}>
          <text className="ink" x={m.l - 10} y={rh / 2} dy=".35em" textAnchor="end">
            {label}
          </text>
          <rect x={m.l} y={7} height={rh - 14} rx={4} width={x(v)} fill={color} />
          <text className="ink num" x={m.l + x(v) + 6} y={rh / 2} dy=".35em">
            {Math.round(v)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function WireScatter({ rows, nameOf }: { rows: TeamSeason[]; nameOf: (id: string) => string }) {
  const W = 560;
  const H = 230;
  const m = { t: 10, r: 14, b: 34, l: 40 };
  const maxTeams = Math.max(12, ...rows.map((r) => r.teams));
  // Round the move axis up to a tidy multiple of 20.
  const xMax = Math.max(20, Math.ceil(Math.max(...rows.map((r) => r.moves)) / 20) * 20);
  const x = (v: number) => m.l + (v / xMax) * (W - m.l - m.r);
  const y = (v: number) => m.t + ((v - 1) / (maxTeams - 1)) * (H - m.t - m.b);
  const xTicks = Array.from({ length: xMax / 20 + 1 }, (_, i) => i * 20);
  const yTicks = [1, 4, 8, maxTeams];
  return (
    <svg className="viz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Moves against final finish for each team-season">
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--border)" />
          <text className="lbl num" x={m.l - 6} y={y(t)} dy=".35em" textAnchor="end">
            {ordinal(t)}
          </text>
        </g>
      ))}
      <line x1={m.l} x2={m.l} y1={m.t} y2={H - m.b} stroke="var(--border-2)" />
      {xTicks.map((t) => (
        <text key={t} className="lbl num" x={x(t)} y={H - m.b + 16} textAnchor="middle">
          {t}
        </text>
      ))}
      <text className="lbl" x={W - m.r} y={H - 4} textAnchor="end">
        adds &amp; drops that season →
      </text>
      {/* Champions last so the gold dots sit on top. */}
      {[...rows].sort((a, b) => Number(a.final === 1) - Number(b.final === 1)).map((d) => (
        <circle
          key={`${d.year}-${d.teamName}-${d.managerId}`}
          cx={x(d.moves)}
          cy={y(d.final)}
          r={4.5}
          fill={d.final === 1 ? "var(--gold)" : "var(--s1)"}
          fillOpacity={0.7}
          stroke="var(--surface)"
          data-tt={tt(d.teamName, [
            ["Manager", nameOf(d.managerId)],
            ["Season", d.label],
            ["Moves", d.moves],
            ["Final finish", `${ordinal(d.final)} of ${d.teams}`],
          ])}
        />
      ))}
    </svg>
  );
}
