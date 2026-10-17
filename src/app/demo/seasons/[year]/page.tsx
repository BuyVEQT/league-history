import Link from "next/link";
import { notFound } from "next/navigation";
import { ManagerLink, PageTitle, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { formatPct, formatRecord } from "@/lib/analytics/format";
import { seasonRecords } from "@/lib/analytics/overview";
import { matchupWinner, seasonOutcome, teamIndex } from "@/lib/analytics/season";
import { provider } from "@/lib/data";
import type { Stage } from "@/lib/types";

const STAGE_LABEL: Record<Stage, string> = {
  regular: "Regular season",
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  final: "Final",
  third_place: "Third-place game",
};

export async function generateStaticParams() {
  const league = await provider.getLeague();
  return league.seasons.map((s) => ({ year: String(s.year) }));
}

export default async function SeasonPage(props: PageProps<"/demo/seasons/[year]">) {
  const { year } = await props.params;
  const league = await provider.getLeague();
  const season = league.seasons.find((s) => String(s.year) === year);
  if (!season) notFound();

  const outcome = seasonOutcome(season);
  const teams = teamIndex(season);
  const records = seasonRecords(season);
  const managerName = (id: string) => league.managers.find((m) => m.id === id)!.name;
  const weeks = Math.max(...season.matchups.filter((m) => m.stage === "regular").map((m) => m.week));
  const champ = outcome.championTeamId ? teams.get(outcome.championTeamId)! : null;
  const runnerUp = outcome.runnerUpTeamId ? teams.get(outcome.runnerUpTeamId)! : null;
  const playoffGames = season.matchups
    .filter((m) => m.stage !== "regular")
    .sort((a, b) => a.week - b.week || a.stage.localeCompare(b.stage));

  return (
    <>
      <PageTitle title={`${season.label} season`} subtitle={`${season.teams.length}-team head-to-head ${season.categories.length}-category league · ${weeks} regular-season weeks`} />

      <nav aria-label="Select season" className="flex flex-wrap gap-2">
        {league.seasons.map((s) => (
          <Link
            key={s.year}
            href={`/demo/seasons/${s.year}`}
            aria-current={s.year === season.year ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${
              s.year === season.year ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Champion" value={champ?.name ?? "—"} detail={champ ? managerName(champ.managerId) : "Not decided"} />
        <StatCard label="Runner-up" value={runnerUp?.name ?? "—"} detail={runnerUp ? managerName(runnerUp.managerId) : undefined} />
        <StatCard label="Teams" value={season.teams.length} detail={`${outcome.playoffTeamIds.size} made the playoffs`} />
        <StatCard
          label="Biggest blowout"
          value={records.biggestBlowout?.score ?? "—"}
          detail={records.biggestBlowout ? `${records.biggestBlowout.winnerName}, wk ${records.biggestBlowout.week}` : undefined}
        />
      </div>

      <Section title="Standings">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">{season.label} regular-season standings and final placement</caption>
            <thead>
              <tr>
                <th className={th}>Reg. rank</th>
                <th className={th}>Team (that season)</th>
                <th className={th}>Manager</th>
                <th className={th}>W-L-T</th>
                <th className={th}>Win %</th>
                <th className={th}>Category W-L-T</th>
                <th className={th}>Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {outcome.standings.map((r) => {
                const final = outcome.finalRank.get(r.teamId)!;
                const inPlayoffs = outcome.playoffTeamIds.has(r.teamId);
                return (
                  <tr key={r.teamId} className={tr}>
                    <td className={td}>{r.rank}</td>
                    <td className={td}>{r.teamName}</td>
                    <td className={td}><ManagerLink id={r.managerId} name={managerName(r.managerId)} /></td>
                    <td className={`${td} tabular-nums`}>{formatRecord(r.wins, r.losses, r.ties)}</td>
                    <td className={`${td} tabular-nums`}>{formatPct(r.winPct)}</td>
                    <td className={`${td} tabular-nums`}>{formatRecord(r.catWins, r.catLosses, r.catTies)}</td>
                    <td className={td}>
                      {final === 1 ? "🏆 Champion" : inPlayoffs ? `${final}${final === 2 ? "nd" : final === 3 ? "rd" : "th"}` : <span className="text-muted">Missed playoffs</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section title="Playoffs">
        {playoffGames.length === 0 ? (
          <p className="text-sm text-muted">No playoff games recorded for this season.</p>
        ) : (
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">{season.label} playoff results</caption>
              <thead>
                <tr>
                  <th className={th}>Round</th>
                  <th className={th}>Matchup</th>
                  <th className={th}>Score (cats)</th>
                  <th className={th}>Winner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {playoffGames.map((m) => {
                  const home = teams.get(m.homeTeamId)!;
                  const away = teams.get(m.awayTeamId)!;
                  const winner = teams.get(matchupWinner(m)!)!;
                  return (
                    <tr key={`${m.stage}-${m.homeTeamId}`} className={tr}>
                      <td className={td}>{STAGE_LABEL[m.stage]}</td>
                      <td className={td}>{home.name} vs {away.name}</td>
                      <td className={`${td} tabular-nums`}>
                        {m.homeCats}-{m.awayCats}{m.tiedCats ? `-${m.tiedCats}` : ""}
                        {m.tiebreakWinnerTeamId && <span className="text-muted"> (seed tiebreak)</span>}
                      </td>
                      <td className={td}>{winner.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Section>
    </>
  );
}
