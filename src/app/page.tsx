import Link from "next/link";
import { ArrowRight, Ban, BookOpen, Check, Eye, KeyRound, LockKeyhole, ShieldCheck, Trophy } from "lucide-react";
import { SeasonExplorer } from "@/components/SeasonExplorer";
import { SiteFooter } from "@/components/SiteFooter";
import { ChartTooltip } from "@/components/viz/ChartTooltip";
import { HealthHeat } from "@/components/viz/HealthHeat";
import { AllTimeRace } from "@/components/viz/AllTimeRace";
import { tt } from "@/components/viz/tt";
import { seasonAwards } from "@/lib/analytics/awards";
import { leaguePicks, topSteals } from "@/lib/analytics/draft";
import { goatScores } from "@/lib/analytics/goat";
import { rivalryPairs } from "@/lib/analytics/headToHead";
import { healthGrid, managerHealth, pickHealth } from "@/lib/analytics/injuryView";
import { championHistory, leagueSummary } from "@/lib/analytics/overview";
import { allTimeRace } from "@/lib/analytics/weekly";
import { SITE_NAME } from "@/lib/config";
import { getLeague } from "@/lib/data";

/** What the Yahoo connection will read, all read-only (see docs/YAHOO.md). */
const READS = [
  ["League settings", "categories, playoff format, every past season"],
  ["Teams and managers", "team names and who ran them, season to season"],
  ["Weekly matchups", "category results for every head-to-head"],
  ["Standings", "to check the standings we work out ourselves"],
  ["Draft results", "who picked whom, and where"],
  ["Transactions", "trades, adds and drops"],
  ["Player season stats", "to grade picks and trades"],
] as const;

