import { monograms } from "@/components/viz/monograms";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountUp } from "@/components/CountUp";
import { InfoTip } from "@/components/InfoTip";
import { CareerPath } from "@/components/viz/CareerPath";
import { EloMini } from "@/components/viz/EloMini";
import { H2HBars } from "@/components/viz/H2HBars";
import { LuckMini } from "@/components/viz/LuckMini";
import { WeekHistogram } from "@/components/viz/WeekHistogram";
import { tt } from "@/components/viz/tt";
import { Avatar, PageTitle, Section, StatCard, TableWrap, td, th, tr } from "@/components/ui";
import { FormChips, PctBar, SeedArrow } from "@/components/TableCharts";
import { rankLabel, signed } from "@/components/draft";
import { careerFromSeasons, careerStats, managerSeasons } from "@/lib/analytics/career";
import { favouritePlayers, keepRates, managerDraftStats, reachStats } from "@/lib/analytics/draft";
import { eloRatings } from "@/lib/analytics/elo";
import { formatPct, formatRecord, ordinal, winPct } from "@/lib/analytics/format";
import { opponentRecords } from "@/lib/analytics/headToHead";
import { catPctRank, eloMini, lastWeeks, luckMini } from "@/lib/analytics/managerView";
import { MIN_SEASONS_FOR_RATES } from "@/lib/analytics/overview";
import { marginRecords } from "@/lib/analytics/records";
import { managerActivity } from "@/lib/analytics/trades";
import { careerPath, weeklyProfile } from "@/lib/analytics/weekly";
import { managerStreaks } from "@/lib/analytics/streaks";
import { careerLuck, matchupLuck } from "@/lib/analytics/whatIf";
import { getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";
import { MANAGER_TIPS } from "@/lib/explain/managers";
import { managerBadges } from "../managerBadges";

const MIN_RIVAL_GAMES = 4;

export async function generateStaticParams({ params }: { params: { league: string } }) {
  const league = await getLeague(params.league);
  if (!league) return [];
  // Only managers who actually played in this league get a page.
  const played = new Set(league.seasons.flatMap((s) => s.teams.map((t) => t.managerId)));
  return league.managers.filter((m) => played.has(m.id)).map((m) => ({ managerId: m.id }));
}

const label = (year: number) => `${year - 1}-${String(year).slice(2)}`;

export default async function ManagerPage(props: PageProps<"/[league]/managers/[managerId]">) {
  const { league: slug, managerId } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const manager = league.managers.find((m) => m.id === managerId);
  if (!manager) notFound();

  const seasons = managerSeasons(league, manager.id);
  const career = careerFromSeasons(manager.id, manager.name, seasons);
  const careers = careerStats(league);
  const finals = career.titles + career.runnerUps;
  const catPct = winPct(career.catWins, career.catLosses, career.catTies);
  const rivals = opponentRecords(league, manager.id).filter((r) => r.games >= MIN_RIVAL_GAMES);
  const allRivals = opponentRecords(league, manager.id);
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)!.name;
  const maxTeams = Math.max(...league.seasons.map((s) => s.teams.length));
  const others = careers.filter((c) => c.managerId !== manager.id).sort((a, b) => a.name.localeCompare(b.name));
  const badges = managerBadges(league).get(manager.id) ?? [];

  const path = careerPath(league, manager.id);
  const weekly = weeklyProfile(league, manager.id);
  const close = marginRecords(league).find((r) => r.managerId === manager.id);
  const wire = managerActivity(league).find((r) => r.managerId === manager.id && r.seasons);
  const elo = eloRatings(league);
  const lastRating = elo.history[manager.id]?.at(-1);
  const eloData = eloMini(league, elo, manager.id);
  const streaks = managerStreaks(league, manager.id);
  const luck = careerLuck(league).find((r) => r.managerId === manager.id);
  const luckData = luckMini(matchupLuck(league), manager.id);
  const rating = league.ratings?.rows.find((r) => r.managerId === manager.id);
  const favourites = favouritePlayers(league).filter((f) => f.managerId === manager.id);
  const reach = reachStats(league)?.rows.find((r) => r.managerId === manager.id);
  const keep = keepRates(league).rows.find((r) => r.managerId === manager.id);
  const draft = managerDraftStats(league).find((r) => r.managerId === manager.id);
  const form = lastWeeks(league, manager.id);
  const years = league.seasons.map((s) => ({ year: s.year, label: s.label }));
  const asOf = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const ratesNote = career.seasons < MIN_SEASONS_FOR_RATES ? ` Only ${career.seasons} season${career.seasons === 1 ? "" : "s"} played, so rates are a small sample.` : "";
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <>
      <Link href={`/${slug}/managers`} className="-mb-3 text-sm text-[color:var(--ink-2)] hover:text-foreground">
        ← All managers
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar size="lg" name={manager.name} initials={monograms(league.managers).get(manager.id)} />
        <div className="min-w-0">
          <PageTitle
            eyebrow="Manager profile"
            title={manager.name}
            subtitle={`${plural(career.seasons, "season")}, ${label(career.firstYear!)} to ${label(career.lastYear!)} · ${formatRecord(career.wins, career.losses, career.ties)} in weekly matchups (${formatPct(career.winPct)}). ${career.titles ? `${career.titles}× champion.` : "Still chasing a first title."}${ratesNote}`}
          />
        </div>
      </div>

      {badges.length > 0 && (
        <div className="-mt-2 flex flex-wrap gap-1.5" aria-label="Badges">
          {badges.map((b) => (
            <span key={b.name} tabIndex={0} data-tt={tt(b.name, [], b.rule)} className={`badge ${b.tone ? `badge-${b.tone}` : ""}`}>
              {b.tone === "gold" && <Trophy />}
              {b.name}
            </span>
          ))}
        </div>
      )}
      <nav className="-mt-2 flex flex-wrap gap-1.5" aria-label="Team names by season">
        {seasons.map((s) => (
          <Link key={s.year} href={`/${slug}/seasons/${s.year}`} className="pill" data-tt={tt(`${s.label}: ${s.teamName}`, [["Result", s.playoffResult]])}>
            {s.finalRank === 1 && <Trophy />}
            <span className="text-muted">{s.label}</span> {s.teamName}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Titles" value={<CountUp value={career.titles} />} detail={`${plural(finals, "final")} reached`} tip={MANAGER_TIPS.titles} />
        <StatCard
          label="Category win %"
          value={catPct === null ? "—" : <CountUp value={catPct * 100} decimals={1} suffix="%" />}
          detail={`${formatRecord(career.catWins, career.catLosses, career.catTies)} · league rank ${catPctRank(careers, manager.id)}`}
          tip={`${TIPS.catPct} The record under it is categories won-lost-tied. ${TIPS.catRecord}`}
        />
        <StatCard
          label="Average finish"
          value={career.avgFinish === null ? "—" : <CountUp value={career.avgFinish} decimals={1} />}
          detail={`best ${career.bestFinish ? ordinal(career.bestFinish) : "—"} · playoffs ${career.playoffApps}/${career.seasons}`}
          tip={TIPS.avgFinish}
        />
        <StatCard
          label="Longest win streak"
          value={streaks.win ? <CountUp value={streaks.win.length} /> : "—"}
          detail={streaks.win ? `${streaks.win.label}, weeks ${streaks.win.fromWeek}–${streaks.win.toWeek} · ${streaks.win.teamName}` : undefined}
          tip={MANAGER_TIPS.streak}
        />
      </div>

      <div className="mg-form">
        {lastRating && (
          <div className="mg-fs">
            <div className="mg-lab">
              Power rating <InfoTip box text={TIPS.power} />
            </div>
            <div className="mg-fs-row">
              <span className="mg-val">
                <CountUp value={Math.round(lastRating.rating)} />
              </span>
              <span className="mg-sub">
                {eloData.rank ? `#${eloData.rank} of ${eloData.of} now` : `after ${lastRating.label}`}
                {eloData.peak && (
                  <>
                    <br />
                    peak {eloData.peak.rating.toFixed(0)} · {eloData.peak.label} wk {eloData.peak.week}
                  </>
                )}
              </span>
            </div>
            <EloMini data={eloData} name={manager.name} />
          </div>
        )}
        {luck && (
          <div className="mg-fs">
            <div className="mg-lab">
              Matchup luck <InfoTip box text={TIPS.matchupLuck} />
            </div>
            <div className="mg-fs-row">
              <span className={`mg-val ${luck.luck >= 0 ? "text-positive" : "text-negative"}`}>{signed(luck.luck, 1)}</span>
              <span className="mg-sub">
                weeks won vs expected
                <br />
                over {plural(luck.seasons, "season")}
              </span>
            </div>
            <LuckMini data={luckData} years={years} name={manager.name} />
          </div>
        )}
        <div className="mg-fs">
          <div className="mg-lab">
            Longest losing streak <InfoTip box text={MANAGER_TIPS.streak} />
          </div>
          <div className="mg-fs-row">
            <span className="mg-val">{streaks.loss ? <CountUp value={streaks.loss.length} /> : "—"}</span>
            {streaks.loss && (
              <span className="mg-sub">
                {streaks.loss.label}, weeks {streaks.loss.fromWeek}–{streaks.loss.toWeek}
                <br />
                {streaks.loss.teamName}
              </span>
            )}
          </div>
        </div>
        <div className="mg-fs">
          <div className="mg-lab">{league.source === "yahoo" ? "Yahoo manager rating" : "Manager rating"}</div>
          <div className="mg-fs-row">
            <span className="mg-val">{rating ? <CountUp value={rating.rating} /> : "—"}</span>
            {rating && <span className={`level lv-${rating.level.toLowerCase()}`}>{rating.level}</span>}
          </div>
          <div className="mg-sub">{rating ? `#${rating.rank} in the league · as of ${asOf(league.ratings!.asOf)}` : "No rating on file for this league."}</div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Career path" tip={MANAGER_TIPS.careerPath}>
          <div className="panel space-y-2 p-5">
            <p className="text-sm text-[color:var(--ink-2)]">Final finish (filled) and regular-season seed (ring) each season.</p>
            <div className="overflow-x-auto"><div className="min-w-[420px]"><CareerPath points={path} years={league.seasons} maxTeams={maxTeams} /></div></div>
            <div className="viz-legend">
              <span><i className="dot" style={{ background: "var(--s1)" }} />Final finish</span>
              <span><i className="dot" style={{ boxShadow: "inset 0 0 0 2px var(--ink-2)" }} />Regular-season seed</span>
              <span><i className="dot" style={{ background: "var(--gold)" }} />Title</span>
              <span><i className="line" style={{ background: "var(--pos)" }} />Beat the seed</span>
              <span><i className="line" style={{ background: "var(--neg)" }} />Fell below it</span>
            </div>
          </div>
        </Section>
        <Section title="A typical week" tip={MANAGER_TIPS.avgCats}>
          <div className="panel space-y-2 p-5">
            <p className="text-sm text-[color:var(--ink-2)]">
              How many of the {weekly.dist.length - 1} categories they won each week, against the league&apos;s average week.
            </p>
            <div className="overflow-x-auto"><div className="min-w-[420px]"><WeekHistogram dist={weekly.dist} leagueDist={weekly.leagueDist} name={manager.name} /></div></div>
            <div className="viz-legend">
              <span><i style={{ background: "var(--s1)" }} />{manager.name}</span>
              <span><i className="line" style={{ background: "var(--foreground)" }} />League average</span>
              <span>
                {weekly.avgCats.toFixed(2)} categories a week · {plural(weekly.sweeps, "sweep")} ({weekly.dist.length - 1}-0)
                <InfoTip text={MANAGER_TIPS.sweep} />
              </span>
            </div>
          </div>
        </Section>
      </div>

      <Section
        title="Head-to-head vs everyone"
        tip={MANAGER_TIPS.h2h}
        aside={<Link href={`/${slug}/rivalries`} className="text-sm text-accent hover:underline">Compare any two managers →</Link>}
      >
        {allRivals.length === 0 ? (
          <p className="text-sm text-muted">No head-to-head history yet.</p>
        ) : (
          <div className="panel space-y-3 p-5">
            <p className="text-sm text-[color:var(--ink-2)]">
              Matchup record against each opponent, regular season and playoffs. Right of center = a winning record. Click a row to open the rivalry.
            </p>
            <H2HBars rows={allRivals} name={manager.name} nameOf={nameOf} href={`/${slug}/rivalries#a=${manager.id}`} />
            {rivals.length > 0 && (
              <p className="text-xs text-muted">
                Best: {nameOf([...rivals].sort((a, b) => b.winPct - a.winPct)[0].opponentId)}; toughest:{" "}
                {nameOf([...rivals].sort((a, b) => a.winPct - b.winPct)[0].opponentId)} ({MIN_RIVAL_GAMES}+ meetings).
              </p>
            )}
          </div>
        )}
      </Section>

      <div className="grid gap-3 lg:grid-cols-3">
        <Section title="Draft habits" tip={TIPS.draftValue}>
          <div className="panel px-5 py-1">
            {draft || reach || keep || favourites.length ? (
              <ul className="mg-list">
                {reach && (
                  <Row
                    t1={<>Drafts ahead of the rankings <InfoTip text={TIPS.reaching} /></>}
                    t2={`${formatPct(reach.reachShare, 0)} of picks are 15+ spot reaches`}
                    v={<>{signed(reach.avgEarly, 1)} <small>spots</small></>}
                  />
                )}
                {keep && (
                  <Row
                    t1={<>Keeps their picks <InfoTip text={TIPS.picksKept} /></>}
                    t2="still rostered at season end"
                    v={<>{keep.avgKept.toFixed(1)} <small>per draft ({formatPct(keep.keptShare, 0)})</small></>}
                  />
                )}
                {favourites.slice(0, 2).map((f, i) => (
                  <Row
                    key={f.playerId}
                    t1={`${i === 0 ? "Can't quit" : "Also loves"}: ${f.playerName}`}
                    t2={`drafted in ${f.picks.length} seasons`}
                    v={<small>{f.picks.map((p) => `'${String(p.year - 1).slice(2)}`).join(" ")}</small>}
                  />
                ))}
                {draft && (
                  <>
                    <Row
                      t1={<>Value vs league <InfoTip text={TIPS.draftVsAvg} /></>}
                      t2={`${plural(draft.drafts, "draft")} · ${draft.picks} picks`}
                      v={<span className={draft.vsLeague >= 0 ? "text-positive" : "text-negative"}>{signed(draft.vsLeague, 1)}</span>}
                    />
                    <Row t1={<>Hit rate <InfoTip text={TIPS.hitRate} /></>} t2="picks that beat their slot" v={formatPct(draft.hitRate, 0)} />
                    <Row
                      t1={`Best pick: ${draft.best.playerName}`}
                      t2={`${draft.best.label} · #${draft.best.overall} overall → ${rankLabel(draft.best.actualRank)}`}
                      v={<span className="text-positive">{signed(draft.best.value, 1)}</span>}
                    />
                    <Row
                      t1={`Ouch: ${draft.worst.playerName}`}
                      t2={`${draft.worst.label} · #${draft.worst.overall} overall → ${rankLabel(draft.worst.actualRank)}`}
                      v={<span className="text-negative">{signed(draft.worst.value, 1)}</span>}
                    />
                  </>
                )}
              </ul>
            ) : (
              <p className="py-3 text-sm text-muted">No draft data.</p>
            )}
          </div>
        </Section>
        <Section title="On the wire & in trades" tip={TIPS.netTrade}>
          <div className="panel px-5 py-1">
            {wire ? (
              <ul className="mg-list">
                <Row t1="Moves per season" t2={`${wire.moves} adds and drops in all`} v={wire.movesPerSeason.toFixed(0)} />
                <Row t1="Trades" t2={wire.vetoed ? `${wire.vetoed} more vetoed` : "none vetoed"} v={wire.trades ? <>{wire.trades} <small>({wire.tradeWins}-{wire.tradeLosses})</small></> : "0"} />
                <Row
                  t1="Net trade value"
                  t2="received minus given"
                  v={<span className={wire.netValue > 0 ? "text-positive" : wire.netValue < 0 ? "text-negative" : ""}>{wire.trades ? signed(wire.netValue, 1) : "—"}</span>}
                />
                <Row t1="Favorite partner" t2="most trades with" v={wire.favoritePartner ? `${nameOf(wire.favoritePartner.managerId)} (${wire.favoritePartner.count})` : "—"} />
              </ul>
            ) : (
              <p className="py-3 text-sm text-muted">No activity data.</p>
            )}
          </div>
        </Section>
        <Section title="Close calls" tip={TIPS.closeGames}>
          <div className="panel px-5 py-1">
            <ul className="mg-list">
              {close && (
                <>
                  <Row t1="One-category wins" t2="decided by a single category, playoffs included" v={<span className="text-positive">{close.closeWins}</span>} />
                  <Row t1="One-category losses" t2="so close" v={<span className="text-negative">{close.closeLosses}</span>} />
                  <Row t1="Blowouts" t2="won or lost by 7+ categories" v={`${close.blowoutWins}-${close.blowoutLosses}`} />
                </>
              )}
              <Row t1="Swept" t2="lost every category to an opponent" v={weekly.swept} />
              <Row t1="Categories per week" t2={`${weekly.weeks} weeks`} v={weekly.avgCats.toFixed(2)} />
            </ul>
          </div>
        </Section>
      </div>

      <Section title="Season by season">
        <TableWrap>
          <table className="w-full text-sm">
            <caption className="sr-only">{manager.name} season-by-season results</caption>
            <thead>
              <tr>
                <th className={th}>Season</th>
                <th className={th}>Team</th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    Cat. win % <InfoTip text={TIPS.catPct} />
                  </span>
                </th>
                <th className={th}>Matchups W-L-T</th>
                <th className={th}>Category W-L-T</th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1.5">
                    Seed → final <InfoTip text={TIPS.vsSeed} />
                  </span>
                </th>
                <th className={th}>Last 5 weeks</th>
                <th className={th}>Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...seasons].reverse().map((s) => {
                const p = winPct(s.catWins, s.catLosses, s.catTies);
                return (
                  <tr key={s.year} className={tr}>
                    <td className={td}>
                      <Link href={`/${slug}/seasons/${s.year}`} className="font-semibold text-accent hover:underline">
                        {s.label}
                      </Link>
                    </td>
                    <td className={td}>{s.teamName}</td>
                    <td className={td}>
                      <PctBar p={p} />
                    </td>
                    <td className={td}>{formatRecord(s.wins, s.losses, s.ties)}</td>
                    <td className={td}>{formatRecord(s.catWins, s.catLosses, s.catTies)}</td>
                    <td className={td}>
                      <SeedArrow seed={s.regularRank} final={s.finalRank} title={s.label} />
                    </td>
                    <td className={td}>
                      <FormChips games={form[s.year] ?? []} base={`/${slug}`} year={s.year} />
                    </td>
                    <td className={td}>
                      {s.finalRank === 1 ? (
                        <span className="badge badge-gold">
                          <Trophy />
                          Champion
                        </span>
                      ) : (
                        s.playoffResult
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <nav className="flex flex-wrap gap-1.5" aria-label="Other managers">
        {others.map((o) => (
          <Link key={o.managerId} href={`/${slug}/managers/${o.managerId}`} className="pill">
            {o.name}
          </Link>
        ))}
      </nav>
    </>
  );
}

function Row({ t1, t2, v }: { t1: React.ReactNode; t2: string; v: React.ReactNode }) {
  return (
    <li>
      <div className="min-w-0 flex-1">
        <div className="mg-t1">{t1}</div>
        <div className="mg-t2">{t2}</div>
      </div>
      <div className="mg-rv">{v}</div>
    </li>
  );
}

function Trophy() {
  return (
    <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}
