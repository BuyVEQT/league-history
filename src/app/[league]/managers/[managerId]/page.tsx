import Link from "next/link";
import { notFound } from "next/navigation";
import { TrendChart } from "@/components/charts/TrendChart";
import { Avatar, cardClass, ManagerLink, PageTitle, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { colorForManager } from "@/lib/colors";
import { signed } from "@/components/draft";
import { careerFromSeasons, managerSeasons } from "@/lib/analytics/career";
import { favouritePlayers, keepRates, reachStats } from "@/lib/analytics/draft";
import { eloRatings } from "@/lib/analytics/elo";
import { formatNumber, formatPct, formatRecord } from "@/lib/analytics/format";
import { opponentRecords } from "@/lib/analytics/headToHead";
import { MIN_SEASONS_FOR_RATES } from "@/lib/analytics/overview";
import { managerStreaks } from "@/lib/analytics/streaks";
import { careerLuck } from "@/lib/analytics/whatIf";
import { getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";

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
  const bestRivals = [...rivals].sort((a, b) => b.winPct - a.winPct || b.games - a.games).slice(0, 3);
  const worstRivals = [...rivals].sort((a, b) => a.winPct - b.winPct || b.games - a.games).slice(0, 3);
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)!.name;
  const maxTeams = Math.max(...league.seasons.map((s) => s.teams.length));

  // Team names used over the years — one manager, many team names.
  const aliases = [...new Set(seasons.map((s) => s.teamName))];

  const chartRows = league.seasons.map((s) => {
    const row = seasons.find((x) => x.year === s.year);
    return { year: s.year, final: row?.finalRank ?? null, regular: row?.regularRank ?? null };
  });
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
        <StatCard label="Average finish" value={formatNumber(career.avgFinish)} detail={`best ${career.bestFinish ?? "—"}`} tip={TIPS.avgFinish} />
        <StatCard label="Best season" value={best ? best.label : "—"} detail={best ? `${best.playoffResult} · ${best.teamName}` : undefined} />
        <StatCard label="Worst season" value={worst ? worst.label : "—"} detail={worst ? `finished ${worst.finalRank} of ${worst.teamCount}` : undefined} />
        <StatCard label="Category record" value={formatRecord(career.catWins, career.catLosses, career.catTies)} tip={TIPS.catRecord} />
        {lastRating && (
          <StatCard
            label="Power rating"
            tip={TIPS.power}
            value={lastRating.rating.toFixed(0)}
            detail={`${lastRating.label === league.seasons.at(-1)!.label ? "now" : `after ${lastRating.label}`} · peak ${peak.rating.toFixed(0)} (${peak.label}, wk ${peak.week})`}
          />
        )}
        <StatCard label="Longest win streak" value={streaks.win?.length ?? 0} detail={streakDetail(streaks.win)} />
        <StatCard label="Longest losing streak" value={streaks.loss?.length ?? 0} detail={streakDetail(streaks.loss)} />
        {luck && (
          <StatCard
            label="Matchup luck"
            tip={TIPS.matchupLuck}
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
                tip={TIPS.reaching}
                value={`${reach.avgEarly >= 0 ? "" : "−"}${Math.abs(reach.avgEarly).toFixed(1)} spots`}
                detail={`${reach.avgEarly >= 0 ? "ahead of" : "after"} the pre-season rank on average (rounds 1-8); ${formatPct(reach.reachShare, 0)} of picks were 15+ spots early`}
              />
            )}
            {keep && (
              <StatCard
                label="Picks kept"
                tip={TIPS.picksKept}
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

      <Section title="Finish by season">
        <div className="panel p-4">
          <TrendChart
            rows={chartRows}
            series={[
              { key: "final", name: "Final finish", color: "var(--s2)" },
              { key: "regular", name: "Regular-season rank", color: "var(--s1)" },
            ]}
            reversed
            domain={[1, maxTeams]}
            valueLabel="Finish"
          />
          <p className="mt-2 text-xs text-muted">Gaps are seasons {manager.name} did not play.</p>
        </div>
      </Section>

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

      <Section title="Rivalries" aside={<Link href={`/${slug}/rivalries`} className="text-sm text-accent hover:underline">Compare any two managers →</Link>}>
        {rivals.length === 0 ? (
          <p className="text-sm text-muted">Not enough head-to-head history yet (needs {MIN_RIVAL_GAMES}+ matchups against an opponent).</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { title: "Dominates", list: bestRivals },
              { title: "Struggles against", list: worstRivals },
            ].map((g) => (
              <div key={g.title} className="rounded-xl border border-border bg-surface/80 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)] p-4">
                <h3 className="mb-2 text-sm font-medium text-muted">{g.title}</h3>
                <ul className="space-y-1.5 text-sm">
                  {g.list.map((r) => (
                    <li key={r.opponentId} className="flex justify-between">
                      <ManagerLink id={r.opponentId} name={nameOf(r.opponentId)} />
                      <span className="tabular-nums text-muted">{formatRecord(r.wins, r.losses, r.ties)} · {formatPct(r.winPct, 0)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted">Includes opponents with at least {MIN_RIVAL_GAMES} matchups, regular season and playoffs.</p>
      </Section>
    </>
  );
}
