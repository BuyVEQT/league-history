import type { ActivityVsFinish } from "@/lib/analytics/trades";
import { ordinal } from "@/lib/analytics/format";
import { tt } from "./tt";
import { WireScatter } from "./WireScatter";

type TeamSeason = { year: number; label: string; teamName: string; managerId: string; moves: number; final: number; teams: number };

/** Average adds/drops per team-season by finish group, then every team-season as moves against final finish. */
export function WireCharts({ vf, rows, nameOf }: { vf: ActivityVsFinish; rows: TeamSeason[]; nameOf: (id: string) => string }) {
  return (
    <div className="space-y-4">
      <WireBars vf={vf} />
      <div>
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-[.12em] text-muted">Every team-season</div>
        <WireScatter
          rows={rows.map((d) => ({
            key: `${d.year}-${d.teamName}-${d.managerId}`,
            managerId: d.managerId,
            teamName: d.teamName,
            manager: nameOf(d.managerId),
            label: d.label,
            moves: d.moves,
            final: d.final,
            finalLabel: `${ordinal(d.final)} of ${d.teams}`,
            teams: d.teams,
          }))}
        />
      </div>
    </div>
  );
}

/** HTML row bars so the labels stay full size at any width; bars grow in with CSS (at rest under reduced motion). */
function WireBars({ vf }: { vf: ActivityVsFinish }) {
  const rows: [string, number, string][] = [
    ["Champions", vf.championsAvg, "var(--gold)"],
    ["Top third", vf.topThirdAvg, "var(--s1)"],
    ["League average", vf.leagueAvg, "var(--ink-2)"],
    ["Bottom third", vf.bottomThirdAvg, "var(--border-2)"],
  ];
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="tx-wire" role="img" aria-label={`Average moves per team-season: ${rows.map(([l, v]) => `${l} ${Math.round(v)}`).join(", ")}`}>
      {rows.map(([label, v, color], i) => (
        <div key={label} className="tx-wire-row" data-tt={tt(label, [["Moves per team-season", Math.round(v)]], `across ${vf.seasons} seasons`)}>
          <span className="tx-wire-nm">{label}</span>
          <span className="tx-wire-trk">
            <span className="tx-wire-bar" style={{ width: `calc(${(v / max) * 100}% - ${((v / max) * 34).toFixed(1)}px)`, background: color, animationDelay: `${i * 80}ms` }} />
            <span className="tx-wire-v tx-wire-fade" style={{ animationDelay: `${300 + i * 80}ms` }}>
              {Math.round(v)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
