import Link from "next/link";
import { notFound } from "next/navigation";
import { Bracket } from "@/components/Bracket";
import { RaceChart } from "@/components/charts/RaceChart";
import { InfoTip } from "@/components/InfoTip";
import { Card, ManagerLink, PageTitle, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { RosterHeat } from "@/components/viz/RosterHeat";
import { WeekGrid } from "@/components/viz/WeekGrid";
import { WhatIfSlope } from "@/components/viz/WhatIfSlope";
import { FormChips, PctBar, SeedArrow } from "@/components/TableCharts";
import { WeekStrip } from "@/components/WeekStrip";
import { formatPct, formatRecord, ordinal, winPct } from "@/lib/analytics/format";
import { seasonRecords } from "@/lib/analytics/overview";
import { PUNT_Z, rosterProfiles } from "@/lib/analytics/players";
import { seasonRace } from "@/lib/analytics/race";
import { rankMethod, seasonOutcome, seasonStandings, teamIndex, type StandingRow } from "@/lib/analytics/season";
import { raceStorylines, replayFrames } from "@/lib/analytics/seasonView";
import { alternateStandings } from "@/lib/analytics/whatIf";
import { seasonWeeks, teamForm } from "@/lib/analytics/weeksView";
import { getLeague } from "@/lib/data";
import { cabocloFinalFor } from "@/lib/data/cabocloFinal";
import { TIPS } from "@/lib/explain";
import { SEASON_TIPS } from "@/lib/explain/seasons";

const METHOD_LABEL = { categories: "category record", matchups: "matchup record" } as const;

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
  const stories = raceStorylines(race);
  const replay = replayFrames(season, race.weeks);
  const managerNames = Object.fromEntries(league.managers.map((m) => [m.id, m.name]));
  // The standings' own win % (category win % in category leagues), for the inline bar.
  const method = rankMethod(season);
  const pctOf = (r: StandingRow) => (method === "categories" ? winPct(r.catWins, r.catLosses, r.catTies) : r.winPct);
  const spots = outcome.playoffTeamIds.size;

  return (
    <>
      <PageTitle
        eyebrow="Season"
        title={season.label}
        subtitle={`${season.teams.length} teams · ${weeks} regular-season weeks · ${spots}-team playoff · ${season.categories.length} categories: ${season.categories.join(", ")}.`}
      />

      {cabocloFinalFor(slug) && season === league.seasons[0] && (
        <Link href={`/${slug}/caboclo-cup`} className="cf-teaser">
          <span className="cf-teaser-k">The final that named the league</span>
          <span className="cf-teaser-v">Both teams shot .469; the title was decided at the fourth decimal by Bruno Caboclo&apos;s last shot.</span>
          <span className="cf-teaser-go">Why it&apos;s the Caboclo Cup →</span>
        </Link>
      )}

      <nav aria-label="Select season" className="flex flex-wrap gap-2">
        {league.seasons.map((s) => (
          <Link key={s.year} href={`/${slug}/seasons/${s.year}`} aria-current={s.year === season.year ? "page" : undefined} className="pill">
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="weekstrip-row">
        <span className="weekstrip-k">Open a week</span>
        <WeekStrip weeks={seasonWeeks(season)} base={`/${slug}`} year={season.year} label={`${season.label} weeks`} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Champion" value={champ?.name ?? "—"} detail={champ ? managerName(champ.managerId) : "Not decided"} tip={SEASON_TIPS.titles} />
        <StatCard label="Runner-up" value={runnerUp?.name ?? "—"} detail={runnerUp ? managerName(runnerUp.managerId) : undefined} />
        <StatCard
          label="Regular-season #1"
          value={outcome.standings[0]?.teamName ?? "—"}
          detail={
            outcome.standings[0]
              ? `${managerName(outcome.standings[0].managerId)} · ${formatRecord(outcome.standings[0].catWins, outcome.standings[0].catLosses, outcome.standings[0].catTies)} in categories`
              : undefined
          }
          tip={TIPS.catPct}
        />
        <StatCard
          label="Biggest blowout"
          value={records.biggestBlowout?.score ?? "—"}
          detail={records.biggestBlowout ? `${records.biggestBlowout.winnerName} over ${records.biggestBlowout.loserName}, week ${records.biggestBlowout.week}` : undefined}
          tip={SEASON_TIPS.blowout}
        />
      </div>

      {race.weeks.length > 0 && (
        <Section title="The standings race" tip={`${SEASON_TIPS.raceStory} Replay: ${SEASON_TIPS.replay}`}>
          <Card className="p-5">
            <RaceChart
              weeks={race.weeks}
              spots={race.spots}
              lines={race.lines.map((l) => ({
                teamId: l.teamId,
                managerId: l.managerId,
                teamName: l.teamName,
                managerName: managerName(l.managerId),
                ranks: l.ranks,
                seed: l.seed,
                finalRank: l.finalRank,
                madePlayoffs: l.madePlayoffs,
                weeksInFirst: l.weeksInFirst,
              }))}
              stories={stories}
              replay={replay}
              managerNames={managerNames}
              weekHref={`/${slug}/seasons/${season.year}/week/`}
            />
          </Card>
        </Section>
      )}

      <Section title="Playoff bracket" id="bracket">
        <Card className="p-5">
          <Bracket season={season} managerName={managerName} />
          <p className="mt-3 text-xs text-muted">Seeds come from the regular-season standings. Ties in a playoff week go to the higher seed.</p>
        </Card>
      </Section>

      {(alt || builds) && (
        <div className={`grid items-start gap-x-4 gap-y-7 ${alt && builds ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]" : ""}`}>
          {alt && (
            <Section title={`What if ${METHOD_LABEL[alt.altMethod]} decided it?`} tip={SEASON_TIPS.whatIf}>
              <Card className="space-y-3 p-5">
                <p className="text-sm text-[color:var(--ink-2)]">
                  Left: the real order, by {METHOD_LABEL[alt.method]}. Right: ranked by {METHOD_LABEL[alt.altMethod]} instead. Lines that cross the playoff line change who gets
                  in: blue would have got in, red would have missed.
                </p>
                <WhatIfSlope
                  actual={outcome.standings}
                  alt={seasonStandings(season, { method: alt.altMethod })}
                  spots={alt.spots}
                  leftLabel={METHOD_LABEL[alt.method]}
                  rightLabel={METHOD_LABEL[alt.altMethod]}
                  managerName={managerName}
                />
                {alt.out.length === 0 && alt.altTop.teamId === alt.actualTop.teamId ? (
                  <p className="text-xs text-muted">Same first place and same playoff field either way.</p>
                ) : (
                  <p className="season-callout">
                    {alt.out.length === 0 ? (
                      "The same playoff field either way."
                    ) : (
                      <>
                        <b>{alt.out.map((r) => r.teamName).join(", ")}</b> would have missed the playoffs; <b>{alt.in.map((r) => r.teamName).join(", ")}</b> would have got in
                        {alt.finalistsOut.length ? ` (${alt.finalistsOut.map(teamName).join(" and ")} went on to reach the final)` : ""}.
                      </>
                    )}
                    {alt.altTop.teamId !== alt.actualTop.teamId ? (
                      <>
                        {" "}
                        First place would have gone to <b>{alt.altTop.teamName}</b>, not {alt.actualTop.teamName}.
                      </>
                    ) : (
                      " Same first place."
                    )}
                  </p>
                )}
              </Card>
            </Section>
          )}
          {builds && (
            <Section title="Roster builds" tip={TIPS.roster}>
              <Card className="space-y-3 p-5">
                <p className="text-sm text-[color:var(--ink-2)]">
                  How each roster stacked up in every category (best {builds.playersPerTeam} players by season rank). Outlined cells look like punts.
                </p>
                <RosterHeat builds={builds} managerName={managerName} />
                <div className="viz-legend">
                  <span>
                    <i style={{ background: "var(--neg)" }} />
                    Weak
                  </span>
                  <span>
                    <i style={{ background: "var(--mid)" }} />
                    Average
                  </span>
                  <span>
                    <i style={{ background: "var(--pos)" }} />
                    Strong
                  </span>
                  <span>
                    <i style={{ boxShadow: "inset 0 0 0 2px var(--foreground)" }} />
                    Likely punt
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Standard scores vs the rest of the league (+ = strong; TO is flipped so fewer turnovers score higher), from each team&apos;s best {builds.playersPerTeam} players
                  on its roster when the season ended and those players&apos; full-season totals. A likely punt is {Math.abs(PUNT_Z)}+ below the league and {Math.abs(PUNT_Z)}+
                  below the team&apos;s own average. Rosters change during a season, so treat this as a sketch of each build, not what the team actually played.
                </p>
              </Card>
            </Section>
          )}
        </div>
      )}

      <Section title="Every week, every team" tip={SEASON_TIPS.weekGrid}>
        <Card className="space-y-3 p-5">
          <WeekGrid season={season} standings={outcome.standings} base={`/${slug}`} />
          <div className="viz-legend">
            <span>
              <i style={{ background: "var(--pos)" }} />
              Won the week
            </span>
            <span>
              <i style={{ background: "var(--neg)" }} />
              Lost
            </span>
            <span>
              <i style={{ background: "var(--mid)" }} />
              Tied
            </span>
            <span>
              <i style={{ boxShadow: "inset 0 0 0 1.5px var(--gold)" }} />
              Playoffs (P)
            </span>
            <span>Number = categories won · darker = bigger margin · hover for the score</span>
          </div>
        </Card>
      </Section>

      <Section
        title="Final standings"
        tip="Seed = where the team finished the regular season, which sets its playoff seed. Final = where it ended up after the playoffs. Category W-L-T counts every single category won, lost and tied, not just weekly wins."
      >
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">{season.label} regular-season standings and final placement</caption>
            <thead>
              <tr>
                <th className={th}>Seed</th>
                <th className={th}>Team (that season)</th>
                <th className={th}>Manager</th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    {method === "categories" ? "Category win %" : "Win %"} <InfoTip down text={method === "categories" ? TIPS.catPct : TIPS.winPct} />
                  </span>
                </th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    Category W-L-T <InfoTip down text={TIPS.catRecord} />
                  </span>
                </th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    Matchups <InfoTip down end text={TIPS.winPct} />
                  </span>
                </th>
                <th className={th}>Last 5 weeks</th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    Seed → final <InfoTip down end text={TIPS.vsSeed} />
                  </span>
                </th>
                {season.activity && (
                  <th className={th}>
                    <span className="inline-flex items-center gap-1.5">
                      Moves <InfoTip down end text="The source's season count of adds and drops for each team." />
                    </span>
                  </th>
                )}
                <th className={th}>Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {outcome.standings.map((r) => {
                const final = outcome.finalRank.get(r.teamId)!;
                const inPlayoffs = outcome.playoffTeamIds.has(r.teamId);
                const p = pctOf(r);
                return (
                  <tr key={r.teamId} data-m={r.managerId} className={`${tr} ${r.rank === spots && spots < outcome.standings.length ? "cutline" : ""}`}>
                    <td className={`${td} text-muted`}>{r.rank}</td>
                    <td className={`${td} font-semibold`}>{r.teamName}</td>
                    <td className={td}>
                      <ManagerLink id={r.managerId} name={managerName(r.managerId)} />
                    </td>
                    <td className={td}>
                      <PctBar p={p} />
                    </td>
                    <td className={`${td} tabular-nums`}>{formatRecord(r.catWins, r.catLosses, r.catTies)}</td>
                    <td className={`${td} tabular-nums`}>
                      {formatRecord(r.wins, r.losses, r.ties)} <span className="text-muted">({formatPct(r.winPct)})</span>
                    </td>
                    <td className={td}>
                      <FormChips games={teamForm(season, r.teamId)} base={`/${slug}`} year={season.year} />
                    </td>
                    <td className={td}>{inPlayoffs ? <SeedArrow seed={r.rank} final={final} title={r.teamName} /> : <span className="text-xs text-muted">missed</span>}</td>
                    {season.activity && <td className={td}>{season.activity[r.teamId]?.moves ?? "—"}</td>}
                    <td className={td}>
                      {final === 1 ? (
                        <span className="badge badge-gold">🏆 Champion</span>
                      ) : inPlayoffs ? (
                        <span className="badge">{ordinal(final)}</span>
                      ) : (
                        <span className="text-muted">{ordinal(final)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Section>
    </>
  );
}
