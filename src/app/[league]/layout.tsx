import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CircleHelp } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME } from "@/lib/config";
import { hasDraftData } from "@/lib/analytics/draft";
import { hasTradeData } from "@/lib/analytics/trades";
import { getLeague, leagueSlugs } from "@/lib/data";

// Opts this layout segment out of the dev-only instant-navigation check
// (https://nextjs.org/docs/messages/instant-shell-url-data). Pages that read params can still show that
// dev hint; it never affects builds. Every league page is prerendered per slug.
export const instant = false;

export function generateStaticParams() {
  return leagueSlugs.map((league) => ({ league }));
}

export default async function LeagueLayout({ children, params }: LayoutProps<"/[league]">) {
  const league = await getLeague((await params).league);
  if (!league) notFound();
  const first = league.seasons[0];
  const last = league.seasons.at(-1)!;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <a href="#league-content" className="skip-link">Skip to league content</a>
      <aside className="dashboard-sidebar border-b border-border p-3 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0 md:p-5">
        <Link href="/" className="mb-3 flex items-center gap-2.5 px-2 font-semibold tracking-tight md:mb-8">
          <BrandMark />
          {SITE_NAME}
        </Link>
        <div className="mb-2 hidden px-3 text-[11px] font-medium uppercase tracking-wider text-white/50 md:block">
          League
        </div>
        <Nav features={{ draft: hasDraftData(league), trades: hasTradeData(league) }} />
        <div className="mt-auto hidden pt-8 md:block">
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <CircleHelp size={18} className="mb-3 text-orange-300" aria-hidden />
            <p className="text-sm font-semibold">Every number has a story.</p>
            <p className="mt-2 text-xs leading-5 text-white/60">Pick a manager. Compare a rival. Relive a season.</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-orange-300">Back to home <ArrowUpRight size={14} /></Link>
          </div>
          <p className="mt-5 px-1 text-[10px] uppercase tracking-widest text-white/40">For the love of the league.</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-3 md:px-8">
          <span className="font-medium">{league.name}</span>
          <span className="text-sm text-muted">
            {first.label} – {last.label}
          </span>
          {league.source === "demo" && (
            <span className="ml-auto rounded-full border border-accent/30 bg-accent/5 px-2.5 py-1 text-[10px] font-semibold text-accent">
              Demo data · fictional, not from Yahoo
            </span>
          )}
        </header>
        <main id="league-content" className="dashboard-main mx-auto w-full max-w-6xl flex-1 space-y-9 px-4 py-8 md:px-8 md:py-10">{children}</main>
        <SiteFooter source={league.source} />
      </div>
    </div>
  );
}