export default async function Home() {
  const league = (await getLeague("demo"))!;
  const summary = leagueSummary(league);
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  const champions = championHistory(league).filter((c) => c.championManagerId);
  const stories = champions.map((s) => ({
    year: s.year,
    label: s.label,
    team: s.championTeamName!,
    manager: nameOf(s.championManagerId!),
    runnerUp: s.runnerUpTeamName ?? "Not recorded",
  }));
  const goat = goatScores(league).slice(0, 5);
  const rivalry = [...rivalryPairs(league)].sort((x, y) => y.games - x.games)[0];
  const latest = league.seasons.at(-1)!;
  const awards = seasonAwards(league, latest).filter((a) => a.winners.length).slice(0, 4);
  const steals = topSteals(leaguePicks(league), 3);
  const health = pickHealth(league);
  const healthSummary = managerHealth(health);
  const grid = healthGrid(health);
  const heatManagers = healthSummary.rows.filter((r) => r.ranked).map((r) => r.managerId);
  const names = Object.fromEntries(league.managers.map((m) => [m.id, m.name]));

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="band home-top">
        <div className="band-wrap home-band">
          <Link href="/" className="band-brand" aria-label={`${SITE_NAME}, home`}>
            <span className="band-brand-mark" aria-hidden>
              <svg viewBox="0 0 34 34" width="34" height="34" fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="1.6">
                <circle cx="17" cy="17" r="16" />
                <path d="M17 1v32M1 17h32M5.5 5.5c6 6 6 17 0 23M28.5 5.5c-6 6-6 17 0 23" />
              </svg>
            </span>
            <span className="band-brand-name">{SITE_NAME}</span>
          </Link>
          <nav className="band-tabs" aria-label="Main">
            <Link href="/demo">Demo league</Link>
            <a href="#tour">What&apos;s inside</a>
            <a href="#yahoo">How Yahoo works</a>
            <Link href="/caboclo" className="inline-flex items-center gap-1.5">
              <LockKeyhole size={13} aria-hidden />
              Members
            </Link>
          </nav>
        </div>
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <div className="home-eyebrow">Yahoo Fantasy Basketball · league history</div>
            <h1 id="home-title">
              Every season.
              <br />
              Every rivalry.
              <br />
              <span>Remembered.</span>
            </h1>
            <p>
              The season ends; the arguments don&apos;t. {SITE_NAME} turns your league&apos;s whole Yahoo history into a record book: champions, rivalries,
              drafts, trades and the weeks nobody has forgotten.
            </p>
            <div className="home-ctas">
              <Link href="/demo" className="button-primary">
                Explore the demo league <ArrowRight size={17} aria-hidden />
              </Link>
              <a href="#yahoo" className="home-ghost">
                How the Yahoo connection works
              </a>
            </div>
            <p className="home-note">
              <Check size={14} aria-hidden /> No sign-up to explore. The demo league is fictional: every manager, team and player is invented.
            </p>
          </div>
          <div className="home-hero-rafters" aria-label="Demo league champions">
            <div className="rafters">
              <div className="banners">
                {champions.slice(-4).map((c, i, xs) => (
                  <Link key={c.year} href={`/demo/seasons/${c.year}`} className={`banner ${i === xs.length - 1 ? "latest" : ""}`}>
                    <span className="champ-word">Champions</span>
                    <span className="yr">{c.label}</span>
                    <Trophy className="tr" aria-hidden />
                    <span className="tm">{c.championTeamName}</span>
                    <span className="mg">{nameOf(c.championManagerId!)}</span>
                  </Link>
                ))}
              </div>
            </div>
            <p className="home-caption">Banners in the rafters, from the demo league</p>
          </div>
        </section>
      </header>

      <main id="main-content" className="home-main">
        <section className="home-stats" aria-label="Demo league at a glance">
          {[
            [summary.seasons, "seasons"],
            [summary.managers, "managers"],
            [summary.completedMatchups.toLocaleString(), "matchups"],
            [league.seasons.reduce((a, s) => a + (s.draft?.length ?? 0), 0).toLocaleString(), "draft picks graded"],
          ].map(([v, k]) => (
            <div key={k} className="tile">
              <div className="tile-val tabular-nums">{v}</div>
              <div className="text-[13px] text-muted">{k} in the demo</div>
            </div>
          ))}
        </section>

        <section id="tour" className="home-block" aria-labelledby="tour-title">
          <div className="home-head">
            <div>
              <div className="home-kicker">What&apos;s inside</div>
              <h2 id="tour-title">A record book that does the arguing for you</h2>
            </div>
            <p>Every preview below is live, built from the demo league. Click through to see the full page.</p>
          </div>

          <div className="home-tour">
            <article className="panel home-card wide">
              <header>
                <h3>The all-time race</h3>
                <p>Scrub through the seasons and watch the all-time standings take shape.</p>
              </header>
              <AllTimeRace frames={allTimeRace(league).map(({ label, rows }) => ({ label, rows }))} names={names} />
              <Link href="/demo" className="home-more">
                League overview <ArrowRight size={14} aria-hidden />
              </Link>
            </article>

            <article className="panel home-card">
              <header>
                <h3>Settle the GOAT debate</h3>
                <p>One score from titles, finishes, category wins and playoff runs.</p>
              </header>
              <ol className="home-goat">
                {goat.map((g, i) => (
                  <li key={g.managerId} data-tt={tt(g.name, [["GOAT score", g.score.toFixed(1)]], "0-100, where 50 = an average manager. The demo leaderboard shows the full recipe.")}>
                    <span className="n">{i + 1}</span>
                    <span className="nm">{g.name}</span>
                    <span className="bar" aria-hidden>
                      <span style={{ width: `${g.score}%` }} />
                    </span>
                    <b className="tabular-nums">{g.score.toFixed(0)}</b>
                  </li>
                ))}
              </ol>
              <Link href="/demo/leaderboard" className="home-more">
                Leaderboard <ArrowRight size={14} aria-hidden />
              </Link>
            </article>

            {rivalry && (
              <article className="panel home-card">
                <header>
                  <h3>Rivalries, settled</h3>
                  <p>Pick any two managers and see every week they played each other.</p>
                </header>
                <div className="home-rival">
                  <div>
                    <b>{nameOf(rivalry.a)}</b>
                    <span className="tabular-nums">{rivalry.wins}</span>
                  </div>
                  <span className="vs">vs</span>
                  <div>
                    <b>{nameOf(rivalry.b)}</b>
                    <span className="tabular-nums">{rivalry.losses}</span>
                  </div>
                </div>
                <div className="home-tug" aria-hidden>
                  <span style={{ width: `${rivalry.pct * 100}%` }} />
                </div>
                <p className="text-[13px] text-muted">
                  The league&apos;s most-played rivalry: {rivalry.games} meetings{rivalry.ties ? `, ${rivalry.ties} tied` : ""}
                  {rivalry.playoffMeetings ? `, ${rivalry.playoffMeetings} in the playoffs` : ""}.
                </p>
                <Link href={`/demo/rivalries#a=${rivalry.a}&b=${rivalry.b}`} className="home-more">
                  Rivalries <ArrowRight size={14} aria-hidden />
                </Link>
              </article>
            )}

            <article className="panel home-card">
              <header>
                <h3>Grade every draft</h3>
                <p>Every pick against its slot: steals, busts, reaches and the ones that got away.</p>
              </header>
              <ul className="home-list">
                {steals.map((p) => (
                  <li key={`${p.year}-${p.overall}`}>
                    <span>
                      <b>{p.playerName}</b>
                      <small>
                        {p.label} · Rd {p.round} · {nameOf(p.managerId)}
                      </small>
                    </span>
                    <span className="text-right">
                      <b className="dr-pos">#{p.overall} → #{p.actualRank}</b>
                      <small>pick → finish</small>
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/demo/draft" className="home-more">
                Draft history <ArrowRight size={14} aria-hidden />
              </Link>
            </article>

            <article className="panel home-card">
              <header>
                <h3>Awards, by the numbers</h3>
                <p>No votes: every award is picked by a fixed rule, and each one says how.</p>
              </header>
              <ul className="home-list">
                {awards.map((a) => (
                  <li key={a.title}>
                    <span>
                      <b>{a.title}</b>
                      <small>{a.winners.map(nameOf).join(", ")}</small>
                    </span>
                    <span className="text-right tabular-nums">
                      <b>{a.value}</b>
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={`/demo/awards/${latest.year}`} className="home-more">
                {latest.label} awards <ArrowRight size={14} aria-hidden />
              </Link>
            </article>

            <article className="panel home-card wide">
              <header>
                <h3>Injury luck</h3>
                <p>Whose early picks got hurt and whose played all 82, draft by draft. Hover a square for the players.</p>
              </header>
              <HealthHeat managers={heatManagers} years={grid.years} cell={grid.cell} league={healthSummary.leagueEarly} managerName={nameOf} />
              <Link href="/demo/injuries" className="home-more">
                Injury luck <ArrowRight size={14} aria-hidden />
              </Link>
            </article>
          </div>

          <ul className="home-also">
            {[
              ["Seasons", "/demo/seasons", "standings races, playoff brackets, what-if tables"],
              ["Managers", "/demo/managers", "career paths, streaks, luck and habits"],
              ["Records", "/demo/records", "upsets, droughts, sweeps and clutch weeks"],
              ["Trades & moves", "/demo/trades", "who won every trade, after the fact"],
            ].map(([k, href, d]) => (
              <li key={k}>
                <Link href={href}>
                  <b>{k}</b> <span>{d}</span> <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="yahoo" className="home-block" aria-labelledby="yahoo-title">
          <div className="home-head">
            <div>
              <div className="home-kicker">How it will work</div>
              <h2 id="yahoo-title">Read-only. Your league only.</h2>
            </div>
            <p>
              Connecting a real league is waiting on Yahoo&apos;s approval for API access. Here is exactly what it will do once it&apos;s on.
            </p>
          </div>
          <ol className="home-steps">
            <li className="panel">
              <KeyRound aria-hidden />
              <b>1. Sign in with Yahoo</b>
              <span>Yahoo&apos;s own OAuth sign-in, read-only access. We never see your password.</span>
            </li>
            <li className="panel">
              <BookOpen aria-hidden />
              <b>2. Pick your league</b>
              <span>Only leagues you belong to. We follow it back through every season Yahoo has.</span>
            </li>
            <li className="panel">
              <Trophy aria-hidden />
              <b>3. Your history, built</b>
              <span>The same pages as the demo, for your league, visible only to its members.</span>
            </li>
          </ol>
          <div className="home-yahoo">
            <div className="panel p-5">
              <h3>
                <Eye size={18} aria-hidden /> What it reads
              </h3>
              <ul>
                {READS.map(([k, d]) => (
                  <li key={k}>
                    <b>{k}</b> <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel p-5">
              <h3>
                <Ban size={18} aria-hidden /> What it never does
              </h3>
              <ul>
                <li>Post, trade, add, drop or change anything in Yahoo</li>
                <li>Sell, share or advertise with your data</li>
                <li>Show a league to anyone who isn&apos;t in it</li>
                <li>Keep your Yahoo tokens anywhere but our server</li>
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" className="button-secondary" disabled aria-describedby="yahoo-status">
                  <ShieldCheck size={16} aria-hidden /> Connect Yahoo
                </button>
                <span id="yahoo-status" className="text-[13px] text-muted">
                  Waiting on Yahoo&apos;s approval. Read the <Link href="/privacy" className="underline hover:text-foreground">privacy policy</Link>.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="home-block" aria-label="Explore past seasons">
          <SeasonExplorer seasons={stories} />
        </section>

        <section className="home-final">
          <div>
            <h2>See it with a league that never happened</h2>
            <p>{summary.seasons} seasons of invented managers, players and grudges, with every feature switched on.</p>
          </div>
          <Link href="/demo" className="button-primary">
            Enter the demo <ArrowRight size={17} aria-hidden />
          </Link>
        </section>
      </main>
      <SiteFooter source="demo" />
      <ChartTooltip />
    </>
  );
}
