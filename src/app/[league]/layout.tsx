import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { SpotlightPicker } from "@/components/spotlight/SpotlightPicker";
import { SpotlightProvider } from "@/components/spotlight/SpotlightProvider";
import { DrawerProvider } from "@/components/panel/DrawerProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { ChartTooltip } from "@/components/viz/ChartTooltip";
import { hasDraftData } from "@/lib/analytics/draft";
import { hasTradeData } from "@/lib/analytics/trades";
import { getLeague, leagueSlugs } from "@/lib/data";
import { spotlightOptions } from "@/lib/spotlight";
import { panelData, type PanelData } from "@/lib/analytics/panelView";
import { managerBadges } from "./managers/managerBadges";
import type { League } from "@/lib/types";

/** Side-panel data, built once per league per build worker (every page renders this layout). */
const panelCache = new WeakMap<League, PanelData>();
const panelFor = (league: League) => panelCache.get(league) ?? panelCache.set(league, panelData(league, managerBadges(league))).get(league)!;

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
  const managers = new Set(league.seasons.flatMap((s) => s.teams.map((t) => t.managerId))).size;
  return (
    <SpotlightProvider league={(await params).league} managers={spotlightOptions(league).map(({ id, name }) => ({ id, name }))}>
    <DrawerProvider data={panelFor(league)}>
    <div className="flex min-h-screen flex-col">
      <a href="#league-content" className="skip-link">Skip to league content</a>
      <header className="band">
        <div className="band-wrap">
          <Link href={`/${(await params).league}`} className="band-brand" aria-label={`${league.name}, overview`}>
            <span className="band-brand-mark" aria-hidden>
              <svg viewBox="0 0 34 34" width="34" height="34" fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="1.6">
                <circle cx="17" cy="17" r="16" />
                <path d="M17 1v32M1 17h32M5.5 5.5c6 6 6 17 0 23M28.5 5.5c-6 6-6 17 0 23" />
              </svg>
            </span>
            <span>
              <span className="band-brand-name">{league.name}</span>
              <br />
              <span className="band-brand-sub">
                {first.label} – {last.label} · {league.seasons.length} seasons · {managers} managers
                {league.source === "demo" && " · demo data, fictional"}
              </span>
            </span>
          </Link>
          <SpotlightPicker />
          <Nav features={{ draft: hasDraftData(league), trades: hasTradeData(league) }} />
        </div>
      </header>
      <main id="league-content" className="league-main flex-1">
        {children}
      </main>
      <SiteFooter source={league.source} />
      <ChartTooltip />
    </div>
    </DrawerProvider>
    </SpotlightProvider>
  );
}
