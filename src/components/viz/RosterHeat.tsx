import { ordinal as ord } from "@/lib/analytics/format";
import type { RosterProfiles } from "@/lib/analytics/players";
import { tt } from "./tt";

const CW = 52;
const CH = 28;
const LW = 170;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const signed = (z: number, d: number) => {
  const r = Number(z.toFixed(d));
  return r === 0 ? (0).toFixed(d) : `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(d)}`;
};

/** Gray at 0, full blue (strong) or red (weak) at ±2 standard scores. */
const fill = (z: number) => `color-mix(in srgb, var(${z >= 0 ? "--pos" : "--neg"}) ${Math.round(Math.min(1, Math.abs(z) / 2) * 100)}%, var(--mid))`;

/** Roster builds as a heat map: one row per team, one cell per category; likely punts are outlined. */
export function RosterHeat({ builds, managerName }: { builds: RosterProfiles; managerName: (id: string) => string }) {
  const cats = builds.categories;
  const W = LW + cats.length * CW + 64;
  const H = 24 + builds.rows.length * CH;
  return (
    <div className="overflow-x-auto">
      <svg className="viz" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W, minWidth: Math.min(W, 560) }} role="img" aria-label="Category strengths of every roster, as standard scores against the league">
        {cats.map((c, j) => (
          <text key={c} className="lbl" x={LW + j * CW + CW / 2} y={14} textAnchor="middle" fontWeight={700}>
            {c}
          </text>
        ))}
        <text className="lbl" x={LW + cats.length * CW + 10} y={14} fontWeight={700}>
          FINISH
        </text>
        {builds.rows.map((r, i) => (
          <g key={r.teamId} transform={`translate(0,${24 + i * CH})`}>
            <text className="ink" x={LW - 10} y={CH / 2} dy=".35em" textAnchor="end">
              <title>{`${r.teamName} · ${managerName(r.managerId)}`}</title>
              {clip(r.teamName, 22)}
            </text>
            <text className="lbl num" x={LW + cats.length * CW + 10} y={CH / 2} dy=".35em" style={{ fill: r.finalRank === 1 ? "var(--gold)" : "var(--ink-2)", fontWeight: r.finalRank === 1 ? 800 : 500 }}>
              {r.finalRank === 1 ? "🏆 1st" : ord(r.finalRank)}
            </text>
            {cats.map((c, j) => {
              const z = r.z[c];
              const punt = r.punts.includes(c);
              return (
                <g
                  key={c}
                  className="roster-cell"
                  style={{ animationDelay: `${j * 30 + i * 12}ms` }}
                  transform={`translate(${LW + j * CW},0)`}
                  data-tt={tt(
                    `${r.teamName} · ${c}`,
                    [
                      ["Standard score", signed(z, 2)],
                      ["Manager", managerName(r.managerId)],
                    ],
                    punt ? "Looks like a punt" : z >= 1 ? "A strength" : z <= -1 ? "A weakness" : "",
                  )}
                >
                  <rect x={2} y={2} width={CW - 4} height={CH - 4} rx={4} style={{ fill: fill(z) }} stroke={punt ? "var(--foreground)" : "none"} strokeWidth={2} />
                  <text className="num" x={CW / 2} y={CH / 2} dy=".35em" textAnchor="middle" fontSize={11} fontWeight={700} style={{ fill: Math.abs(z) > 1.2 ? "#fff" : "var(--foreground)" }}>
                    {punt ? "PUNT" : signed(z, 1)}
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
