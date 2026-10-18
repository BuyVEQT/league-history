import { Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AwardGrid } from "@/components/AwardsView";
import { BumpChart } from "@/components/charts/BumpChart";
import { CountUp } from "@/components/CountUp";
import { rankLabel, signed } from "@/components/draft";
import { InfoTip } from "@/components/InfoTip";
import { AllTimeRace } from "@/components/viz/AllTimeRace";
import { Avatar, Card, ManagerLink, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { allTimeAwards, seasonAwards } from "@/lib/analytics/awards";
import { careerStats, defaultCompare } from "@/lib/analytics/career";
import { finishHistory } from "@/lib/analytics/leaderboardView";
import { hasDraftData, leaguePicks, topSteals } from "@/lib/analytics/draft";
import { formatPct, formatRecord, ordinal } from "@/lib/analytics/format";
import { goatScores } from "@/lib/analytics/goat";
import { h2hMatrix } from "@/lib/analytics/headToHead";
import { championHistory, leagueSummary, seasonRecords } from "@/lib/analytics/overview";
import { sweeps } from "@/lib/analytics/scorelines";
import { seasonOutcome } from "@/lib/analytics/season";
import { longestStreaks } from "@/lib/analytics/streaks";
import { hasTradeData, leagueTrades } from "@/lib/analytics/trades";
import { careerLuck } from "@/lib/analytics/whatIf";
import { allTimeRace } from "@/lib/analytics/weekly";
import { getLeague } from "@/lib/data";
import { monograms } from "@/components/viz/monograms";
import { SEASON_TIPS } from "@/lib/explain/seasons";
import { AWARD_RULES, TIPS } from "@/lib/explain";

/** Season awards shown on the overview, in this order, when the season has them. The champion is already in the hero. */
const HEADLINE_AWARDS = ["Regular-season MVP", "Cinderella", "Steal of the draft", "Heist of the year", "Horseshoe", "Comeback of the year", "Front-runner", "Broom award"];
const HEADLINE_ALL_TIME = ["The GOAT", "Most decorated", "Category machine", "Draft guru", "Trade shark", "Horseshoe", "Mr. Steady", "Still waiting"];

export const metadata = { title: "League overview" };

/** Faint basketball court, drawn behind the hero card. */
function Court() {
  return (
    <svg className="court" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="10" y="10" width="180" height="180" rx="4" />
      <circle cx="100" cy="100" r="30" />
      <path d="M10 100h180M60 10v50h80V10M60 190v-50h80v50" />
      <path d="M40 10a60 60 0 0 0 120 0M40 190a60 60 0 0 1 120 0" />
    </svg>
  );
}

export default async function OverviewPage(props: PageProps<"/[league]">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const summary = leagueSummary(league);
  const champions = championHistory(league);
  const careers = careerStats(league);
  const ranked = [...careers].sort(defaultCompare);
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const titlesOf = (id: string) => careers.find((c) => c.managerId === id)?.titles ?? 0;

  const recent = league.seasons.at(-1)!;
  const recentOutcome = seasonOutcome(recent);
  const recentRecords = seasonRecords(recent);
  const reigning = champions.at(-1)!;
  const [hot] = longestStreaks(league, "W", 1);
  const [cold] = longestStreaks(league, "L", 1);

  // Everyone who ever played, best careers first, with one point per season played.
  const bumpSeries = ranked.map((c) => ({ id: c.managerId, name: c.name, pts: finishHistory(league, c.managerId) }));
  const maxTeams = Math.max(...league.seasons.map((s) => s.teams.length));

  // Bragging rights: 9-0 weeks and categories won per week.
  const sweepCounts = new Map<string, number>();
  for (const s of sweeps(league)) sweepCounts.set(s.winnerManagerId, (sweepCounts.get(s.winnerManagerId) ?? 0) + 1);
  const [sweepKing] = [...sweepCounts.entries()].sort((a, b) => b[1] - a[1]);
  const perWeek = careers
    .filter((c) => c.seasons >= 3 && c.wins + c.losses + c.ties > 0)
    .map((c) => ({ c, avg: c.catWins / (c.wins + c.losses + c.ties), weeks: c.wins + c.losses + c.ties }))
    .sort((a, b) => b.avg - a.avg)[0];

  // Awards: the latest season's headline superlatives and the all-time ones, linking to the awards pages.
  const latestAwards = seasonAwards(league, recent);
  const headline = HEADLINE_AWARDS.map((t) => latestAwards.find((a) => a.title === t)).filter((a) => !!a).slice(0, 6);
  const allTime = allTimeAwards(league);
  const allTimeHeadline = HEADLINE_ALL_TIME.map((t) => allTime.find((a) => a.title === t)).filter((a) => !!a);

  // Explore: one real teaser per deeper page, so nothing interesting stays hidden behind the nav.
  const [goat] = goatScores(league);
  const [luckiest] = careerLuck(league);
  const [steal] = hasDraftData(league) ? topSteals(leaguePicks(league), 1) : [];
  const heist = hasTradeData(league)
    ? leagueTrades(league)
        .filter((t) => t.status === "completed" && t.winnerManagerId)
        .sort((a, b) => b.margin - a.margin)[0]
    : undefined;
  const matrix = h2hMatrix(league);
  const rivalry = matrix.ids
    .flatMap((a) => matrix.ids.filter((b) => b !== a).map((b) => ({ a, b, cell: matrix.cells[a]?.[b] })))
    .flatMap(({ a, b, cell }) => {
      const games = cell ? cell.wins + cell.losses + cell.ties : 0;
      return cell && games >= 6 ? [{ a, b, cell, pct: (cell.wins + cell.ties / 2) / games }] : [];
    })
    .sort((x, y) => y.pct - x.pct || y.cell.wins - x.cell.wins)[0];
  const explore = [
    goat && { href: "leaderboard", k: "Leaderboard", line: `${goat.name} leads the all-time GOAT rankings at ${goat.score.toFixed(0)} out of 100.`, tip: TIPS.goat },
    luckiest && {
      href: "records#luck",
      k: "Records",
      line: `Luckiest manager: ${nameOf(luckiest.managerId)}, ${signed(luckiest.luck, 1)} more matchup wins than their category results usually earn. Plus streaks, droughts and upsets.`,
      tip: TIPS.matchupLuck,
    },
    steal && {
      href: "draft",
      k: "Draft",
      line: `Best pick ever: ${steal.playerName}, taken #${steal.overall} in ${steal.label} by ${nameOf(steal.managerId)}, finished ${rankLabel(steal.actualRank)} (${signed(steal.value, 1)} draft value).`,
      tip: TIPS.draftValue,
    },
    heist && {
      href: "trades",
      k: "Trades",
      line: `Most lopsided trade: ${nameOf(heist.winnerManagerId!)} came out ${signed(heist.margin, 1)} ahead in ${heist.label}. Every deal is graded.`,
      tip: TIPS.tradeMargin,
    },
    rivalry && {
      href: "rivalries",
      k: "Rivalries",
      line: `${nameOf(rivalry.a)} is ${formatRecord(rivalry.cell.wins, rivalry.cell.losses, rivalry.cell.ties)} all time against ${nameOf(rivalry.b)} (${formatPct(rivalry.pct, 0)}). Compare any two managers.`,
      tip: undefined,
    },
  ].filter((x) => !!x);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="hero-card">
          <Court />
          <div className="eyebrow-accent !text-accent">Reigning champion · {reigning.label}</div>
          {reigning.championManagerId ? (
            <>
              <div className="big">{reigning.championTeamName}</div>
              <div className="flex items-center gap-2.5">
                <span className="mono size-10 !bg-accent text-[17px]" aria-hidden>
                  {monograms(league.managers).get(reigning.championManagerId) ?? nameOf(reigning.championManagerId).slice(0, 2).toUpperCase()}
                </span>
                <div className="sub">
                  <b>{nameOf(reigning.championManagerId)}</b> · title #{titlesOf(reigning.championManagerId)}
                  {reigning.runnerUpTeamName && `. Beat ${nameOf(reigning.runnerUpManagerId!)} (${reigning.runnerUpTeamName}) in the final.`}
                </div>
              </div>
            </>
          ) : (
            <div className="sub">Not decided yet.</div>
          )}
          <Link href={`/${slug}/seasons/${reigning.year}`} className="go">
            Relive the {reigning.label} season →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Most titles"
            value={<CountUp value={summary.mostTitles.count} />}
            detail={`${summary.mostTitles.rows.map((r) => r.name).join(", ")}${summary.mostTitles.rows.length > 1 ? " (tied)" : ""}`}
            tip={SEASON_TIPS.titles}
          />
          <StatCard
            label="Longest win streak"
            value={hot ? <CountUp value={hot.length} /> : "—"}
            detail={hot && `${nameOf(hot.managerId)} · ${hot.label}, weeks ${hot.fromWeek}–${hot.toWeek}`}
            tip={SEASON_TIPS.streak}
          />
          <StatCard label="Seasons" value={<CountUp value={summary.seasons} />} detail={`${league.seasons[0].label} to ${recent.label}`} />
          <StatCard label="Matchups played" value={<CountUp value={summary.completedMatchups} />} detail="weekly head-to-heads, playoffs included" />
        </div>
      </div>

      <Section title="Banners in the rafters">
        <p className="-mt-1 text-sm text-[color:var(--ink-2)]">Every champion, hung where they belong. Click a banner to relive that season.</p>
        <div className="rafters">
          <div className="banners">
            {champions.map((c, i) => (
              <Link key={c.year} href={`/${slug}/seasons/${c.year}`} className={`banner ${i === champions.length - 1 ? "latest" : ""}`}>
                <span className="champ-word">Champions</span>
                <span className="yr">{c.label}</span>
                <Trophy className="tr" aria-hidden />
                <span className="tm">{c.championTeamName ?? "—"}</span>
                <span className="mg">{c.championManagerId ? nameOf(c.championManagerId) : "Not decided"}</span>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="Awards"
        tip="Superlatives handed out every season and for all time, from MVP and Cinderella to steal of the draft and heist of the year. Nobody votes: each winner is picked by a fixed rule from the numbers. Hover or tap the i on a card to see how."
        aside={
          <Link href={`/${slug}/awards`} className="text-sm font-semibold text-accent hover:underline">
            All awards →
          </Link>
        }
      >
        <p className="-mt-1 text-sm text-[color:var(--ink-2)]">
          Highlights from the {recent.label} hardware.{" "}
          <Link href={`/${slug}/awards/${recent.year}`} className="font-semibold text-accent hover:underline">
            See all {latestAwards.length} {recent.label} awards →
          </Link>
        </p>
        {headline.length > 0 && <AwardGrid awards={headline} league={league} scope="season" />}
        {allTimeHeadline.length > 0 && (
          <div className="panel p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="award-k">All-time honours</span>
              <InfoTip down text="Career awards, counting every season in the league's history. Hover or tap the i beside an award to see how its winner is picked." />
            </div>
            <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {allTimeHeadline.map((a) => (
                <li key={a.title} className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm">
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="font-semibold">{a.title}</span>
                    {AWARD_RULES.allTime[a.title] && <InfoTip down text={AWARD_RULES.allTime[a.title]} />}
                  </span>
                  <span className="min-w-0 text-right text-[color:var(--ink-2)]">
                    {a.winners.map((id, i) => (
                      <span key={id}>
                        {i > 0 && ", "}
                        <ManagerLink id={id} name={nameOf(id)} />
                      </span>
                    ))}{" "}
                    · <span className="tabular-nums">{a.value}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <nav aria-label="Awards by season" className="flex flex-wrap gap-1.5">
          {league.seasons.map((s) => (
            <Link key={s.year} href={`/${slug}/awards/${s.year}`} className="pill">
              {s.label} awards
            </Link>
          ))}
        </nav>
      </Section>

      {explore.length > 0 && (
        <Section title="Explore the league" tip="A taste of what's on the other pages, pulled from the real numbers. Click a card to dig in.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {explore.map((x) => (
              <div key={x.k} className="panel relative grid content-start gap-1.5 p-4">
                <span className="award-k flex items-center gap-1.5">
                  {x.k}
                  {x.tip && <InfoTip box text={x.tip} />}
                </span>
                <span className="text-sm text-[color:var(--ink-2)]">{x.line}</span>
                <Link href={`/${slug}/${x.href}`} className="text-sm font-semibold text-accent hover:underline">
                  Open {x.k.toLowerCase()} →
                </Link>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="The all-time race" tip={SEASON_TIPS.race}>
        <p className="-mt-1 text-sm text-[color:var(--ink-2)]">Watch the all-time standings take shape, season by season.</p>
        <Card className="p-5">
          <AllTimeRace frames={allTimeRace(league).map(({ label, rows }) => ({ label, rows }))} names={Object.fromEntries(league.managers.map((m) => [m.id, m.name]))} />
        </Card>
      </Section>

      <Section title="Where everyone finished" tip={SEASON_TIPS.bump}>
        <p className="-mt-1 text-sm text-[color:var(--ink-2)]">Final finish by season. Hover any line; tap names to pin up to three.</p>
        <Card className="p-5">
          <BumpChart
            series={bumpSeries}
            years={league.seasons.map((s) => ({ year: s.year, label: s.label }))}
            maxTeams={maxTeams}
            initialPins={[...new Set([reigning.championManagerId, ...ranked.map((c) => c.managerId)].filter((x): x is string => !!x))].slice(0, 2)}
          />
        </Card>
      </Section>

      <Section title="Bragging rights">
        <p className="-mt-1 text-sm text-[color:var(--ink-2)]">The streaks and weeks people still bring up in the group chat.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            hot && { k: "Hottest streak", v: hot.length, dec: 0, unit: "straight wins", who: hot.managerId, d: `${hot.teamName}, ${hot.label}, weeks ${hot.fromWeek}–${hot.toWeek}`, tip: SEASON_TIPS.streak },
            cold && { k: "Coldest streak", v: cold.length, dec: 0, unit: "straight losses", who: cold.managerId, d: `${cold.teamName}, ${cold.label}, weeks ${cold.fromWeek}–${cold.toWeek}`, tip: SEASON_TIPS.streak },
            sweepKing && { k: "9-0 sweeps", v: sweepKing[1], dec: 0, unit: sweepKing[1] === 1 ? "perfect week" : "perfect weeks", who: sweepKing[0], d: "most in league history", tip: "A sweep is a week where one team wins every single category against its opponent." },
            perWeek && {
              k: "Categories per week",
              v: perWeek.avg,
              dec: 2,
              unit: `of ${recent.categories.length || 9}`,
              who: perWeek.c.managerId,
              d: `best average, ${perWeek.weeks} weeks`,
              tip: `How many categories they win in a typical week, averaged over every matchup they've played (3+ seasons). Half of ${recent.categories.length || 9} is average; anything above 5 is a team that usually wins its week.`,
            },
          ]
            .filter((x): x is { k: string; v: number; dec: number; unit: string; who: string; d: string; tip: string } => !!x)
            .map((r) => (
              <div key={r.k} className="panel rec relative p-4">
                <div className="rec-k flex items-center gap-1.5">
                  {r.k}
                  {r.tip && <InfoTip box text={r.tip} />}
                </div>
                <div className="rec-v">
                  <CountUp value={r.v} decimals={r.dec} />
                  <small>{r.unit}</small>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[13.5px] text-[color:var(--ink-2)]">
                  <Avatar size="sm" name={nameOf(r.who)} initials={monograms(league.managers).get(r.who)} />
                  <span>
                    <ManagerLink id={r.who} name={nameOf(r.who)} /> · {r.d}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </Section>

      <Section
        title={`Latest season · ${recent.label}`}
        aside={
          <Link href={`/${slug}/seasons/${recent.year}`} className="text-sm font-semibold text-accent hover:underline">
            Season details →
          </Link>
        }
      >
        <div className="grid gap-3 xl:grid-cols-2">
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">Regular-season standings, top five</caption>
              <thead>
                <tr>
                  <th className={th}>#</th>
                  <th className={th}>Team</th>
                  <th className={th}>Record</th>
                  <th className={th}>Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOutcome.standings.slice(0, 5).map((r) => (
                  <tr key={r.teamId} data-m={r.managerId} className={tr}>
                    <td className={`${td} text-muted`}>{r.rank}</td>
                    <td className={td}>
                      <span className="font-semibold">{r.teamName}</span> <span className="text-muted">· {nameOf(r.managerId)}</span>
                    </td>
                    <td className={td}>{formatRecord(r.wins, r.losses, r.ties)}</td>
                    <td className={td}>{ordinal(recentOutcome.finalRank.get(r.teamId)!)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Best regular season"
              value={recentRecords.bestRecord ? formatRecord(recentRecords.bestRecord.wins, recentRecords.bestRecord.losses, recentRecords.bestRecord.ties) : "—"}
              detail={recentRecords.bestRecord?.teamName}
            />
            <StatCard
              label="Biggest blowout"
              value={recentRecords.biggestBlowout?.score ?? "—"}
              detail={recentRecords.biggestBlowout ? `${recentRecords.biggestBlowout.winnerName} over ${recentRecords.biggestBlowout.loserName}, wk ${recentRecords.biggestBlowout.week}` : undefined}
            />
          </div>
        </div>
      </Section>
    </>
  );
}
