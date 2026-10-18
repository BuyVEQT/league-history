import type { StandingRow } from "@/lib/analytics/season";
import { tt } from "./tt";

const short = (s: string, n = 17) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Slope chart: the real standings on the left, the same results ranked the other way on the right.
 * Lines that cross the dashed playoff line are the teams the method decided.
 */
export function WhatIfSlope({
  actual,
  alt,
  spots,
  leftLabel,
  rightLabel,
  managerName,
}: {
  actual: StandingRow[];
  alt: StandingRow[];
  spots: number;
  leftLabel: string;
  rightLabel: string;
  managerName: (id: string) => string;
}) {
  const n = actual.length;
  const W = 560;
  const rowH = 24;
  const top = 26;
  const H = top + n * rowH + 6;
  const colL = 170;
  const colR = W - 170;
  const y = (rank: number) => top + (rank - 0.5) * rowH;
  const altRank = new Map(alt.map((r) => [r.teamId, r.rank]));
  const cut = top + spots * rowH;
  return (
    <svg className="viz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Standings by ${leftLabel} against standings by ${rightLabel}`}>
      <text className="lbl" x={colL} y={12} textAnchor="end" fontWeight={700}>
        REAL ({leftLabel.toUpperCase()})
      </text>
      <text className="lbl" x={colR} y={12} fontWeight={700}>
        BY {rightLabel.toUpperCase()}
      </text>
      <line x1={0} x2={W} y1={cut} y2={cut} stroke="var(--accent)" strokeDasharray="4 3" />
      <text className="lbl" x={(colL + colR) / 2} y={cut - 4} textAnchor="middle" style={{ fill: "var(--accent-ink)" }}>
        playoff line
      </text>
      {actual.map((r) => {
        const a = altRank.get(r.teamId)!;
        const moved = r.rank <= spots !== a <= spots;
        const stroke = moved ? (a <= spots ? "var(--pos)" : "var(--neg)") : "var(--border-2)";
        const rec = `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ""}`;
        return (
          <g
            key={r.teamId}
            data-tt={tt(r.teamName, [
              ["Real place", r.rank],
              [`By ${rightLabel}`, a],
              ["Matchups W-L-T", `${r.wins}-${r.losses}-${r.ties}`],
              ["Categories W-L-T", `${r.catWins}-${r.catLosses}-${r.catTies}`],
            ])}
          >
            <rect x={0} y={y(r.rank) - rowH / 2} width={colL + 8} height={rowH} fill="transparent" />
            <line x1={colL + 8} x2={colR - 8} y1={y(r.rank)} y2={y(a)} stroke={stroke} strokeWidth={moved ? 3 : 1.5} />
            <circle cx={colL + 8} cy={y(r.rank)} r={3} fill={stroke} />
            <circle cx={colR - 8} cy={y(a)} r={3} fill={stroke} />
            <text className="ink" x={colL} y={y(r.rank)} dy=".35em" textAnchor="end" fontWeight={moved ? 800 : 500}>
              {r.rank}. {short(r.teamName)}
            </text>
            <text className="ink" x={colR} y={y(a)} dy=".35em" fontWeight={moved ? 800 : 500} style={{ fill: "var(--ink-2)" }}>
              {a}. {managerName(r.managerId)} · {rec}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
