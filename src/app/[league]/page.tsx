import { Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ManagerTrend } from "@/components/charts/ManagerTrend";
import { AllTimeRace } from "@/components/viz/AllTimeRace";
import { Avatar, Card, ManagerLink, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { careerStats, defaultCompare, managerSeasons } from "@/lib/analytics/career";
import { formatRecord, ordinal } from "@/lib/analytics/format";
import { championHistory, leagueSummary, seasonRecords } from "@/lib/analytics/overview";
import { sweeps } from "@/lib/analytics/scorelines";
import { seasonOutcome } from "@/lib/analytics/season";
import { longestStreaks } from "@/lib/analytics/streaks";
import { allTimeRace } from "@/lib/analytics/weekly";
import { getLeague } from "@/lib/data";

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

  // Everyone who ever played, in league order; chart colors follow the order they're picked.
  const managerOptions = careers.map((c) => ({ id: c.managerId, name: c.name }));
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

  // Bragging rights: 9-0 weeks and categories won per week.
  const sweepCounts = new Map<string, number>();
  for (const s of sweeps(league)) sweepCounts.set(s.winnerManagerId, (sweepCounts.get(s.winnerManagerId) ?? 0) + 1);
  const [sweepKing] = [...sweepCounts.entries()].sort((a, b) => b[1] - a[1]);
  const perWeek = careers
    .filter((c) => c.seasons >= 3 && c.wins + c.losses + c.ties > 0)
    .map((c) => ({ c, avg: c.catWins / (c.wins + c.losses + c.ties), weeks: c.wins + c.losses + c.ties }))
    .sort((a, b) => b.avg - a.avg)[0];

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
                  {nameOf(reigning.championManagerId).slice(0, 2).toUpperCase()}
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
          <StatCard label="Most titles" value={summary.mostTitles.count} detail={`${summary.mostTitles.rows.map((r) => r.name).join(", ")}${summary.mostTitles.rows.length > 1 ? " (tied)" : ""}`} />
          <StatCard label="Longest win streak" value={hot?.length ?? "—"} detail={hot && `${nameOf(hot.managerId)} · ${hot.label}, weeks ${hot.fromWeek}–${hot.toWeek}`} />
          <StatCard label="Seasons" value={summary.seasons} detail={`${league.seasons[0].label} to ${recent.label}`} />
          <StatCard label="Matchups played" value={summary.completedMatchups.toLocaleString()} detail="weekly head-to-heads, playoffs included" />
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

      <Section title="The all-time race">
        <p className="-mt-1 text-sm text-[color:var(--ink-2)]">
          Watch the all-time standings take shape, season by season. Category wins are regular-season categories won; podiums are top-3 finishes.
        </p>
        <Card className="p-5">
          <AllTimeRace frames={allTimeRace(league).map(({ label, rows }) => ({ label, rows }))} names={Object.fromEntries(league.managers.map((m) => [m.id, m.name]))} />
        </Card>
      </Section>

      <Section title="Where everyone finished">
        <Card className="p-5">
          <ManagerTrend
            managers={managerOptions}
            finishRows={finishRows}
            winPctRows={winPctRows}
            initialSelected={[...new Set([reigning.championManagerId, ...ranked.map((c) => c.managerId)].filter((x): x is string => !!x))].slice(0, 2)}
            teamCount={maxTeams}
          />
        </Card>
      </Section>

      <Section title="Bragging rights">
        <p className="-mt-1 text-sm text-[color:var(--ink-2)]">The streaks and weeks people still bring up in the group chat.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            hot && { k: "Hottest streak", v: String(hot.length), unit: "straight wins", who: hot.managerId, d: `${hot.teamName}, ${hot.label}, weeks ${hot.fromWeek}–${hot.toWeek}` },
            cold && { k: "Coldest streak", v: String(cold.length), unit: "straight losses", who: cold.managerId, d: `${cold.teamName}, ${cold.label}, weeks ${cold.fromWeek}–${cold.toWeek}` },
            sweepKing && { k: "9-0 sweeps", v: String(sweepKing[1]), unit: sweepKing[1] === 1 ? "perfect week" : "perfect weeks", who: sweepKing[0], d: "most in league history" },
            perWeek && { k: "Categories per week", v: perWeek.avg.toFixed(2), unit: `of ${recent.categories.length || 9}`, who: perWeek.c.managerId, d: `best average, ${perWeek.weeks} weeks` },
          ]
            .filter((x): x is { k: string; v: string; unit: string; who: string; d: string } => !!x)
            .map((r) => (
              <div key={r.k} className="panel rec p-4">
                <div className="rec-k">{r.k}</div>
                <div className="rec-v">
                  {r.v}
                  <small>{r.unit}</small>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[13.5px] text-[color:var(--ink-2)]">
                  <Avatar size="sm" name={nameOf(r.who)} />
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
                  <tr key={r.teamId} className={tr}>
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
