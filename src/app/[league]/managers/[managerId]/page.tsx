import Link from "next/link";
import { notFound } from "next/navigation";
import { CareerPath } from "@/components/viz/CareerPath";
import { H2HBars } from "@/components/viz/H2HBars";
import { WeekHistogram } from "@/components/viz/WeekHistogram";
import { Avatar, Card, cardClass, PageTitle, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { colorForManager } from "@/lib/colors";
import { signed } from "@/components/draft";
import { careerFromSeasons, managerSeasons } from "@/lib/analytics/career";
import { favouritePlayers, keepRates, reachStats } from "@/lib/analytics/draft";
import { eloRatings } from "@/lib/analytics/elo";
import { formatNumber, formatPct, formatRecord } from "@/lib/analytics/format";
import { opponentRecords } from "@/lib/analytics/headToHead";
import { MIN_SEASONS_FOR_RATES } from "@/lib/analytics/overview";
import { marginRecords } from "@/lib/analytics/records";
import { managerActivity } from "@/lib/analytics/trades";
import { careerPath, weeklyProfile } from "@/lib/analytics/weekly";
import { managerStreaks } from "@/lib/analytics/streaks";
import { careerLuck } from "@/lib/analytics/whatIf";
import { getLeague } from "@/lib/data";

const MIN_RIVAL_GAMES = 4;

export async function generateStaticParams({ params }: { params: { league: string } }) {
  const league = await getLeague(params.league);
  if (!league) return [];
  // Only managers who actually played in this league get a page.
  const played = new Set(league.seasons.flatMap((s) => s.teams.map((t) => t.managerId)));
  return league.managers.filter((m) => played.has(m.id)).map((m) => ({ managerId: m.id }));
}

export default async function ManagerPage(props: PageProps<"/[league]/managers/[managerId]">) {
  const { league: slug, managerId } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const manager = league.managers.find((m) => m.id === managerId);
  if (!manager) notFound();

  const seasons = managerSeasons(league, manager.id);
  const career = careerFromSeasons(manager.id, manager.name, seasons);
  const best = [...seasons].sort((a, b) => a.finalRank - b.finalRank || (b.winPct ?? 0) - (a.winPct ?? 0))[0];
  const worst = [...seasons].sort((a, b) => b.finalRank - a.finalRank || (a.winPct ?? 1) - (b.winPct ?? 1))[0];
  const finals = career.titles + career.runnerUps;
  const rivals = opponentRecords(league, manager.id).filter((r) => r.games >= MIN_RIVAL_GAMES);
  const allRivals = opponentRecords(league, manager.id);
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)!.name;
  const maxTeams = Math.max(...league.seasons.map((s) => s.teams.length));

  // Team names used over the years — one manager, many team names.
  const aliases = [...new Set(seasons.map((s) => s.teamName))];

  const path = careerPath(league, manager.id);
  const weekly = weeklyProfile(league, manager.id);
  const close = marginRecords(league).find((r) => r.managerId === manager.id);
  const wire = managerActivity(league).find((r) => r.managerId === manager.id && r.seasons);
  const elo = eloRatings(league);
  const lastRating = elo.history[manager.id]?.at(-1);
  const peak = elo.peak[manager.id];
  const streaks = managerStreaks(league, manager.id);
  const luck = careerLuck(league).find((r) => r.managerId === manager.id);
  const rating = league.ratings?.rows.find((r) => r.managerId === manager.id);
  const favourites = favouritePlayers(league).filter((f) => f.managerId === manager.id);
  const reach = reachStats(league)?.rows.find((r) => r.managerId === manager.id);
  const keep = keepRates(league).rows.find((r) => r.managerId === manager.id);
  const streakDetail = (r: typeof streaks.win) => (r ? `${r.teamName}, ${r.label} (weeks ${r.fromWeek}–${r.toWeek})` : undefined);
  const asOf = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const ratesNote = career.seasons < MIN_SEASONS_FOR_RATES ? ` Only ${career.seasons} season${career.seasons === 1 ? "" : "s"} played, so rates are a small sample.` : "";

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar size="lg" name={manager.name} color={colorForManager(league, manager.id)} />
        <PageTitle
          eyebrow="Manager profile"
          title={manager.name}
          subtitle={`${career.firstYear! - 1}-${String(career.firstYear).slice(2)} to ${career.lastYear! - 1}-${String(career.lastYear).slice(2)} · Teams: ${aliases.join(", ")}.${ratesNote}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Championships" value={career.titles} detail={`${finals} finals appearance${finals === 1 ? "" : "s"}`} />
        <StatCard label="Seasons" value={career.seasons} detail={`${career.playoffApps} playoff appearances (${formatPct(career.playoffPct, 0)})`} />
        <StatCard label="Regular season" value={formatRecord(career.wins, career.losses, career.ties)} detail={`${formatPct(career.winPct)} win`} />
        <StatCard label="Average finish" value={formatNumber(career.avgFinish)} detail={`best ${career.bestFinish ?? "—"}`} />
        <StatCard label="Best season" value={best ? best.label : "—"} detail={best ? `${best.playoffResult} · ${best.teamName}` : undefined} />
        <StatCard label="Worst season" value={worst ? worst.label : "—"} detail={worst ? `finished ${worst.finalRank} of ${worst.teamCount}` : undefined} />
        <StatCard label="Category record" value={formatRecord(career.catWins, career.catLosses, career.catTies)} />
        {lastRating && (
          <StatCard
            label="Power rating"
            value={lastRating.rating.toFixed(0)}
            detail={`${lastRating.label === league.seasons.at(-1)!.label ? "now" : `after ${lastRating.label}`} · peak ${peak.rating.toFixed(0)} (${peak.label}, wk ${peak.week})`}
          />
        )}
        <StatCard label="Longest win streak" value={streaks.win?.length ?? 0} detail={streakDetail(streaks.win)} />
        <StatCard label="Longest losing streak" value={streaks.loss?.length ?? 0} detail={streakDetail(streaks.loss)} />
        {luck && (
          <StatCard
            label="Matchup luck"
            value={signed(luck.luck, 1)}
            detail={`matchup wins vs what their category results predicted, ${luck.seasons} season${luck.seasons === 1 ? "" : "s"}`}
          />
        )}
        {rating && (
          <StatCard
            label={league.source === "yahoo" ? "Yahoo manager rating" : "Manager rating"}
            value={rating.rating}
            detail={`${rating.level} · #${rating.rank} in the league · as of ${asOf(league.ratings!.asOf)}`}
          />
        )}
      </div>

      {(favourites.length > 0 || reach || keep) && (
        <Section title="Draft habits">
          <div className="grid gap-3 md:grid-cols-3">
            {reach && (
              <StatCard
                label="Reaching"
                value={`${reach.avgEarly >= 0 ? "" : "−"}${Math.abs(reach.avgEarly).toFixed(1)} spots`}
                detail={`${reach.avgEarly >= 0 ? "ahead of" : "after"} the pre-season rank on average (rounds 1-8); ${formatPct(reach.reachShare, 0)} of picks were 15+ spots early`}
              />
            )}
            {keep && (
              <StatCard
                label="Picks kept"
                value={`${keep.avgKept.toFixed(1)} per draft`}
                detail={`${formatPct(keep.keptShare, 0)} of their own picks were still on the roster at season end`}
              />
            )}
            <div className={`${cardClass} p-5`}>
              <div className="text-xs font-medium uppercase tracking-wide text-muted">Favourite players</div>
              {favourites.length ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {favourites.slice(0, 5).map((f) => (
                    <li key={f.playerId} className="flex justify-between gap-2">
                      <span className="truncate">{f.playerName}</span>
                      <span className="shrink-0 text-muted">drafted ×{f.picks.length}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">Nobody drafted in three or more seasons.</p>
              )}
            </div>
          </div>
        </Section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Career path">
          <Card className="space-y-2 p-5">
            <CareerPath points={path} years={league.seasons} maxTeams={maxTeams} />
            <div className="viz-legend">
              <span><i className="dot" style={{ background: "var(--s1)" }} />Final finish</span>
              <span><i className="dot" style={{ boxShadow: "inset 0 0 0 2px var(--ink-2)" }} />Regular-season seed</span>
              <span><i className="dot" style={{ background: "var(--gold)" }} />Title</span>
              <span><i className="line" style={{ background: "var(--pos)" }} />Beat the seed</span>
              <span><i className="line" style={{ background: "var(--neg)" }} />Fell below it</span>
            </div>
          </Card>
        </Section>
        <Section title="A typical week">
          <Card className="space-y-2 p-5">
            <WeekHistogram dist={weekly.dist} leagueDist={weekly.leagueDist} name={manager.name} />
            <div className="viz-legend">
              <span><i style={{ background: "var(--s1)" }} />{manager.name}</span>
              <span><i className="line" style={{ background: "var(--foreground)" }} />League average</span>
              <span>
                {weekly.avgCats.toFixed(2)} categories a week · {weekly.sweeps} sweep{weekly.sweeps === 1 ? "" : "s"}
              </span>
            </div>
          </Card>
        </Section>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {close && (
          <Section title="Close calls">
            <Card className="py-1">
              <ListRows
                rows={[
                  ["One-category wins", "decided by a single category, playoffs included", <span key="w" className="text-positive">{close.closeWins}</span>],
                  ["One-category losses", "so close", <span key="l" className="text-negative">{close.closeLosses}</span>],
                  ["Blowouts", "won or lost by 7+ categories", `${close.blowoutWins}-${close.blowoutLosses}`],
                  ["Swept", `lost every category to an opponent`, weekly.swept],
                  ["Categories per week", `${weekly.weeks} weeks`, weekly.avgCats.toFixed(2)],
                ]}
              />
            </Card>
          </Section>
        )}
        {wire && (
          <Section title="On the wire & in trades">
            <Card className="py-1">
              <ListRows
                rows={[
                  ["Moves per season", `${wire.moves} adds and drops in all`, wire.movesPerSeason.toFixed(0)],
                  ["Trades", wire.vetoed ? `${wire.vetoed} more vetoed` : "none vetoed", wire.trades ? `${wire.trades} (${wire.tradeWins}-${wire.tradeLosses})` : "0"],
                  [
                    "Net trade value",
                    "received minus given",
                    <span key="n" className={wire.netValue > 0 ? "text-positive" : wire.netValue < 0 ? "text-negative" : ""}>
                      {wire.trades ? signed(wire.netValue, 1) : "—"}
                    </span>,
                  ],
                  ["Favorite partner", "most trades with", wire.favoritePartner ? `${nameOf(wire.favoritePartner.managerId)} (${wire.favoritePartner.count})` : "—"],
                ]}
              />
            </Card>
          </Section>
        )}
      </div>

      <Section title="Season by season">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">{manager.name} season-by-season results</caption>
            <thead>
              <tr>
                <th className={th}>Season</th>
                <th className={th}>Team</th>
                <th className={th}>W-L-T</th>
                <th className={th}>Reg. rank</th>
                <th className={th}>Final</th>
                <th className={th}>Playoff result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...seasons].reverse().map((s) => (
                <tr key={s.year} className={tr}>
                  <td className={td}>
                    <Link href={`/${slug}/seasons/${s.year}`} className="text-accent hover:underline">{s.label}</Link>
                  </td>
                  <td className={td}>{s.teamName}</td>
                  <td className={`${td} tabular-nums`}>{formatRecord(s.wins, s.losses, s.ties)}</td>
                  <td className={`${td} tabular-nums`}>{s.regularRank} / {s.teamCount}</td>
                  <td className={`${td} tabular-nums`}>{s.finalRank}</td>
                  <td className={td}>{s.playoffResult}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section title="Head-to-head vs everyone" aside={<Link href={`/${slug}/rivalries`} className="text-sm text-accent hover:underline">Compare any two managers →</Link>}>
        {allRivals.length === 0 ? (
          <p className="text-sm text-muted">No head-to-head history yet.</p>
        ) : (
          <Card className="p-5">
            <H2HBars rows={allRivals} name={manager.name} nameOf={nameOf} href={`/${slug}/rivalries#a=${manager.id}`} />
          </Card>
        )}
        <p className="text-xs text-muted">
          Matchup record against each opponent, regular season and playoffs; right of center = a winning record. Click a row to open the rivalry.
          {rivals.length > 0 && ` Best: ${nameOf([...rivals].sort((a, b) => b.winPct - a.winPct)[0].opponentId)}; toughest: ${nameOf([...rivals].sort((a, b) => a.winPct - b.winPct)[0].opponentId)} (${MIN_RIVAL_GAMES}+ meetings).`}
        </p>
      </Section>
    </>
  );
}

function ListRows({ rows }: { rows: [string, string, React.ReactNode][] }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map(([label, note, value]) => (
        <li key={label} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <div className="font-semibold">{label}</div>
            <div className="text-xs text-muted">{note}</div>
          </div>
          <div className="shrink-0 text-right tabular-nums">{value}</div>
        </li>
      ))}
    </ul>
  );
}
