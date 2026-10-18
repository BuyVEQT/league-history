import type { HealthCell } from "@/lib/analytics/injuryView";
import { tt } from "./tt";

const CW = 58;
const CH = 30;
const LW = 120;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Blue when a draft's round 1-3 picks played more games than the league average, red when fewer; full colour at ±20 points. */
const fill = (diff: number) => `color-mix(in srgb, var(${diff >= 0 ? "--pos" : "--neg"}) ${Math.round(Math.min(1, Math.abs(diff) / 0.2) * 100)}%, var(--mid))`;

/** Injury luck as a heat map: one row per manager, one cell per draft, coloured by how much their early picks played. */
export function HealthHeat({
  managers,
  years,
  cell,
  league,
  managerName,
}: {
  managers: string[];
  years: { year: number; label: string }[];
  cell: (managerId: string, year: number) => HealthCell | null;
  /** League-wide share of games round 1-3 picks played, 0-1: the grey midpoint. */
  league: number;
  managerName: (id: string) => string;
}) {
  const W = LW + years.length * CW + 8;
  const H = 24 + managers.length * CH;
  return (
    <div className="overflow-x-auto">
      <svg className="viz" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W, minWidth: Math.min(W, 520) }} role="img" aria-label="Share of games each manager's round 1-3 picks played, draft by draft">
        {years.map((y, j) => (
          <text key={y.year} className="lbl" x={LW + j * CW + CW / 2} y={14} textAnchor="middle" fontWeight={700}>
            {y.label}
          </text>
        ))}
        {managers.map((m, i) => (
          <g key={m} transform={`translate(0,${24 + i * CH})`} data-m={m}>
            <text className="ink" x={LW - 10} y={CH / 2} dy=".35em" textAnchor="end">
              {clip(managerName(m), 16)}
            </text>
            {years.map((y, j) => {
              const c = cell(m, y.year);
              if (!c) return null;
              const diff = c.availability - league;
              return (
                <g
                  key={y.year}
                  className="roster-cell"
                  style={{ animationDelay: `${j * 30 + i * 12}ms` }}
                  transform={`translate(${LW + j * CW},0)`}
                  data-tt={tt(
                    `${managerName(m)} · ${c.label}`,
                    c.picks.map((p) => [`Rd ${p.round} ${p.playerName}`, `${p.games} of ${p.scheduled}`]),
                    `${Math.round(c.availability * 100)}% of possible games, ${c.missed} missed (league average ${Math.round(league * 100)}%).`,
                  )}
                >
                  <rect x={2} y={2} width={CW - 4} height={CH - 4} rx={4} style={{ fill: fill(diff) }} />
                  <text className="num" x={CW / 2} y={CH / 2} dy=".35em" textAnchor="middle" fontSize={11} fontWeight={700} style={{ fill: Math.abs(diff) > 0.12 ? "#fff" : "var(--foreground)" }}>
                    {Math.round(c.availability * 100)}%
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
