import Link from "next/link";
import { ManagerTrend } from "@/components/charts/ManagerTrend";
import { Card, ManagerLink, PageTitle, Section, StatCard, TableWrap, td, th } from "@/components/ui";
import { careerStats, defaultCompare, managerSeasons } from "@/lib/analytics/career";
import { formatPct, formatRecord } from "@/lib/analytics/format";
import { championHistory, leagueSummary, MIN_SEASONS_FOR_RATES, seasonRecords } from "@/lib/analytics/overview";
import { seasonOutcome } from "@/lib/analytics/season";
import { managerColor } from "@/lib/colors";
import { provider } from "@/lib/data";

export const metadata = { title: "League overview" };

export default async function OverviewPage() {
  const league = await provider.getLeague();
  const summary = leagueSummary(league);
  const champions = championHistory(league);
  const careers = careerStats(league);
  const ranked = [...careers].sort(defaultCompare);
  const qualified = careers.filter((c) => c.seasons >= MIN_SEASONS_FOR_RATES && c.winPct !== null);

  const recent = league.seasons.at(-1)!;
  const recentOutcome = seasonOutcome(recent);
  const recentRecords = seasonRecords(recent);
  const recentChamp = champions.at(-1)!;

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

  const top3 = (rows: typeof careers, value: (c: (typeof careers)[number]) => string) =>
    rows.slice(0, 3).map((c) => ({ c, v: value(c) }));
  const previews = [
    { title: "Championships", rows: top3(ranked, (c) => String(c.titles)) },
    {
      title: `Win % (${MIN_SEASONS_FOR_RATES}+ seasons)`,
      rows: top3([...qualified].sort((a, b) => b.winPct! - a.winPct!), (c) => formatPct(c.winPct)),
    },
    {
      title: "Playoff appearances",
      rows: top3([...careers].sort((a, b) => b.playoffApps - a.playoffApps || defaultCompare(a, b)), (c) => `${c.playoffApps}/${c.seasons}`),
    },
  ];

  return (
    <>
      <PageTitle title="League overview" subtitle="Everything below is derived from the same matchup-level data." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Seasons" value={summary.seasons} />
        <StatCard label="Managers" value={summary.managers} detail="all-time" />
        <StatCard label="Matchups" value={summary.completedMatchups.toLocaleString()} detail="incl. playoffs" />
        <StatCard
          label="Most titles"
          value={summary.mostTitles.count}
          detail={summary.mostTitles.rows.map((r) => r.name).join(", ")}
        />
        <StatCard
          label="Best win %"
          value={formatPct(summary.bestWinPct?.winPct ?? null)}
          detail={summary.bestWinPct?.name}
        />
        <StatCard
          label="Latest champion"
          value={summary.mostRecentChampion?.championTeamName ?? "—"}
          detail={summary.mostRecentChampion ? summary.mostRecentChampion.label : undefined}
        />
      </div>

      <Section title="Championship history">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">Champions by season</caption>
            <thead>
              <tr>
                <th className={th}>Season</th>
                <th className={th}>Champion</th>
                <th className={th}>Team</th>
                <th className={th}>Runner-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...champions].reverse().map((c) => (
                <tr key={c.year}>
                  <td className={td}>
                    <Link href={`/demo/seasons/${c.year}`} className="text-accent hover:underline">
                      {c.label}
                    </Link>
                  </td>
                  <td className={td}>
                    {c.championManagerId ? (
                      <ManagerLink id={c.championManagerId} name={league.managers.find((m) => m.id === c.championManagerId)!.name} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>{c.championTeamName ?? "—"}</td>
                  <td className={td}>{c.runnerUpTeamName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section title="All-time rankings" aside={<Link href="/demo/leaderboard" className="text-sm text-accent hover:underline">Full leaderboard →</Link>}>
        <div className="grid gap-3 md:grid-cols-3">
          {previews.map((p) => (
            <Card key={p.title}>
              <h3 className="mb-2 text-sm font-medium text-muted">{p.title}</h3>
              <ol className="space-y-1.5">
                {p.rows.map(({ c, v }, i) => (
                  <li key={c.managerId} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="mr-2 text-muted">{i + 1}.</span>
                      <ManagerLink id={c.managerId} name={c.name} />
                    </span>
                    <span className="tabular-nums text-muted">{v}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Performance over time">
        <Card>
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
        aside={<Link href={`/demo/seasons/${recent.year}`} className="text-sm text-accent hover:underline">Season details →</Link>}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label="Champion" value={recentChamp.championTeamName ?? "—"} detail={recentChamp.championManagerId ? league.managers.find((m) => m.id === recentChamp.championManagerId)!.name : undefined} />
          <StatCard label="Runner-up" value={recentChamp.runnerUpTeamName ?? "—"} />
          <StatCard
            label="Best regular season"
            value={recentRecords.bestRecord ? formatRecord(recentRecords.bestRecord.wins, recentRecords.bestRecord.losses, recentRecords.bestRecord.ties) : "—"}
            detail={recentRecords.bestRecord?.teamName}
          />
        </div>
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
                <tr key={r.teamId}>
                  <td className={td}>{r.rank}</td>
                  <td className={td}>{r.teamName}</td>
                  <td className={`${td} tabular-nums`}>{formatRecord(r.wins, r.losses, r.ties)}</td>
                  <td className={`${td} tabular-nums`}>{formatPct(r.winPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {recentRecords.biggestBlowout && (
          <p className="text-sm text-muted">
            Biggest blowout: {recentRecords.biggestBlowout.winnerName} beat {recentRecords.biggestBlowout.loserName}{" "}
            {recentRecords.biggestBlowout.score} in week {recentRecords.biggestBlowout.week}.
          </p>
        )}
      </Section>
    </>
  );
}
