import Link from "next/link";
import { notFound } from "next/navigation";
import { signed } from "@/components/draft";
import { Avatar, Card, ManagerLink, PageTitle, Section, TableWrap, td, th, tr } from "@/components/ui";
import { formatNumber, formatPct, winPct } from "@/lib/analytics/format";
import {
  consistency,
  marginRecords,
  playoffRecords,
  schedules,
  teamSeasons,
  titleDroughts,
  type TeamSeasonRow,
} from "@/lib/analytics/records";
import { colorForManager } from "@/lib/colors";
import { getLeague } from "@/lib/data";

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
  const sched = schedules(league);
  const pctLabel = league.seasons.some((s) => s.scoring === "categories") ? "category win %" : "win %";


  return (
    <>
      <PageTitle
        eyebrow="Records"
        title="Clutch, chokes and dynasties"
        subtitle="Playoff over- and under-achievers, title droughts, close games, the best and worst seasons ever, and who had it easy."
      />

      <Section title="Playoff performers">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">Playoff results compared with regular-season seed</caption>
            <thead>
              <tr>
                <th className={th}>Manager</th>
                <th className={th}>Playoffs</th>
                <th className={th}>Avg seed</th>
                <th className={th}>Avg finish</th>
                <th className={th}>vs seed</th>
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
          vs seed = average places gained (+) or lost (−) between regular-season seed and final finish, in seasons they made the playoffs.
        </p>
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
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

        <Section title="Clutch: one-category games">
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

      <div className="grid gap-3 lg:grid-cols-2">
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

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Consistency">
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">How much each manager&apos;s finish varies from year to year</caption>
              <thead>
                <tr>
                  <th className={th}>Manager</th>
                  <th className={th}>Seasons</th>
                  <th className={th}>Typical finish</th>
                  <th className={th}>Swing</th>
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

        <Section title="Strength of schedule">
          <Card className="space-y-4">
            {[
              { title: "Toughest schedules", rows: sched.slice(0, 5) },
              { title: "Easiest schedules", rows: [...sched].reverse().slice(0, 5) },
            ].map((g) => (
              <div key={g.title}>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{g.title}</h3>
                <ol className="divide-y divide-border">
                  {g.rows.map((r) => (
                    <li key={`${r.year}-${r.managerId}`} className="flex justify-between gap-3 py-1.5 text-sm">
                      <span className="min-w-0 truncate">
                        {r.teamName} <span className="text-muted">· {nameOf(r.managerId)}, {r.label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums">{formatPct(r.oppPct)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <p className="text-xs text-muted">Average regular-season {pctLabel} of the opponents each team actually played.</p>
          </Card>
        </Section>
      </div>
    </>
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
