import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CountUp } from "@/components/CountUp";
import { signed } from "@/components/draft";
import { InfoTip } from "@/components/InfoTip";
import { NamesakeCards } from "@/components/NamesakeCards";
import { RecordsGroup, RecordsPanel } from "@/components/RecordsPanel";
import { ShowMore } from "@/components/ShowMore";
import { Avatar, ManagerLink, PageTitle, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { CoinFlip } from "@/components/viz/CoinFlip";
import { DroughtStrip } from "@/components/viz/DroughtStrip";
import { FrontRunners } from "@/components/viz/FrontRunners";
import { LuckCareerBars, LuckScatter } from "@/components/viz/LuckScatter";
import { ParityRanges } from "@/components/viz/ParityRanges";
import { PlayoffRisers } from "@/components/viz/PlayoffRisers";
import { ScorelineHistogram } from "@/components/viz/ScorelineHistogram";
import { SeedStrip } from "@/components/viz/SeedStrip";
import { SteadyScatter } from "@/components/viz/SteadyScatter";
import { StreakBars } from "@/components/viz/StreakBars";
import { WhatIfCards } from "@/components/WhatIfCards";
import { careerStats, managerSeasons } from "@/lib/analytics/career";
import { formatNumber, formatPct, ordinal } from "@/lib/analytics/format";
import { namesakes } from "@/lib/analytics/players";
import { raceRecords, type RaceRecord } from "@/lib/analytics/race";
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
import { biggestRiser, changedAlternates, iceInTheVeins, regularWeeks, seedStrip, seedTiles } from "@/lib/analytics/recordsView";
import { marginAverages, scorelines, sweeps } from "@/lib/analytics/scorelines";
import { longestStreaks } from "@/lib/analytics/streaks";
import { careerLuck, leagueAlternates, matchupLuck } from "@/lib/analytics/whatIf";
import { getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";
import { RECORD_TIPS } from "@/lib/explain/records";

const GROUPS = [
  ["g-playoffs", "Playoffs"],
  ["g-streaks", "Streaks & the race"],
  ["g-luck", "Luck & what-ifs"],
  ["g-scores", "Scorelines"],
  ["g-seasons", "Best & worst"],
  ["g-fun", "Named after a player"],
] as const;

const METHOD_LABEL = { categories: "category win %", matchups: "weeks won" } as const;

export const metadata = { title: "Records" };

export default async function RecordsPage(props: PageProps<"/[league]/records">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const names = Object.fromEntries(league.managers.map((m) => [m.id, m.name]));
  const nameOf = (id: string) => names[id] ?? id;
  const who = (id: string) => (
    <span className="flex items-center gap-2">
      <Avatar size="sm" name={nameOf(id)} />
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
  const strip = seedStrip(league, seeds);
  const seedSum = seedTiles(seeds);
  const winStreaks = longestStreaks(league, "W", 8);
  const lossStreaks = longestStreaks(league, "L", 8);
  const lastWeek = regularWeeks(league);
  const race = raceRecords(league);
  const alternates = leagueAlternates(league);
  const changed = changedAlternates(alternates);
  const luck = careerLuck(league);
  const luckRows = matchupLuck(league);
  const lines = scorelines(league);
  const sweepRows = sweeps(league);
  const dominant = marginAverages(league)
    .filter((r) => r.wins >= 5)
    .sort((a, b) => b.avgWinMargin! - a.avgWinMargin!)
    .slice(0, 5);
  const parityRows = parity(league);
  const names_ = namesakes(league);
  const titles = Object.fromEntries(careerStats(league).map((c) => [c.managerId, c.titles]));
  const finishes = Object.fromEntries(
    league.managers.map((m) => [
      m.id,
      Object.fromEntries(managerSeasons(league, m.id).map((s) => [s.year, { final: s.finalRank, teams: s.teamCount, teamName: s.teamName }])),
    ]),
  );
  const best = seasons[0];
  const riser = biggestRiser(playoffs);
  const ice = iceInTheVeins(margins);
  const topStreak = winStreaks[0];
  const groups = GROUPS.filter(([id]) => id !== "g-fun" || names_.length > 0);

  return (
    <>
      <PageTitle
        eyebrow="Record book"
        title="Clutch, chokes & dynasties"
        subtitle="Who rises in the playoffs, who's still waiting on a ring, who gets lucky, and the streaks people still talk about."
      />

      <nav aria-label="Jump to a record" className="jump-bar rec-jump flex flex-wrap gap-1.5">
        {groups.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="pill">
            {label}
          </a>
        ))}
      </nav>

      <div className="rec-tiles">
        {best && (
          <RecordCard label="Best regular season" tip={TIPS.catPct} value={<CountUp value={best.pct * 100} decimals={1} suffix="%" />}>
            <b>{best.teamName}</b> · {nameOf(best.managerId)}, {best.label} · {best.record} · finished {ordinal(best.finalRank)}
          </RecordCard>
        )}
        {topStreak && (
          <RecordCard
            label="Longest win streak"
            tip={RECORD_TIPS.streak}
            value={
              <>
                <CountUp value={topStreak.length} />
                <small>straight</small>
              </>
            }
          >
            {who(topStreak.managerId)}
            <span className="mt-0.5 block">
              {topStreak.teamName}, {topStreak.label}
            </span>
          </RecordCard>
        )}
        {riser && (
          <RecordCard
            label="Biggest playoff riser"
            tip={TIPS.vsSeed}
            value={
              <>
                <CountUp value={riser.avgOverSeed} decimals={1} prefix={riser.avgOverSeed > 0 ? "+" : ""} />
                <small>spots</small>
              </>
            }
          >
            {who(riser.managerId)}
            <span className="mt-0.5 block">{riser.appearances} playoff trips (3+ to qualify)</span>
          </RecordCard>
        )}
        {ice && (
          <RecordCard label="Ice in the veins" tip={TIPS.closeGames} value={<CountUp value={ice.pct * 100} suffix="%" />}>
            {who(ice.row.managerId)}
            <span className="mt-0.5 block">
              {ice.row.closeWins}-{ice.row.closeLosses} in one-category weeks (20+ to qualify)
            </span>
          </RecordCard>
        )}
      </div>

      {/* ---------------- Playoffs ---------------- */}
      <RecordsGroup id="g-playoffs">Playoffs</RecordsGroup>

      {strip.length > 0 && (
        <RecordsPanel
          id="seeds"
          title="Seeds & upsets"
          tip={RECORD_TIPS.seeds}
          sub="Where every champion came from. Each column is a season's playoff field; gold is the eventual champion."
        >
          <div className="rec-tiles mb-4">
            <StatCard
              label="Top seed won it all"
              value={
                <>
                  <CountUp value={seeds.topSeedTitles} />
                  <small className="rec-of"> of {seedSum.decided}</small>
                </>
              }
              detail="seasons the #1 seed took the title"
            />
            <StatCard
              label="Higher seed wins"
              tip={TIPS.higherSeed}
              value={seeds.bracketGames ? <CountUp value={(seeds.higherSeedWins / seeds.bracketGames) * 100} suffix="%" /> : "—"}
              detail={`${seeds.higherSeedWins} of ${seeds.bracketGames} bracket games`}
            />
            <StatCard
              label="Lowest seed to win"
              value={seedSum.lowestSeed ? <CountUp value={seedSum.lowestSeed} prefix="#" /> : "—"}
              detail={seedSum.lowest.map((x) => `${nameOf(x.championManagerId!)}, ${x.label}`).join("; ")}
            />
            <StatCard
              label="Average champion seed"
              tip={TIPS.avgChampSeed}
              value={seedSum.avgChampionSeed === null ? "—" : <CountUp value={seedSum.avgChampionSeed} decimals={1} />}
              detail="lower = favourites win"
            />
          </div>
          <SeedStrip rows={strip} names={names} />
          <details className="mt-3">
            <summary className="text-sm text-accent">Every season as a table</summary>
            <div className="mt-2">
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
                        <td className={`${td} tabular-nums ${x.topSeedFinish === 1 ? "text-positive" : ""}`}>
                          {x.topSeedFinish === 1 ? "🏆 Won it" : ordinal(x.topSeedFinish)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          </details>
        </RecordsPanel>
      )}

      <RecordsPanel
        id="playoffs"
        title="Playoff risers & fallers"
        tip={TIPS.vsSeed}
        sub="Arrow runs from average playoff seed to average final finish. Pointing left = finishes better than seeded."
      >
        <PlayoffRisers rows={playoffs} names={names} />
        <div className="viz-legend mt-2">
          <span>
            <i className="dot" style={{ boxShadow: "inset 0 0 0 1.5px var(--ink-2)" }} />
            Average playoff seed
          </span>
          <span>
            <i className="line" style={{ background: "var(--pos)" }} />
            Beats their seed
          </span>
          <span>
            <i className="line" style={{ background: "var(--neg)" }} />
            Falls below their seed
          </span>
        </div>
        <details className="mt-3">
          <summary className="text-sm text-accent">The full table</summary>
          <div className="mt-2">
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
                      <td className={`${td} tabular-nums ${r.avgOverSeed > 0 ? "text-positive" : r.avgOverSeed < 0 ? "text-negative" : ""}`}>{signed(r.avgOverSeed, 1)}</td>
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
          </div>
        </details>
      </RecordsPanel>

      <div className="rec-g2">
        <RecordsPanel id="droughts" title="Title droughts" tip={RECORD_TIPS.drought} sub="Seasons since their last championship. Gold = a title year.">
          <DroughtStrip rows={droughts} seasons={league.seasons} finishes={finishes} nameOf={nameOf} />
          <div className="viz-legend mt-3">
            <span>
              <i style={{ background: "var(--gold)" }} />
              Title
            </span>
            <span>
              <i style={{ background: "var(--neg-wash)" }} />
              Since the last title
            </span>
            <span>
              <i style={{ border: "1px dashed var(--border-2)" }} />
              Not in the league
            </span>
          </div>
        </RecordsPanel>
        <RecordsPanel title="Coin-flip weeks" tip={`${TIPS.closeGames} ${RECORD_TIPS.blowout}`} sub="Record in weeks decided by one category, and in 7+ category blowouts. Best net record first.">
          <CoinFlip rows={margins} names={names} />
        </RecordsPanel>
      </div>

      {/* ---------------- Streaks & the race ---------------- */}
      <RecordsGroup id="g-streaks">Streaks &amp; the standings race</RecordsGroup>

      <RecordsPanel id="streaks" title="Longest streaks" tip={RECORD_TIPS.streak} sub="Within one regular season. Bars show where the run fell in the season.">
        <div className="rec-g2">
          <div>
            <h4 className="rec-sub">Winning</h4>
            <StreakBars rows={winStreaks} names={names} lastWeek={lastWeek} kind="W" />
          </div>
          <div>
            <h4 className="rec-sub">Losing</h4>
            <StreakBars rows={lossStreaks} names={names} lastWeek={lastWeek} kind="L" />
          </div>
        </div>
      </RecordsPanel>

      <div className="rec-g2" id="race">
        <RecordsPanel title="Front-runners" tip={RECORD_TIPS.frontRunner} sub="Most of a season spent in first place.">
          {race.frontRunners.length ? (
            <>
              <FrontRunners rows={race.frontRunners.slice(0, 8)} names={names} />
              <div className="viz-legend mt-2">
                <span>
                  <i style={{ background: "var(--gold)" }} />
                  Went on to win the title
                </span>
                <span>
                  <i style={{ background: "var(--s1)" }} />
                  Didn&apos;t
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No standings history yet.</p>
          )}
        </RecordsPanel>
        <RecordsPanel title="Comebacks & collapses" tip={RECORD_TIPS.raceStory} sub="Where they stood after midseason, and where they ended up.">
          {race.comebacks.length + race.collapses.length + race.heartbreaks.length ? (
            <ShowMore initial={8} className="rec-list rec-race" noun="stories">
              {[
                ...race.comebacks.slice(0, 5).map((r) => <RaceRow key={`c-${r.year}-${r.managerId}`} r={r} kind="Comeback" nameOf={nameOf} />),
                ...race.collapses.map((r) => <RaceRow key={`x-${r.year}-${r.managerId}`} r={r} kind="Collapse" nameOf={nameOf} />),
                ...race.heartbreaks.map((r) => <RaceRow key={`h-${r.year}-${r.managerId}`} r={r} kind="Final-week heartbreak" nameOf={nameOf} />),
              ]}
            </ShowMore>
          ) : (
            <p className="text-sm text-muted">No comebacks or collapses yet.</p>
          )}
        </RecordsPanel>
      </div>

      {/* ---------------- Luck & what-ifs ---------------- */}
      <RecordsGroup id="g-luck">Luck &amp; what-ifs</RecordsGroup>

      <RecordsPanel
        id="luck"
        title="Matchup luck"
        tip={TIPS.matchupLuck}
        sub="Every team-season: weeks it should have won from its category totals (across) against weeks it actually won (up). Above the line = lucky."
      >
        <div className="rec-luck">
          <div>
            <LuckScatter rows={luckRows} names={names} />
          </div>
          <div>
            <h4 className="rec-sub">
              Career luck <InfoTip down end text={TIPS.matchupLuck} />
            </h4>
            <LuckCareerBars rows={luck} names={names} />
          </div>
        </div>
        <details className="mt-3">
          <summary className="text-sm text-accent">The luckiest and unluckiest seasons</summary>
          <div className="rec-g2 mt-2">
            {[
              { title: "Luckiest seasons", rows: luckRows.slice(0, 5) },
              { title: "Unluckiest seasons", rows: [...luckRows].reverse().slice(0, 5) },
            ].map((g) => (
              <div key={g.title}>
                <h4 className="rec-sub">{g.title}</h4>
                <div className="rec-list">
                  {g.rows.map((r) => (
                    <div key={`${r.year}-${r.managerId}`}>
                      <div className="l">
                        <span className="t1">{r.teamName}</span>
                        <span className="t2">
                          {nameOf(r.managerId)} · {r.label}
                        </span>
                      </div>
                      <div className="rv">
                        <b className={r.luck >= 0 ? "text-[color:var(--pos)]" : "text-[color:var(--neg)]"}>{signed(r.luck, 1)}</b>
                        <span className="t2 block">
                          {formatNumber(r.actual, 1)} won, {formatNumber(r.expected, 1)} expected
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </RecordsPanel>

      {alternates.length > 0 && (
        <RecordsPanel
          id="what-if"
          title={`What if ${METHOD_LABEL[alternates[0].altMethod]} decided the standings?`}
          tip={RECORD_TIPS.whatIf}
          sub={`Seasons where ranking by ${METHOD_LABEL[alternates[0].altMethod]} instead of ${METHOD_LABEL[alternates[0].method]} would have changed the playoff field or first place. ${alternates.length - changed.length} of ${alternates.length} seasons would not change at all.`}
        >
          {changed.length ? (
            <WhatIfCards rows={changed} slug={slug} names={names} />
          ) : (
            <p className="text-sm text-muted">Every season would have had the same first place and the same playoff field.</p>
          )}
        </RecordsPanel>
      )}

      {/* ---------------- Scorelines ---------------- */}
      <RecordsGroup id="g-scores">Scorelines &amp; sweeps</RecordsGroup>

      <div className="rec-scores" id="scorelines">
        <RecordsPanel
          title="How matchups end"
          tip={RECORD_TIPS.scorelines}
          sub={`${lines.matchups.toLocaleString()} matchups, playoffs included. ${formatPct(lines.withTiedCategory / Math.max(1, lines.matchups), 0)} had at least one tied category.`}
        >
          <ScorelineHistogram rows={lines.rows} />
          <div className="viz-legend mt-2">
            <span>
              <i style={{ background: "var(--accent)" }} />
              Decided by one category (or level)
            </span>
            <span>
              <i style={{ background: "var(--s1)" }} />
              2-6 categories
            </span>
            <span>
              <i style={{ background: "var(--foreground)" }} />
              Blowout (7+)
            </span>
            <span>
              <i style={{ background: "var(--gold)" }} />
              Sweep
            </span>
          </div>
          {dominant.length > 0 && (
            <>
              <h4 className="rec-sub mt-5">
                Most dominant seasons <InfoTip down text={`${TIPS.winMargin} Teams with 5+ wins, playoffs included.`} />
              </h4>
              <div className="rec-list">
                {dominant.map((r, i) => (
                  <div key={`${r.year}-${r.managerId}`}>
                    <span className="rk">{i + 1}</span>
                    <div className="l">
                      <span className="t1">{r.teamName}</span>
                      <span className="t2">
                        {nameOf(r.managerId)} · {r.label} · {r.wins}-{r.losses}
                      </span>
                    </div>
                    <div className="rv">
                      <b>+{formatNumber(r.avgWinMargin, 2)}</b>
                      <span className="t2 block">cats per win</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </RecordsPanel>
        <RecordsPanel title={`Clean sweeps (${sweepRows.length})`} tip={RECORD_TIPS.sweep} sub="Every week one team won every category.">
          {sweepRows.length ? (
            <ShowMore initial={10} className="rec-list" noun="sweeps">
              {sweepRows.map((r) => (
                <div key={`${r.year}-${r.week}-${r.winnerManagerId}`}>
                  <div className="l">
                    <span className="t1">
                      {r.winnerTeam} <span className="font-normal text-muted">over</span> {r.loserTeam}
                    </span>
                    <span className="t2">
                      {nameOf(r.winnerManagerId)} ·{" "}
                      <Link href={`/${slug}/seasons/${r.year}`} className="hover:text-accent">
                        {r.label}
                      </Link>
                      , {r.stage === "regular" ? `week ${r.week}` : "playoffs"}
                    </span>
                  </div>
                  <div className="rv">
                    <b>{r.score}</b>
                  </div>
                </div>
              ))}
            </ShowMore>
          ) : (
            <p className="text-sm text-muted">Nobody has won every category in a week yet.</p>
          )}
        </RecordsPanel>
      </div>

      {/* ---------------- Best & worst ---------------- */}
      <RecordsGroup id="g-seasons">Best &amp; worst seasons</RecordsGroup>

      <div className="rec-g2" id="seasons">
        <RecordsPanel title="Best regular seasons ever" tip={TIPS.catPct} sub={`Ranked by ${pctLabel}, the number the standings use.`}>
          <SeasonList rows={seasons.slice(0, 8)} slug={slug} nameOf={nameOf} />
        </RecordsPanel>
        <RecordsPanel title="Worst regular seasons ever" tip={TIPS.catPct} sub="Somebody had to.">
          <SeasonList rows={[...seasons].reverse().slice(0, 8)} slug={slug} nameOf={nameOf} />
        </RecordsPanel>
      </div>

      <div className="rec-g2" id="consistency">
        <RecordsPanel title="Steady or streaky?" tip={TIPS.swing} sub="Typical finish (across) against how much it swings year to year (up). Bottom-left = always good. Minimum 3 seasons.">
          {steady.length ? (
            <>
              <SteadyScatter rows={steady} titles={titles} names={names} />
              <div className="viz-legend mt-2">
                <span>
                  <i className="dot" style={{ background: "var(--gold)" }} />
                  Has won a title
                </span>
                <span>
                  <i className="dot" style={{ background: "var(--s1)" }} />
                  Hasn&apos;t
                </span>
              </div>
              <details className="mt-3">
                <summary className="text-sm text-accent">The table</summary>
                <div className="mt-2">
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
                </div>
              </details>
            </>
          ) : (
            <p className="text-sm text-muted">Nobody has played 3 seasons yet.</p>
          )}
        </RecordsPanel>

        <RecordsPanel
          title="Parity by season"
          tip={TIPS.parity}
          sub={`Each bar runs from the worst to the best ${pctLabel} that season. The orange tick is the last playoff seed; the most even season is in blue.`}
        >
          <ParityRanges rows={parityRows} />
          <div className="viz-legend mt-2">
            <span>
              <i className="line" style={{ background: "var(--border-2)", height: 6 }} />
              Worst to best
            </span>
            <span>
              <i style={{ background: "var(--accent)", width: 3, height: 12, borderRadius: 1 }} />
              Last playoff seed <InfoTip down end text={TIPS.bubbleGap} />
            </span>
            <span>
              <i className="line" style={{ background: "var(--s1)", height: 6 }} />
              Most even season
            </span>
          </div>
        </RecordsPanel>
      </div>

      {/* ---------------- Named after a player ---------------- */}
      {names_.length > 0 && (
        <>
          <RecordsGroup id="g-fun">Named after a player</RecordsGroup>
          <RecordsPanel
            id="namesakes"
            title="Did the namesake deliver?"
            tip={RECORD_TIPS.namesake}
            sub={`${names_.filter((r) => r.ownedAtEnd).length} of ${names_.length} teams still had their namesake when the season ended; ${names_.filter((r) => r.finalRank === 1).length} won the title. "300+" = outside the top 300.`}
          >
            <NamesakeCards rows={names_} names={names} />
          </RecordsPanel>
        </>
      )}
    </>
  );
}

function RecordCard({ label, tip, value, children }: { label: string; tip?: string; value: ReactNode; children: ReactNode }) {
  return (
    <div className="tile rec relative">
      <div className="rec-k flex items-center gap-1.5">
        {label}
        {tip && <InfoTip box text={tip} />}
      </div>
      <div className="rec-v tabular-nums">{value}</div>
      <div className="rec-d">{children}</div>
    </div>
  );
}

function RaceRow({ r, kind, nameOf }: { r: RaceRecord; kind: "Comeback" | "Collapse" | "Final-week heartbreak"; nameOf: (id: string) => string }) {
  const missed = kind !== "Comeback";
  return (
    <div>
      <div className="l">
        <span className="t1">
          <span className={`badge mr-1.5 ${missed ? "badge-orange" : ""}`}>{kind}</span>
          {r.teamName}
        </span>
        <span className="t2">
          {nameOf(r.managerId)} · {r.label}
        </span>
      </div>
      <div className="rv">
        <span className="tabular-nums">
          {ordinal(r.rank)} <span className="text-muted">wk {r.week}</span> →{" "}
          {missed ? <b className="text-[color:var(--negative)]">missed</b> : <b className="text-[color:var(--positive)]">{ordinal(r.seed)} seed</b>}
        </span>
        <span className="t2 block">finished {ordinal(r.finalRank)}</span>
      </div>
    </div>
  );
}

function SeasonList({ rows, slug, nameOf }: { rows: TeamSeasonRow[]; slug: string; nameOf: (id: string) => string }) {
  return (
    <div className="rec-list">
      {rows.map((r, i) => (
        <div key={`${r.year}-${r.managerId}`}>
          <span className="rk">{i + 1}</span>
          <div className="l">
            <span className="t1">{r.teamName}</span>
            <span className="t2">
              {nameOf(r.managerId)} ·{" "}
              <Link href={`/${slug}/seasons/${r.year}`} className="underline decoration-[color:var(--border-2)] hover:text-accent">
                {r.label}
              </Link>{" "}
              · finished {ordinal(r.finalRank)}
            </span>
          </div>
          <div className="rv">
            <b>{formatPct(r.pct)}</b>
            <span className="t2 block">{r.record}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
