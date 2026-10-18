import Link from "next/link";
import { matchupWinner, teamIndex, type StandingRow } from "@/lib/analytics/season";
import type { Season } from "@/lib/types";
import { tt } from "./tt";

/** Blue (won) or red (lost) shaded by margin: a one-category week is the wash, seven or more the full color. */
const shade = (won: boolean, margin: number) => {
  const k = Math.round(((Math.min(Math.max(margin, 1), 7) - 1) / 6) * 100);
  return `color-mix(in srgb, var(${won ? "--pos" : "--neg"}) ${k}%, var(${won ? "--pos-wash" : "--neg-wash"}))`;
};

/**
 * Every team (standings order) by every week: categories won, colored by result. Playoff weeks are outlined in gold.
 * With `base` (the league root, "/demo"), every cell and week number opens that week's page.
 */
export function WeekGrid({ season, standings, base }: { season: Season; standings: StandingRow[]; base?: string }) {
  const weekHref = (w: number) => `${base}/seasons/${season.year}/week/${w}`;
  const teams = teamIndex(season);
  const weeks = [...new Set(season.matchups.map((m) => m.week))].sort((a, b) => a - b);
  const playoffWeek = new Set(season.matchups.filter((m) => m.stage !== "regular").map((m) => m.week));
  const cell = new Map<string, { my: number; their: number; tied: number; opp: string; won: boolean | null; po: boolean }>();
  for (const m of season.matchups) {
    const w = matchupWinner(m);
    const po = m.stage !== "regular";
    cell.set(`${m.homeTeamId}|${m.week}`, { my: m.homeCats, their: m.awayCats, tied: m.tiedCats, opp: m.awayTeamId, won: w === null ? null : w === m.homeTeamId, po });
    cell.set(`${m.awayTeamId}|${m.week}`, { my: m.awayCats, their: m.homeCats, tied: m.tiedCats, opp: m.homeTeamId, won: w === null ? null : w === m.awayTeamId, po });
  }
  return (
    <div className="overflow-x-auto">
      <div className="wgrid" style={{ gridTemplateColumns: `minmax(120px, 190px) repeat(${weeks.length}, minmax(24px, 1fr))` }} role={base ? "group" : "img"} aria-label={`${season.label}: categories won by every team in every week`}>
        <span />
        {weeks.map((w) =>
          base ? (
            <Link key={w} href={weekHref(w)} className="h" title={playoffWeek.has(w) ? `Week ${w}, playoffs` : `Week ${w}`}>
              {playoffWeek.has(w) ? "P" : w}
            </Link>
          ) : (
            <span key={w} className="h" title={playoffWeek.has(w) ? `Week ${w}, playoffs` : `Week ${w}`}>
              {playoffWeek.has(w) ? "P" : w}
            </span>
          ),
        )}
        {standings.map((r) => (
          <div key={r.teamId} className="contents">
            <span className="t" title={r.teamName}>
              {r.teamName}
            </span>
            {weeks.map((w) => {
              const c = cell.get(`${r.teamId}|${w}`);
              if (!c) return <span key={w} />;
              const margin = Math.abs(c.my - c.their);
              const tie = c.won === null;
              const cellProps = {
                className: `c ${c.po ? "po" : ""}`,
                style: { background: tie ? "var(--mid)" : shade(c.won!, margin), color: !tie && margin >= 5 ? "#fff" : undefined },
                "data-tt": tt(
                  `Week ${w}${c.po ? " · playoffs" : ""}`,
                  [
                    [r.teamName, c.my],
                    [teams.get(c.opp)!.name, c.their],
                    ["Tied categories", c.tied],
                  ],
                  tie ? "Tied week" : c.won ? `${r.teamName} won${c.po && c.my === c.their ? " on seed" : ""}` : `${teams.get(c.opp)!.name} won${c.po && c.my === c.their ? " on seed" : ""}`,
                ),
              };
              return base ? (
                <Link key={w} href={weekHref(w)} aria-label={`Week ${w}: ${r.teamName} ${tie ? "tied" : c.won ? "beat" : "lost to"} ${teams.get(c.opp)!.name}, ${c.my}-${c.their}`} {...cellProps}>
                  {c.my}
                </Link>
              ) : (
                <span key={w} {...cellProps}>
                  {c.my}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
