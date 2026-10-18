import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoTip } from "@/components/InfoTip";
import { FormChips, PctBar } from "@/components/TableCharts";
import { Avatar, ManagerLink, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { monograms } from "@/components/viz/monograms";
import { WeekStrip } from "@/components/WeekStrip";
import { ordinal } from "@/lib/analytics/format";
import { STAGE_NAME, seasonWeeks, weekView, type WeekGame, type WeekSide } from "@/lib/analytics/weeksView";
import { getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";
import { WEEK_TIPS } from "@/lib/explain/weeks";

// The league layout supplies `league`; the season page's params live in a sibling page, so this lists year × week itself.
export async function generateStaticParams({ params }: { params: { league: string } }) {
  const league = await getLeague(params.league);
  if (!league) return [];
  return league.seasons.flatMap((s) => seasonWeeks(s).map((w) => ({ year: String(s.year), week: String(w.week) })));
}

export async function generateMetadata(props: PageProps<"/[league]/seasons/[year]/week/[week]">): Promise<Metadata> {
  const { league: slug, year, week } = await props.params;
  const season = (await getLeague(slug))?.seasons.find((s) => String(s.year) === year);
  return { title: season ? `Week ${week}, ${season.label}` : `Week ${week}` };
}

/** "7-2", with the tied categories as a third number when there were any ("4-4-1"). */
const score = (g: WeekGame, ties = true) => `${Math.max(g.home.cats, g.away.cats)}-${Math.min(g.home.cats, g.away.cats)}${ties && g.tiedCats ? `-${g.tiedCats}` : ""}`;

export default async function WeekPage(props: PageProps<"/[league]/seasons/[year]/week/[week]">) {
  const { league: slug, year, week } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const season = league.seasons.find((s) => String(s.year) === year);
  if (!season) notFound();
  const v = weekView(season, Number(week));
  if (!v) notFound();

  const base = `/${slug}`;
  const mono = monograms(league.managers);
  const managerName = (id: string) => league.managers.find((m) => m.id === id)!.name;
  const cats = season.categories.length;
  const winnerOf = (g: WeekGame) => (g.winnerTeamId === g.home.teamId ? g.home : g.away);
  const loserOf = (g: WeekGame) => (g.winnerTeamId === g.home.teamId ? g.away : g.home);
  // Place going into the week (regular season) or playoff seed.
  const rk = (s: WeekSide) => (s.rankBefore === null ? "" : v.playoff ? `#${s.rankBefore}` : ordinal(s.rankBefore));
  const weekHref = (w: number) => `${base}/seasons/${season.year}/week/${w}`;
  const stageLabel = (w: number) => (v.weeks.find((x) => x.week === w)!.playoff ? `Week ${w} (playoffs)` : `Week ${w}`);

  return (
    <>
      <div>
        <div className="eyebrow-accent wk-eyebrow">
          <Link href={`${base}/seasons/${season.year}`}>{season.label}</Link> · {STAGE_NAME[v.stage]}
        </div>
        <div className="wk-head">
          <h1 className="title-display">Week {v.week}</h1>
          <nav className="wk-nav" aria-label="Previous and next week">
            {v.prev !== null ? (
              <Link className="wk-btn" href={weekHref(v.prev)} aria-label={`Previous: ${stageLabel(v.prev)}`}>
                ← Week {v.prev}
              </Link>
            ) : (
              <span className="wk-btn" aria-disabled="true">
                ← Week
              </span>
            )}
            {v.next !== null ? (
              <Link className="wk-btn" href={weekHref(v.next)} aria-label={`Next: ${stageLabel(v.next)}`}>
                Week {v.next} →
              </Link>
            ) : (
              <span className="wk-btn" aria-disabled="true">
                Week →
              </span>
            )}
          </nav>
        </div>
      </div>

      <WeekStrip weeks={v.weeks} base={base} year={season.year} current={v.week} label={`${season.label} weeks`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Biggest blowout"
          value={v.blowout ? score(v.blowout, false) : "—"}
          detail={v.blowout ? `${winnerOf(v.blowout).teamName} over ${loserOf(v.blowout).teamName}` : "Every matchup was tied"}
          tip={WEEK_TIPS.blowout}
        />
        <StatCard
          label="Closest"
          value={v.closest ? score(v.closest) : "—"}
          detail={v.closest ? `${v.closest.home.teamName} vs ${v.closest.away.teamName}` : undefined}
          tip={WEEK_TIPS.closest}
        />
        <StatCard
          label="Upset of the week"
          value={v.upset ? `${rk(winnerOf(v.upset))} over ${rk(loserOf(v.upset))}` : "—"}
          detail={
            v.upset
              ? `${winnerOf(v.upset).teamName} beat ${loserOf(v.upset).teamName}`
              : v.hasRanksBefore
                ? `The ${v.playoff ? "higher seed" : "higher-ranked team"} won every matchup`
                : "No standings yet in the first week"
          }
          tip={WEEK_TIPS.upset}
        />
        <StatCard
          label="Categories tied"
          value={v.tiedCats}
          detail={`${v.tiedGames} of ${v.games.length} matchup${v.games.length === 1 ? "" : "s"} had a tie`}
          tip={WEEK_TIPS.tied}
        />
      </div>

      <Section title="Scoreboard" tip={WEEK_TIPS.scoreboard}>
        <div className="wk-scoreboard">
          {v.games.map((g, i) => {
            const hiC = Math.max(g.home.cats, g.away.cats);
            const loC = Math.min(g.home.cats, g.away.cats);
            const tags: { t: string; cls: string }[] = [];
            if (g.stage !== "regular") tags.push({ t: STAGE_NAME[g.stage], cls: g.stage === "final" ? "badge-gold" : "" });
            if (g.sweep) tags.push({ t: "Sweep", cls: "badge-gold" });
            if (g.coinFlip) tags.push({ t: "Coin flip", cls: "" });
            if (g.upset) tags.push({ t: "Upset", cls: "badge-orange" });
            if (g.winnerTeamId === null) tags.push({ t: "Tie", cls: "" });
            return (
              <article key={`${g.home.teamId}-${g.away.teamId}`} className="game2" style={{ animationDelay: `${i * 40}ms` }} aria-label={`${g.home.teamName} ${g.home.cats}, ${g.away.teamName} ${g.away.cats}`}>
                {tags.length > 0 && (
                  <div className="g2-tags">
                    {tags.map((t) => (
                      <span key={t.t} className={`badge ${t.cls}`}>
                        {t.t}
                      </span>
                    ))}
                  </div>
                )}
                {[g.home, g.away].map((s) => (
                  <div key={s.teamId} className={`g2-side ${g.winnerTeamId === s.teamId ? "w" : g.winnerTeamId ? "l" : ""}`} data-m={s.managerId}>
                    <span className="g2-rk">{rk(s)}</span>
                    <Link className="g2-who" href={`${base}/managers/${s.managerId}`}>
                      <Avatar size="sm" name={managerName(s.managerId)} initials={mono.get(s.managerId)} />
                      <span className="nm">
                        <b>{s.teamName}</b> <span className="mg">{managerName(s.managerId)}</span>
                      </span>
                    </Link>
                    <span className="g2-c">{s.cats}</span>
                  </div>
                ))}
                <div className="g2-bar" role="img" aria-label={`${hiC} to ${loC}${g.tiedCats ? `, ${g.tiedCats} tied` : ""}`} style={{ ["--cats" as string]: cats }}>
                  {Array.from({ length: hiC }, (_, k) => (
                    <i key={`h${k}`} className="h" />
                  ))}
                  {Array.from({ length: g.tiedCats }, (_, k) => (
                    <i key={`t${k}`} className="t" />
                  ))}
                  {Array.from({ length: loC }, (_, k) => (
                    <i key={`a${k}`} className="a" />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      {v.standings ? (
        <Section title={`Standings after week ${v.week}`} tip={WEEK_TIPS.standings}>
          <TableWrap>
            <table className="w-full text-sm">
              <caption className="sr-only">
                {season.label} standings after week {v.week}
              </caption>
              <thead>
                <tr>
                  <th className={th}>Place</th>
                  <th className={th}>Move</th>
                  <th className={th}>Team</th>
                  <th className={th}>Manager</th>
                  <th className={th}>
                    <span className="inline-flex items-center gap-1.5">
                      {v.method === "categories" ? "Category win %" : "Win %"} <InfoTip down text={v.method === "categories" ? TIPS.catPct : TIPS.winPct} />
                    </span>
                  </th>
                  <th className={th}>Last 5 weeks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {v.standings.map((r) => (
                  <tr key={r.teamId} data-m={r.managerId} className={`${tr} ${r.rank === v.spots && v.spots < v.standings!.length ? "cutline" : ""}`}>
                    <td className={`${td} font-bold`}>{r.rank}</td>
                    <td className={td}>
                      {r.move === null || r.move === 0 ? (
                        <span className="wk-move flat" aria-label="No change">
                          –
                        </span>
                      ) : (
                        <span className={`wk-move ${r.move > 0 ? "up" : "down"}`} aria-label={`${r.move > 0 ? "Up" : "Down"} ${Math.abs(r.move)}`}>
                          {r.move > 0 ? "▲" : "▼"}
                          {Math.abs(r.move)}
                        </span>
                      )}
                    </td>
                    <td className={`${td} font-semibold`}>{r.teamName}</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-2">
                        <Avatar size="sm" name={managerName(r.managerId)} initials={mono.get(r.managerId)} />
                        <ManagerLink id={r.managerId} name={managerName(r.managerId)} />
                      </span>
                    </td>
                    <td className={td}>
                      <PctBar p={r.pct} />
                    </td>
                    <td className={td}>
                      <FormChips games={r.form} base={base} year={season.year} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Section>
      ) : (
        <p className="wk-callout">
          Playoff week: {STAGE_NAME[v.stage].toLowerCase()}.{" "}
          <Link href={`${base}/seasons/${season.year}#bracket`}>See the bracket on the season page →</Link>
        </p>
      )}
    </>
  );
}
