import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, Check, LockKeyhole, MoveUpRight, Swords, Trophy } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { SeasonExplorer } from "@/components/SeasonExplorer";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME } from "@/lib/config";
import { getLeague } from "@/lib/data";
import { championHistory, leagueSummary } from "@/lib/analytics/overview";

export default async function Home() {
  const league = (await getLeague("demo"))!;
  const summary = leagueSummary(league);
  const stories = championHistory(league).filter(s => s.championManagerId).map(s => ({
    year: s.year, label: s.label, team: s.championTeamName!,
    manager: league.managers.find(m => m.id === s.championManagerId)!.name,
    runnerUp: s.runnerUpTeamName ?? "Not recorded",
  }));
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="site-container home-nav">
        <Link href="/" className="brand"><BrandMark />{SITE_NAME}<span className="text-accent">.</span></Link>
        <nav className="flex items-center gap-6 text-sm font-semibold" aria-label="Main">
          <Link href="/caboclo" className="hidden items-center gap-2 text-muted hover:text-accent sm:inline-flex"><LockKeyhole size={14} />Members</Link>
          <Link href="/demo" className="button-secondary"><span className="hidden sm:inline">Enter the demo</span><span className="sm:hidden">Demo</span> <ArrowRight size={16} /></Link>
        </nav>
      </header>
      <main id="main-content" className="site-container">
        <section className="hero">
          <div className="reveal">
            <div className="eyebrow text-accent"><span className="status-dot" />For the love of the league</div>
            <h1>Big rivalries.<br />Bigger <em>history.</em></h1>
            <p className="hero-copy">The season ends. The bragging rights don’t. Give your fantasy basketball league the history book it deserves.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/demo" className="button-primary">Explore the demo <ArrowRight size={17} /></Link>
              <a href="#history" className="text-sm font-semibold hover:text-accent">Take a look around <span aria-hidden>↗</span></a>
            </div>
            <p className="hero-note"><Check size={14} className="text-positive" />No sign-up. No setup. Just a little friendly competition.</p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[11px] text-muted"><input id="pause-motion" type="checkbox" className="size-3.5 min-h-0 accent-accent" />Pause animations</label>
          </div>
          <div className="court-scene reveal reveal-delay" aria-hidden="true">
            <div className="court-grid" /><div className="court-disc" />
            <div className="scene-label top"><span className="eyebrow text-muted">🏆 &nbsp; Legends live here</span><strong>Built for the long game.</strong></div>
            <span className="scene-star">✳</span>
            <svg className="basketball" viewBox="0 0 240 240" fill="none">
              <defs><radialGradient id="ball" cx=".3" cy=".25" r=".8"><stop stopColor="#ffac60" /><stop offset=".65" stopColor="#ef793c" /><stop offset="1" stopColor="#cd4a22" /></radialGradient><clipPath id="ball-clip"><circle cx="120" cy="120" r="112" /></clipPath></defs>
              <circle cx="120" cy="120" r="112" fill="url(#ball)" stroke="#753b22" strokeWidth="3" />
              <g clipPath="url(#ball-clip)" stroke="#753b22" strokeWidth="3.5"><path d="M120 0v240M0 120h240M-12 4c180 15 180 217 0 232M252 4C72 19 72 221 252 236" /></g>
              <path d="M48 51c13-14 26-22 45-27" stroke="#ffcb90" strokeWidth="8" strokeLinecap="round" />
            </svg>
            <div className="scene-label bottom"><span className="eyebrow text-muted">The group chat has receipts</span><strong>{summary.seasons} seasons. All remembered.</strong></div>
          </div>
        </section>
        <section className="scoreboard reveal" aria-label="Demo league at a glance">
          <div><strong>{summary.seasons}</strong><span>Seasons of stories</span></div>
          <div><strong>{summary.managers}</strong><span>Managers. Many opinions.</span></div>
          <div><strong>{summary.completedMatchups.toLocaleString()}</strong><span>Matchups in the books</span></div>
          <div><strong>∞</strong><span>Bragging rights</span></div>
        </section>
        <section className="home-section" id="history">
          <div className="section-heading"><div><div className="eyebrow text-accent mb-3">More than a box score</div><h2 className="display-heading">Good leagues have great stories.</h2></div><span className="text-sm text-muted">Here’s where yours come to life.</span></div>
          <div className="feature-grid">
            {[
              { icon: Trophy, title: "Settle the GOAT debate.", description: "Titles, win rates, playoff runs. An all-time leaderboard that gives every argument a little evidence.", href: "/demo/leaderboard", label: "See the rankings" },
              { icon: Swords, title: "Make it personal.", description: "That one manager you can never beat? Explore every head-to-head and find out who really owns the rivalry.", href: "/demo/rivalries", label: "Find your rival" },
              { icon: ChartNoAxesCombined, title: "Watch the story unfold.", description: "From breakout seasons to legendary runs. Follow every manager’s journey, one season at a time.", href: "/demo", label: "Explore the league" },
            ].map(({ icon: Icon, title, description, href, label }) => <Link key={title} href={href} className="feature-card"><div className="feature-icon"><Icon size={22} aria-hidden /></div><h3>{title}</h3><p>{description}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-accent">{label}<MoveUpRight size={15} /></span></Link>)}
          </div>
        </section>
        <section className="pb-16" aria-label="Explore past seasons"><SeasonExplorer seasons={stories} /></section>
        <div className="mb-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-border p-6 text-sm">
          <p className="max-w-2xl text-muted"><strong className="text-foreground">Your league, next?</strong> Yahoo league connection is coming soon. For now, explore our fictional demo or visit the members’ league.</p>
          <Link href="/caboclo" className="inline-flex items-center gap-2 font-semibold hover:text-accent"><LockKeyhole size={15} />Members’ entrance <ArrowRight size={15} /></Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
