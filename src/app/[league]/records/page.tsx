import Link from "next/link";
import { notFound } from "next/navigation";
import { rankLabel, signed } from "@/components/draft";
import { Avatar, Card, ManagerLink, PageTitle, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { formatNumber, formatPct, ordinal, winPct } from "@/lib/analytics/format";
import { namesakes, type NamesakeRow } from "@/lib/analytics/players";
import { raceRecords } from "@/lib/analytics/race";
import {
  consistency,
  marginRecords,
  parity,
  playoffRecords,
  seedHistory,
  teamSeasons,
  titleDroughts,
  type TeamSeasonRow,
} from "@/lib/analytics/records";
import { marginAverages, scorelines, sweeps } from "@/lib/analytics/scorelines";
import { longestStreaks, type StreakRow } from "@/lib/analytics/streaks";
import { careerLuck, leagueAlternates, matchupLuck } from "@/lib/analytics/whatIf";
import { colorForManager } from "@/lib/colors";
import { getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";
import { InfoTip } from "@/components/InfoTip";

const SECTIONS = [
  ["playoffs", "Playoffs"],
  ["seeds", "Seeds"],
  ["droughts", "Droughts & clutch"],
  ["streaks", "Streaks"],
  ["race", "Standings race"],
  ["what-if", "What if"],
  ["luck", "Luck"],
  ["scorelines", "Scorelines"],
  ["seasons", "Best & worst"],
  ["consistency", "Consistency & parity"],
  ["namesakes", "Namesakes"],
] as const;

const METHOD_LABEL = { categories: "category record", matchups: "matchup record" } as const;

/** Most recent namesake teams shown before "Show all". */
const NAMESAKES_SHOWN = 10;

export const metadata = { title: "Records" };

export default async function RecordsPage(props: PageProps<"/[league]/records">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const who = (id: string) => (
    <span className="flex items-center gap-2">
      <Avatar size="sm" name={nameOf(id)} color={colorForManager(league, id)} />
      <ManagerLink id={id} name={nameOf(id)} />
    </span>
  );
  const playoffs = playoffRecords(league);
  const droughts = titleDroughts(league);
  const margins = marginRecords(league);
  const seasons = teamSeasons(league);
  const steady = consistency(league);
  const pctLabel = league.seasons.some((s) => s.scoring === "categories") ? "category win %" : "win %";
  const seeds = seedHistory(league);
  const winStreaks = longestStreaks(league, "W", 5);
  const lossStreaks = longestStreaks(league, "L", 5);
  const race = raceRecords(league);
  const alternates = leagueAlternates(league);
  const changed = alternates.filter((a) => a.out.length || a.altTop.teamId !== a.actualTop.teamId);
  const luck = careerLuck(league);
  const luckRows = matchupLuck(league);
  const lines = scorelines(league);
  const sweepRows = sweeps(league);
  const dominant = marginAverages(league)
    .filter((r) => r.wins >= 5)
    .sort((a, b) => b.avgWinMargin! - a.avgWinMargin!)
    .slice(0, 5);
  const parityRows = parity(league);
  const names = namesakes(league);

  return (
    <>
      <PageTitle
        eyebrow="Records"
        title="Clutch, chokes and dynasties"
        subtitle="Playoff over- and under-achievers, streaks, comebacks, luck, the best and worst seasons ever, and more."
      />

      <nav aria-label="Jump to a record" className="jump-bar flex flex-wrap gap-1.5">
        {SECTIONS.filter(([id]) => id !== "namesakes" || names.length > 0).map(([id, label]) => (
          <a key={id} href={`#${id}`} className="pill">
            {label}
          </a>
        ))}
      </nav>

      <Section id="playoffs" title="Playoff performers" tip={TIPS.vsSeed}>
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">Playoff results compared with regular-season seed</caption>
            <thead>
              <tr>
                <th className={th}>Manager</th>
                <th className={th}>Playoffs</th>
                <th className={th}>Avg seed</th>
                <th className={th}>Avg finish</th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    vs seed <InfoTip down text={TIPS.vsSeed} />
                  </span>
                </th>
                <th className={th}>Playoff W-L</th>
                <th className={th}>Finals</th>
                <th className={th}>Titles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {playoffs.map((r) => (
                <tr key={r.managerId} className={tr}>
                  <td className={td}>{who(r.managerId)}</td>
                  <td className={`${td} tabular-nums`}>{r.appearances}</td>
                  <td className={`${td} tabular-nums`}>{formatNumber(r.avgSeed)}</td>
                  <td className={`${td} tabular-nums`}>{formatNumber(r.avgFinish)}</td>
                  <td className={`${td} tabular-nums ${r.avgOverSeed > 0 ? "text-positive" : r.avgOverSeed < 0 ? "text-negative" : ""}`}>
                    {signed(r.avgOverSeed, 1)}
                  </td>
                  <td className={`${td} tabular-nums`}>
                    {r.playoffWins}-{r.playoffLosses}
                  </td>
                  <td className={`${td} tabular-nums`}>{r.finals}</td>
                  <td className={`${td} tabular-nums`}>{r.titles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="text-xs text-muted">
          vs seed = average places gained (+) or lost (−) between regular-season seed and final finish, in seasons they made the playoffs. +1.5 = they
          typically finish a place or two better than seeded; −1.0 = about a place worse.
        </p>
      </Section>

      {seeds.seasons.length > 0 && (
        <Section id="seeds" title="Seeds and upsets">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Top seed won it all"
              value={`${seeds.topSeedTitles} of ${seeds.seasons.length}`}
              detail="seasons the regular-season winner also took the title"
            />
            <StatCard
              label="Higher seed wins"
              tip={TIPS.higherSeed}
              value={formatPct(seeds.bracketGames ? seeds.higherSeedWins / seeds.bracketGames : null, 0)}
              detail={`${seeds.higherSeedWins} of ${seeds.bracketGames} championship-bracket games`}
            />
            <StatCard
              label="Lowest seed to win"
              value={ordinal(Math.max(...seeds.seasons.map((x) => x.championSeed ?? 0)))}
              detail={seeds.seasons
                .filter((x) => x.championSeed === Math.max(...seeds.seasons.map((y) => y.championSeed ?? 0)))
                .map((x) => `${nameOf(x.championManagerId!)}, ${x.label}`)
                .join("; ")}
            />
            <StatCard
              label="Average champion seed"
              tip={TIPS.avgChampSeed}
              value={formatNumber(
                seeds.seasons.reduce((a, x) => a + (x.championSeed ?? 0), 0) / Math.max(1, seeds.seasons.filter((x) => x.championSeed).length),
              )}
            />
          </div>
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Champion&apos;s seed and the top seed&apos;s finish each season</caption>
              <thead>
                <tr>
                  <th className={th}>Season</th>
                  <th className={th}>Champion</th>
                  <th className={th}>Seed</th>
                  <th className={th}>Top seed</th>
                  <th className={th}>Top seed finished</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...seeds.seasons].reverse().map((x) => (
                  <tr key={x.year} className={tr}>
                    <td className={td}>
                      <Link href={`/${slug}/seasons/${x.year}`} className="text-accent hover:underline">
                        {x.label}
                      </Link>
                    </td>
                    <td className={td}>{x.championManagerId ? who(x.championManagerId) : "—"}</td>
                    <td className={`${td} tabular-nums`}>{x.championSeed ?? "—"}</td>
                    <td className={td}>
                      {x.topSeedTeam} <span className="text-muted">· {nameOf(x.topSeedManagerId)}</span>
                    </td>
                    <td className={`${td} tabular-nums ${x.topSeedFinish === 1 ? "text-positive" : ""}`}>{x.topSeedFinish === 1 ? "🏆 Won it" : ordinal(x.topSeedFinish)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <p className="text-xs text-muted">Seed = regular-season rank. The third-place game is left out of the higher-seed count.</p>
        </Section>
      )}

      <div id="droughts" className="grid scroll-mt-32 gap-3 lg:grid-cols-2">
        <Section title="Title droughts">
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Seasons since each manager last won the title</caption>
              <thead>
                <tr>
                  <th className={th}>Manager</th>
                  <th className={th}>Drought</th>
                  <th className={th}>Last title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {droughts.map((r) => (
                  <tr key={r.managerId} className={tr}>
                    <td className={td}>{who(r.managerId)}</td>
                    <td className={`${td} tabular-nums`}>
                      {r.current === 0 ? "Reigning" : `${r.current} season${r.current === 1 ? "" : "s"}`}
                    </td>
                    <td className={td}>{r.lastTitle ?? <span className="text-muted">Never ({r.seasonsPlayed} {r.seasonsPlayed === 1 ? "try" : "tries"})</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Section>

        <Section title="Clutch: one-category games" tip={TIPS.closeGames}>
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Record in matchups decided by one category, and blowouts</caption>
              <thead>
                <tr>
                  <th className={th}>Manager</th>
                  <th className={th}>Close W-L</th>
                  <th className={th}>Close %</th>
                  <th className={th}>Blowouts W-L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {margins.map((r) => (
                  <tr key={r.managerId} className={tr}>
                    <td className={td}>{who(r.managerId)}</td>
                    <td className={`${td} tabular-nums`}>
                      {r.closeWins}-{r.closeLosses}
                    </td>
                    <td className={`${td} tabular-nums`}>{formatPct(winPct(r.closeWins, r.closeLosses, 0), 0)}</td>
                    <td className={`${td} tabular-nums`}>
                      {r.blowoutWins}-{r.blowoutLosses}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <p className="text-xs text-muted">Close = decided by exactly one category (e.g. 5-4). Blowout = won by 7+ categories. Playoffs included.</p>
        </Section>
      </div>

      <div id="streaks" className="grid scroll-mt-32 gap-3 lg:grid-cols-2">
        <Section title="Longest winning streaks">
          <Card className="py-1">
            <StreakList rows={winStreaks} slug={slug} nameOf={nameOf} />
          </Card>
        </Section>
        <Section title="Longest losing streaks">
          <Card className="py-1">
            <StreakList rows={lossStreaks} slug={slug} nameOf={nameOf} />
          </Card>
        </Section>
      </div>
      <p className="-mt-6 text-xs text-muted">Consecutive regular-season matchups won or lost within one season; a tied matchup ends a streak.</p>

      <Section id="race" title="The standings race">
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="py-1">
            <h3 className="pt-2 text-xs font-medium uppercase tracking-wide text-muted">Most weeks in first</h3>
            <ol className="divide-y divide-border">
              {race.frontRunners.slice(0, 5).map((r) => (
                <li key={`${r.year}-${r.managerId}`} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.teamName}</span>
                    <span className="block truncate text-xs text-muted">
                      {nameOf(r.managerId)} · {r.label} · finished {ordinal(r.finalRank)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {r.weeksInFirst}/{r.weeks}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="py-1">
            <h3 className="pt-2 text-xs font-medium uppercase tracking-wide text-muted">Comebacks</h3>
            {race.comebacks.length ? (
              <ol className="divide-y divide-border">
                {race.comebacks.slice(0, 5).map((r) => (
                  <li key={`${r.year}-${r.managerId}`} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.teamName}</span>
                      <span className="block truncate text-xs text-muted">
                        {nameOf(r.managerId)} · {r.label} · {ordinal(r.rank)} after wk {r.week}
                      </span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      {ordinal(r.rank)} → {ordinal(r.finalRank)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-2 text-sm text-muted">No team has come from outside the playoff places after midseason.</p>
            )}
          </Card>
          <Card className="py-1">
            <h3 className="pt-2 text-xs font-medium uppercase tracking-wide text-muted">Collapses and final-week heartbreak</h3>
            <ol className="divide-y divide-border">
              {race.collapses.slice(0, 3).map((r) => (
                <li key={`c-${r.year}-${r.managerId}`} className="py-2 text-sm">
                  <span className="block truncate font-medium">{r.teamName}</span>
                  <span className="block text-xs text-muted">
                    {nameOf(r.managerId)} · {r.label} · {ordinal(r.rank)} after wk {r.week}, missed the playoffs
                  </span>
                </li>
              ))}
              {race.heartbreaks.map((r) => (
                <li key={`h-${r.year}-${r.managerId}`} className="py-2 text-sm">
                  <span className="block truncate font-medium">{r.teamName}</span>
                  <span className="block text-xs text-muted">
                    {nameOf(r.managerId)} · {r.label} · lost a playoff spot in the final week (wk {r.week})
                  </span>
                </li>
              ))}
              {!race.collapses.length && !race.heartbreaks.length && <li className="py-2 text-sm text-muted">None yet.</li>}
            </ol>
          </Card>
        </div>
        <p className="text-xs text-muted">
          Built from the standings after every week. Comeback = made the playoffs after sitting outside a playoff place in the second half of
          the season; collapse = missed them after sitting in the top half of the playoff places. Each season page has the full race chart.
        </p>
      </Section>

      {alternates.length > 0 && (
        <Section id="what-if" title={`What if ${METHOD_LABEL[alternates[0].altMethod]} decided the standings?`}>
          {changed.length === 0 ? (
            <p className="text-sm text-muted">Every season would have had the same first place and the same playoff field.</p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <caption className="sr-only">Seasons whose first place or playoff field would change under the other ranking</caption>
                <thead>
                  <tr>
                    <th className={th}>Season</th>
                    <th className={th}>Would make the playoffs</th>
                    <th className={th}>Would miss</th>
                    <th className={th}>First place</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...changed].reverse().map((a) => (
                    <tr key={a.year} className={tr}>
                      <td className={td}>
                        <Link href={`/${slug}/seasons/${a.year}`} className="text-accent hover:underline">
                          {a.label}
                        </Link>
                      </td>
                      <td className={td}>{a.in.length ? a.in.map((r) => `${r.teamName} (${nameOf(r.managerId)})`).join(", ") : <span className="text-muted">same field</span>}</td>
                      <td className={td}>
                        {a.out.length ? a.out.map((r) => `${r.teamName} (${nameOf(r.managerId)})`).join(", ") : "—"}
                        {a.finalistsOut.length > 0 && <span className="ml-1 text-xs text-accent">reached the final</span>}
                      </td>
                      <td className={td}>
                        {a.altTop.teamId === a.actualTop.teamId ? (
                          <span className="text-muted">unchanged</span>
                        ) : (
                          `${a.altTop.teamName} instead of ${a.actualTop.teamName}`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
          <p className="text-xs text-muted">
            The league ranks standings by {METHOD_LABEL[alternates[0].method]}. This re-ranks the same results by{" "}
            {METHOD_LABEL[alternates[0].altMethod]} and compares the playoff fields. {alternates.length - changed.length} of {alternates.length} seasons
            would not change at all.
          </p>
        </Section>
      )}

      <Section id="luck" title="Matchup luck" tip={TIPS.matchupLuck}>
        <div className="grid gap-3 lg:grid-cols-2">
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Career matchup wins above or below what category results predicted</caption>
              <thead>
                <tr>
                  <th className={th}>Manager</th>
                  <th className={th}>Seasons</th>
                  <th className={th}>
                    <span className="inline-flex items-center gap-1.5">
                      Wins vs expected <InfoTip down end text={TIPS.matchupLuck} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {luck.map((r) => (
                  <tr key={r.managerId} className={tr}>
                    <td className={td}>{who(r.managerId)}</td>
                    <td className={`${td} tabular-nums`}>{r.seasons}</td>
                    <td className={`${td} tabular-nums ${r.luck >= 0.5 ? "text-positive" : r.luck <= -0.5 ? "text-negative" : ""}`}>{signed(r.luck, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <Card className="space-y-4">
            {[
              { title: "Luckiest seasons", rows: luckRows.slice(0, 4) },
              { title: "Unluckiest seasons", rows: [...luckRows].reverse().slice(0, 4) },
            ].map((g) => (
              <div key={g.title}>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{g.title}</h3>
                <ol className="divide-y divide-border">
                  {g.rows.map((r) => (
                    <li key={`${r.year}-${r.managerId}`} className="flex justify-between gap-3 py-1.5 text-sm">
                      <span className="min-w-0 truncate">
                        {r.teamName} <span className="text-muted">· {nameOf(r.managerId)}, {r.label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatNumber(r.actual, 1)} won, {formatNumber(r.expected, 1)} expected
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </Card>
        </div>
        <p className="text-xs text-muted">
          Expected wins treat each category as a coin flip weighted by both teams&apos; season category win % (log5), then count how often that
          wins the majority of categories. Regular season only; ties count half. A big positive number means winning a lot of close matchups
          with an ordinary category record: +2.0 = about two more weekly wins than their categories usually earn. Over a career, it mostly evens out.
        </p>
      </Section>

      <Section id="scorelines" title="Scorelines and sweeps">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">How matchups end</h3>
            <ul className="space-y-1.5">
              {lines.rows.slice(0, 8).map((r) => (
                <li key={r.score} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 tabular-nums">{r.score}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(r.share / (lines.rows[0]?.share || 1)) * 100}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right tabular-nums text-muted">
                    {formatPct(r.share, 0)} · {r.count}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              {lines.matchups.toLocaleString()} matchups, playoffs included. {formatPct(lines.withTiedCategory / Math.max(1, lines.matchups), 0)} had
              at least one tied category (the third number).
            </p>
          </Card>
          <Card className="space-y-4">
            <div>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Clean sweeps ({sweepRows.length})</h3>
              {sweepRows.length ? (
                <ol className="divide-y divide-border">
                  {sweepRows.map((r) => (
                    <li key={`${r.year}-${r.week}-${r.winnerManagerId}`} className="flex justify-between gap-3 py-1.5 text-sm">
                      <span className="min-w-0 truncate">
                        {r.winnerTeam} <span className="text-muted">over {r.loserTeam}</span>
                      </span>
                      <span className="shrink-0 text-muted">
                        {r.score} · {r.label}, wk {r.week}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">Nobody has won every category in a week yet.</p>
              )}
            </div>
            <div>
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Most dominant seasons</h3>
              <ol className="divide-y divide-border">
                {dominant.map((r) => (
                  <li key={`${r.year}-${r.managerId}`} className="flex justify-between gap-3 py-1.5 text-sm">
                    <span className="min-w-0 truncate">
                      {r.teamName} <span className="text-muted">· {nameOf(r.managerId)}, {r.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">won by {formatNumber(r.avgWinMargin, 2)}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-1 text-xs text-muted">Average categories won by in matchups won (5+ wins, playoffs included). {TIPS.winMargin}</p>
            </div>
          </Card>
        </div>
      </Section>

      <div id="seasons" className="grid scroll-mt-32 gap-3 lg:grid-cols-2">
        <Section title="Best regular seasons ever">
          <Card className="py-1">
            <SeasonList rows={seasons.slice(0, 8)} slug={slug} nameOf={nameOf} />
          </Card>
        </Section>
        <Section title="Worst regular seasons ever">
          <Card className="py-1">
            <SeasonList rows={[...seasons].reverse().slice(0, 8)} slug={slug} nameOf={nameOf} />
          </Card>
        </Section>
      </div>
      <p className="-mt-6 text-xs text-muted">Ranked by regular-season {pctLabel}, the number the league&apos;s standings use.</p>

      <div id="consistency" className="grid scroll-mt-32 gap-3 lg:grid-cols-2">
        <Section title="Consistency" tip={TIPS.swing}>
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">How much each manager&apos;s finish varies from year to year</caption>
              <thead>
                <tr>
                  <th className={th}>Manager</th>
                  <th className={th}>Seasons</th>
                  <th className={th}>
                    <span className="inline-flex items-center gap-1.5">
                      Typical finish <InfoTip down text={TIPS.typicalFinish} />
                    </span>
                  </th>
                  <th className={th}>
                    <span className="inline-flex items-center gap-1.5">
                      Swing <InfoTip down end text={TIPS.swing} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {steady.map((r) => (
                  <tr key={r.managerId} className={tr}>
                    <td className={td}>{who(r.managerId)}</td>
                    <td className={`${td} tabular-nums`}>{r.seasons}</td>
                    <td className={`${td} tabular-nums`}>top {formatPct(r.avgPercentile, 0)}</td>
                    <td className={`${td} tabular-nums`}>±{formatPct(r.spread, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <p className="text-xs text-muted">
            Finish as a share of the league (top 0% = always first), so 10- and 12-team seasons compare fairly. Swing = standard
            deviation; steadiest first. Minimum 3 seasons.
          </p>
        </Section>

        <Section title="Parity by season" tip={TIPS.parity}>
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">How even each season was</caption>
              <thead>
                <tr>
                  <th className={th}>Season</th>
                  <th className={th}>
                    <span className="inline-flex items-center gap-1.5">
                      Spread <InfoTip down text={TIPS.parity} />
                    </span>
                  </th>
                  <th className={th}>Best</th>
                  <th className={th}>Worst</th>
                  <th className={th}>
                    <span className="inline-flex items-center gap-1.5">
                      1st to last seed <InfoTip down end text={TIPS.bubbleGap} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...parityRows].reverse().map((r) => {
                  const max = Math.max(...parityRows.map((x) => x.spread));
                  return (
                    <tr key={r.year} className={tr}>
                      <td className={td}>{r.label}</td>
                      <td className={td}>
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
                            <span className="block h-full rounded-full bg-accent" style={{ width: `${(r.spread / max) * 100}%` }} />
                          </span>
                          <span className="tabular-nums">±{formatPct(r.spread)}</span>
                        </span>
                      </td>
                      <td className={`${td} tabular-nums`}>{formatPct(r.best)}</td>
                      <td className={`${td} tabular-nums`}>{formatPct(r.worst)}</td>
                      <td className={`${td} tabular-nums`}>{r.bubbleGap === null ? "—" : `${(r.bubbleGap * 100).toFixed(1)} pts`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
          <p className="text-xs text-muted">
            Spread = standard deviation of every team&apos;s regular-season {pctLabel}: lower means a more even league. The last column is how far the
            last playoff seed finished behind first place.
          </p>
        </Section>
      </div>

      {names.length > 0 && (
        <Section id="namesakes" title="Named after a player">
          <TableWrap>
            <NamesakeTable rows={names.slice(0, NAMESAKES_SHOWN)} nameOf={nameOf} />
          </TableWrap>
          {names.length > NAMESAKES_SHOWN && (
            <details className="text-sm">
              <summary className="cursor-pointer text-accent">Show all {names.length}</summary>
              <div className="mt-3">
                <TableWrap>
                  <NamesakeTable rows={names.slice(NAMESAKES_SHOWN)} nameOf={nameOf} />
                </TableWrap>
              </div>
            </details>
          )}
          <p className="text-xs text-muted">
            {names.filter((r) => r.ownedAtEnd).length} of {names.length} teams still had their namesake when the season ended;{" "}
            {names.filter((r) => r.finalRank === 1).length} won the title. &quot;300+&quot; = outside the top 300 (or not in the league that season).
          </p>
        </Section>
      )}
    </>
  );
}

function StreakList({ rows, slug, nameOf }: { rows: StreakRow[]; slug: string; nameOf: (id: string) => string }) {
  return (
    <ol className="divide-y divide-border">
      {rows.map((r, i) => (
        <li key={`${r.year}-${r.managerId}-${r.fromWeek}`} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="mr-2 text-muted">{i + 1}.</span>
            <span className="font-medium">{r.teamName}</span>
            <span className="block truncate pl-5 text-xs text-muted">
              {nameOf(r.managerId)} ·{" "}
              <Link href={`/${slug}/seasons/${r.year}`} className="hover:text-accent">
                {r.label}
              </Link>{" "}
              · weeks {r.fromWeek}–{r.toWeek}
            </span>
          </span>
          <span className="shrink-0 tabular-nums">{r.length}</span>
        </li>
      ))}
    </ol>
  );
}

function SeasonList({ rows, slug, nameOf }: { rows: TeamSeasonRow[]; slug: string; nameOf: (id: string) => string }) {
  return (
    <ol className="divide-y divide-border">
      {rows.map((r, i) => (
        <li key={`${r.year}-${r.managerId}`} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="mr-2 text-muted">{i + 1}.</span>
            <span className="font-medium">{r.teamName}</span>
            <span className="block truncate pl-5 text-xs text-muted">
              {nameOf(r.managerId)} ·{" "}
              <Link href={`/${slug}/seasons/${r.year}`} className="hover:text-accent">
                {r.label}
              </Link>{" "}
              · finished {r.finalRank}
            </span>
          </span>
          <span className="shrink-0 text-right tabular-nums">
            {formatPct(r.pct)}
            <span className="block text-xs text-muted">{r.record}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function NamesakeTable({ rows, nameOf }: { rows: NamesakeRow[]; nameOf: (id: string) => string }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Teams named after a player, and whether they had him</caption>
      <thead>
        <tr>
          <th className={th}>Team</th>
          <th className={th}>Named after</th>
          <th className={th}>Player finished</th>
          <th className={th}>Drafted him?</th>
          <th className={th}>Kept him?</th>
          <th className={th}>Team finished</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r) => (
          <tr key={`${r.year}-${r.managerId}`} className={tr}>
            <td className={td}>
              <span className="block font-medium">{r.teamName}</span>
              <span className="block text-xs text-muted">
                {nameOf(r.managerId)} · {r.label}
              </span>
            </td>
            <td className={td}>{r.playerName}</td>
            <td className={`${td} tabular-nums`}>{rankLabel(r.actualRank)}</td>
            <td className={td}>
              {r.draftedBy === "them" ? "Yes" : r.draftedBy ? <span className="text-muted">No ({nameOf(r.draftedBy)})</span> : <span className="text-muted">Nobody did</span>}
            </td>
            <td className={td}>{r.ownedAtEnd ? "Yes" : <span className="text-muted">No</span>}</td>
            <td className={`${td} tabular-nums ${r.finalRank === 1 ? "text-positive" : ""}`}>
              {r.finalRank === 1 ? "🏆 Champion" : `${ordinal(r.finalRank)} of ${r.teamCount}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
