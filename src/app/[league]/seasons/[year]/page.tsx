import Link from "next/link";
import { notFound } from "next/navigation";
import { Bracket } from "@/components/Bracket";
import { RaceChart } from "@/components/charts/RaceChart";
import { Card, ManagerLink, PageTitle, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { formatPct, formatRecord, ordinal } from "@/lib/analytics/format";
import { seasonRecords } from "@/lib/analytics/overview";
import { PUNT_Z, rosterProfiles } from "@/lib/analytics/players";
import { seasonRace } from "@/lib/analytics/race";
import { seasonOutcome, teamIndex } from "@/lib/analytics/season";
import { alternateStandings } from "@/lib/analytics/whatIf";
import { colorForManager } from "@/lib/colors";
import { getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";
import { InfoTip } from "@/components/InfoTip";

const METHOD_LABEL = { categories: "category record", matchups: "matchup record" } as const;

/** "+1.2", "−0.4", and "0.0" rather than "-0.0". */
const zLabel = (z: number) => {
  const r = Math.round(z * 10) / 10;
  return r === 0 ? "0.0" : `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(1)}`;
};

/** Heat-table tint for a category standard score (positive = strong). */
function zTone(z: number): string {
  if (z >= 1.5) return "bg-positive/30";
  if (z >= 0.5) return "bg-positive/12";
  if (z <= PUNT_Z) return "bg-negative/30";
  if (z <= -0.5) return "bg-negative/12";
  return "";
}


export async function generateStaticParams({ params }: { params: { league: string } }) {
  const league = await getLeague(params.league);
  if (!league) return [];
  return league.seasons.map((s) => ({ year: String(s.year) }));
}

export default async function SeasonPage(props: PageProps<"/[league]/seasons/[year]">) {
  const { league: slug, year } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const season = league.seasons.find((s) => String(s.year) === year);
  if (!season) notFound();

  const outcome = seasonOutcome(season);
  const teams = teamIndex(season);
  const records = seasonRecords(season);
  const managerName = (id: string) => league.managers.find((m) => m.id === id)!.name;
  // Count weeks actually played; some seasons skip a week number (2018-19 has no week 19).
  const weeks = new Set(season.matchups.filter((m) => m.stage === "regular").map((m) => m.week)).size;
  const champ = outcome.championTeamId ? teams.get(outcome.championTeamId)! : null;
  const runnerUp = outcome.runnerUpTeamId ? teams.get(outcome.runnerUpTeamId)! : null;
  const race = seasonRace(season);
  const alt = alternateStandings(season);
  const builds = rosterProfiles(season);
  const teamName = (id: string) => teams.get(id)!.name;
  const leader = [...race.lines].sort((a, b) => b.weeksInFirst - a.weeksInFirst)[0];
  const storylines: string[] = [];
  if (leader?.weeksInFirst) {
    storylines.push(
      `${leader.teamName} spent ${leader.weeksInFirst} of ${race.weeks.length} weeks in first${leader.weeksInFirst === race.weeks.length ? " (wire to wire)" : ""} and finished ${ordinal(leader.finalRank)}.`,
    );
  }
  for (const c of race.comebacks) {
    storylines.push(`${c.teamName} was ${ordinal(c.rank)} after week ${c.week}, then climbed to the ${ordinal(c.seed)} seed and finished ${ordinal(c.finalRank)}.`);
  }
  for (const c of race.collapses) {
    storylines.push(`${c.teamName} was ${ordinal(c.rank)} after week ${c.week} and missed the playoffs (${ordinal(c.seed)}).`);
  }
  if (race.lastWeekOut.length) {
    storylines.push(
      `Final-week heartbreak: ${race.lastWeekOut.map(teamName).join(" and ")} dropped out of a playoff spot on the last week; ${race.lastWeekIn.map(teamName).join(" and ")} took ${race.lastWeekIn.length === 1 ? "it" : "them"}.`,
    );
  }

  return (
    <>
      <PageTitle
        eyebrow="Season"
        title={season.label}
        subtitle={`${season.teams.length} teams · ${weeks} regular-season weeks · ${outcome.playoffTeamIds.size}-team playoff · ${season.categories.length} categories: ${season.categories.join(", ")}.`}
      />

      <nav aria-label="Select season" className="flex flex-wrap gap-2">
        {league.seasons.map((s) => (
          <Link
            key={s.year}
            href={`/${slug}/seasons/${s.year}`}
            aria-current={s.year === season.year ? "page" : undefined}
            className="pill"
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Champion" value={champ?.name ?? "—"} detail={champ ? managerName(champ.managerId) : "Not decided"} />
        <StatCard label="Runner-up" value={runnerUp?.name ?? "—"} detail={runnerUp ? managerName(runnerUp.managerId) : undefined} />
        <StatCard
          label="Regular-season #1"
          value={outcome.standings[0]?.teamName ?? "—"}
          detail={outcome.standings[0] ? `${managerName(outcome.standings[0].managerId)} · ${formatRecord(outcome.standings[0].catWins, outcome.standings[0].catLosses, outcome.standings[0].catTies)} in categories` : undefined}
        />
        <StatCard
          label="Biggest blowout"
          value={records.biggestBlowout?.score ?? "—"}
          detail={records.biggestBlowout ? `${records.biggestBlowout.winnerName} over ${records.biggestBlowout.loserName}, week ${records.biggestBlowout.week}` : undefined}
        />
      </div>

      <Section
        title="Standings"
        tip="Reg. rank = where the team finished the regular season, which sets its playoff seed. Final = where it ended up after the playoffs. Category W-L-T counts every single category won, lost and tied, not just weekly wins."
      >
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
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    Category W-L-T <InfoTip down end text={TIPS.catRecord} />
                  </span>
                </th>
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

      <Section
        title="Standings race"
        tip="Where every team sat in the standings after each week of the regular season. Below the playoff line = outside the playoff places at that point. Pick teams to compare their paths; 1st is at the top."
      >
        <Card className="p-5">
          <RaceChart
            weeks={race.weeks}
            spots={race.spots}
            series={race.lines.map((l) => ({
              teamId: l.teamId,
              teamName: l.teamName,
              managerName: managerName(l.managerId),
              color: colorForManager(league, l.managerId),
              ranks: l.ranks,
            }))}
            initialSelected={[...new Set([champ?.id, runnerUp?.id, outcome.standings[0]?.teamId].filter((x): x is string => !!x))]}
          />
        </Card>
        {storylines.length > 0 && (
          <div className="grid gap-2 md:grid-cols-2">
            {storylines.map((line) => (
              <p key={line} className="rounded-[10px] border border-border border-l-4 border-l-accent bg-surface px-3 py-2.5 text-sm">
                {line}
              </p>
            ))}
          </div>
        )}
        {alt && (
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">If {METHOD_LABEL[alt.altMethod]} decided the standings</span> instead of{" "}
            {METHOD_LABEL[alt.method]}:{" "}
            {alt.out.length === 0
              ? "the same playoff field."
              : `${alt.in.map((r) => r.teamName).join(", ")} would have made the playoffs instead of ${alt.out.map((r) => r.teamName).join(", ")}${
                  alt.finalistsOut.length ? ` (${alt.finalistsOut.map(teamName).join(" and ")} went on to reach the final)` : ""
                }.`}
            {alt.altTop.teamId !== alt.actualTop.teamId && ` First place would have gone to ${alt.altTop.teamName}, not ${alt.actualTop.teamName}.`}
          </p>
        )}
      </Section>

      <Section title="Playoff bracket">
        <Card className="p-5">
          <Bracket season={season} managerName={managerName} />
          <p className="mt-3 text-xs text-muted">Seeds come from the regular-season standings. Ties in a playoff week go to the higher seed.</p>
        </Card>
      </Section>

      {builds && (
        <Section title="Roster builds (approximate)" tip={TIPS.roster}>
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Each team&apos;s season-end roster, category by category, compared with the league</caption>
              <thead>
                <tr>
                  <th className={th}>Team</th>
                  {builds.categories.map((c) => (
                    <th key={c} className={`${th} text-center`}>
                      {c}
                    </th>
                  ))}
                  <th className={th}>Likely punts</th>
                  <th className={th}>Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {builds.rows.map((r) => (
                  <tr key={r.teamId} className={tr}>
                    <td className={td}>
                      {r.teamName} <span className="text-muted">· {managerName(r.managerId)}</span>
                    </td>
                    {builds.categories.map((c) => (
                      <td key={c} className={`${td} text-center tabular-nums ${zTone(r.z[c])} ${r.punts.includes(c) ? "font-semibold" : ""}`}>
                        {zLabel(r.z[c])}
                      </td>
                    ))}
                    <td className={td}>{r.punts.length ? r.punts.join(", ") : <span className="text-muted">—</span>}</td>
                    <td className={`${td} tabular-nums`}>{r.finalRank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <p className="text-xs text-muted">
            Standard scores vs the rest of the league (+ = strong; TO is flipped so fewer turnovers score higher), from each team&apos;s best{" "}
            {builds.playersPerTeam} players on its roster when the season ended and those players&apos; full-season totals. A likely punt is{" "}
            {Math.abs(PUNT_Z)}+ below the league and {Math.abs(PUNT_Z)}+ below the team&apos;s own average. Rosters change during a season, so treat
            this as a sketch of each build, not what the team actually played.
          </p>
        </Section>
      )}
    </>
  );
}
