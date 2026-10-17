import { Crown, Flame, Medal, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { ManagerTrend } from "@/components/charts/ManagerTrend";
import { Avatar, Card, cardClass, ManagerLink, PageTitle, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { careerStats, defaultCompare, managerSeasons, type CareerRow } from "@/lib/analytics/career";
import { formatPct, formatRecord } from "@/lib/analytics/format";
import { championHistory, leagueSummary, MIN_SEASONS_FOR_RATES, seasonRecords } from "@/lib/analytics/overview";
import { seasonOutcome } from "@/lib/analytics/season";
import { colorForManager, managerColor } from "@/lib/colors";
import { notFound } from "next/navigation";
import { getLeague } from "@/lib/data";

export const metadata = { title: "League overview" };

export default async function OverviewPage(props: PageProps<"/[league]">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const summary = leagueSummary(league);
  const champions = championHistory(league);
  const careers = careerStats(league);
  const ranked = [...careers].sort(defaultCompare);
  const qualified = careers.filter((c) => c.seasons >= MIN_SEASONS_FOR_RATES && c.winPct !== null);
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)!.name;
  const titlesOf = (id: string) => careers.find((c) => c.managerId === id)?.titles ?? 0;

  const recent = league.seasons.at(-1)!;
  const recentOutcome = seasonOutcome(recent);
  const recentRecords = seasonRecords(recent);
  const reigning = champions.at(-1)!;

  const managerOptions = league.managers.map((m, i) => ({ id: m.id, name: m.name, color: managerColor(i) }));
  const finishRows = league.seasons.map((season) => {
    const o = seasonOutcome(season);
    const row: { year: number } & Record<string, number | null> = { year: season.year };
    for (const m of league.managers) {
      const team = season.teams.find((t) => t.managerId === m.id);
      row[m.id] = team ? o.finalRank.get(team.id)! : null;
    }
    return row;
  });
  const winPctRows = league.seasons.map((season) => {
    const row: { year: number } & Record<string, number | null> = { year: season.year };
    for (const m of league.managers) {
      row[m.id] = managerSeasons(league, m.id, { from: season.year, to: season.year })[0]?.winPct ?? null;
    }
    return row;
  });
  const maxTeams = Math.max(...league.seasons.map((s) => s.teams.length));

  const previews: { title: string; icon: React.ReactNode; rows: { c: CareerRow; label: string; value: number }[] }[] = [
    {
      title: "Championships",
      icon: <Trophy />,
      rows: ranked.slice(0, 3).map((c) => ({ c, label: String(c.titles), value: c.titles })),
    },
    {
      title: `Win % · ${MIN_SEASONS_FOR_RATES}+ seasons`,
      icon: <Flame />,
      rows: [...qualified]
        .sort((a, b) => b.winPct! - a.winPct!)
        .slice(0, 3)
        .map((c) => ({ c, label: formatPct(c.winPct), value: c.winPct! })),
    },
    {
      title: "Playoff appearances",
      icon: <Medal />,
      rows: [...careers]
        .sort((a, b) => b.playoffApps - a.playoffApps || defaultCompare(a, b))
        .slice(0, 3)
        .map((c) => ({ c, label: `${c.playoffApps}/${c.seasons}`, value: c.playoffApps })),
    },
  ];

  return (
    <>
      <PageTitle
        eyebrow="League overview"
        title="Your league, all-time"
        subtitle={`${summary.seasons} seasons · ${summary.managers} managers · every number below is derived from the same matchup-level data.`}
      />

      {/* Hero: reigning champion + headline numbers */}
      <div className="grid gap-3 lg:grid-cols-5">
        <div className={`${cardClass} relative overflow-hidden p-6 lg:col-span-2`}>
          <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-accent/15 blur-3xl" />
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-accent">
            <Crown className="size-4" aria-hidden /> Reigning champion · {reigning.label}
          </div>
          {reigning.championManagerId ? (
            <>
              <div className="mt-4 text-3xl font-semibold tracking-tight">{reigning.championTeamName}</div>
              <div className="mt-3 flex items-center gap-2.5">
                <Avatar name={nameOf(reigning.championManagerId)} color={colorForManager(league, reigning.championManagerId)} />
                <div>
                  <ManagerLink id={reigning.championManagerId} name={nameOf(reigning.championManagerId)} />
                  <div className="text-xs text-muted">
                    {titlesOf(reigning.championManagerId)} career title{titlesOf(reigning.championManagerId) === 1 ? "" : "s"}
                    {reigning.runnerUpTeamName && ` · beat ${reigning.runnerUpTeamName} in the final`}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 text-muted">Not decided yet.</div>
          )}
          <Link
            href={`/${slug}/seasons/${reigning.year}`}
            className="mt-6 inline-block text-sm text-accent hover:underline"
          >
            View the {reigning.label} season →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-3">
          <StatCard
            label="Most titles"
            icon={<Trophy />}
            value={summary.mostTitles.count}
            detail={summary.mostTitles.rows.map((r) => r.name).join(", ")}
          />
          <StatCard
            label="Best career win %"
            icon={<Flame />}
            value={formatPct(summary.bestWinPct?.winPct ?? null)}
            detail={summary.bestWinPct?.name}
          />
          <StatCard label="Seasons" value={summary.seasons} detail={`${league.seasons[0].label} to ${recent.label}`} />
          <StatCard
            label="Matchups played"
            icon={<Swords />}
            value={summary.completedMatchups.toLocaleString()}
            detail="including playoffs"
          />
        </div>
      </div>

      <Section title="Trophy cabinet">
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[...champions].reverse().map((c) => (
            <li key={c.year}>
              <Link
                href={`/${slug}/seasons/${c.year}`}
                className={`${cardClass} group block h-full p-4 transition-colors hover:border-accent/50`}
              >
                <div className="flex items-center justify-between text-xs text-muted">
                  {c.label}
                  <Trophy className="size-3.5 text-accent/70 transition-colors group-hover:text-accent" aria-hidden />
                </div>
                {c.championManagerId ? (
                  <>
                    <div className="mt-2 truncate font-medium">{c.championTeamName}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                      <Avatar size="sm" name={nameOf(c.championManagerId)} color={colorForManager(league, c.championManagerId)} />
                      <span className="truncate">{nameOf(c.championManagerId)}</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-sm text-muted">No champion</div>
                )}
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title="All-time rankings"
        aside={
          <Link href={`/${slug}/leaderboard`} className="text-sm text-accent hover:underline">
            Full leaderboard →
          </Link>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          {previews.map((p) => {
            const max = Math.max(...p.rows.map((r) => r.value), 0) || 1;
            return (
              <Card key={p.title}>
                <h3 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted [&_svg]:size-4">
                  {p.icon}
                  {p.title}
                </h3>
                <ol className="space-y-3">
                  {p.rows.map(({ c, label, value }, i) => (
                    <li key={c.managerId}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-4 text-xs text-muted">{i + 1}</span>
                          <Avatar size="sm" name={c.name} color={colorForManager(league, c.managerId)} />
                          <span className="truncate">
                            <ManagerLink id={c.managerId} name={c.name} />
                          </span>
                        </span>
                        <span className="font-medium tabular-nums">{label}</span>
                      </div>
                      <div className="ml-6 mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(value / max) * 100}%`, background: colorForManager(league, c.managerId) }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Performance over time">
        <Card className="p-5">
          <ManagerTrend
            managers={managerOptions}
            finishRows={finishRows}
            winPctRows={winPctRows}
            initialSelected={ranked.slice(0, 4).map((c) => c.managerId)}
            teamCount={maxTeams}
          />
        </Card>
      </Section>

      <Section
        title={`Latest season · ${recent.label}`}
        aside={
          <Link href={`/${slug}/seasons/${recent.year}`} className="text-sm text-accent hover:underline">
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
                  <th className={th}>Win %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOutcome.standings.slice(0, 5).map((r) => (
                  <tr key={r.teamId} className={tr}>
                    <td className={`${td} text-muted`}>{r.rank}</td>
                    <td className={td}>{r.teamName}</td>
                    <td className={`${td} tabular-nums`}>{formatRecord(r.wins, r.losses, r.ties)}</td>
                    <td className={`${td} tabular-nums`}>{formatPct(r.winPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Best regular season"
              value={
                recentRecords.bestRecord
                  ? formatRecord(recentRecords.bestRecord.wins, recentRecords.bestRecord.losses, recentRecords.bestRecord.ties)
                  : "—"
              }
              detail={recentRecords.bestRecord?.teamName}
            />
            <StatCard
              label="Biggest blowout"
              value={recentRecords.biggestBlowout?.score ?? "—"}
              detail={
                recentRecords.biggestBlowout
                  ? `${recentRecords.biggestBlowout.winnerName} over ${recentRecords.biggestBlowout.loserName}, wk ${recentRecords.biggestBlowout.week}`
                  : undefined
              }
            />
            <StatCard label="Champion" value={reigning.championTeamName ?? "—"} detail={reigning.championManagerId ? nameOf(reigning.championManagerId) : undefined} />
            <StatCard label="Runner-up" value={reigning.runnerUpTeamName ?? "—"} detail={reigning.runnerUpManagerId ? nameOf(reigning.runnerUpManagerId) : undefined} />
          </div>
        </div>
      </Section>
    </>
  );
}
