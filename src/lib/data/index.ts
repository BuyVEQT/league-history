import type { League, LeagueProvider } from "../types";
import { cabocloProvider } from "./caboclo";
import { demoProvider } from "./demo";

/**
 * Every league the site serves, by URL slug. A Yahoo API-backed provider
 * replaces the page-capture one here once API access is approved.
 */
export const providers: Record<string, LeagueProvider> = {
  demo: demoProvider,
  caboclo: cabocloProvider,
};

export const leagueSlugs = Object.keys(providers);

export async function getLeague(slug: string): Promise<League | null> {
  return (await providers[slug]?.getLeague()) ?? null;
}

/**
 * The fields interactive (client) components need. Drafts, player ranks and
 * trades are large and not used by those components, so they stay on the server.
 */
export function coreLeague(league: League): League {
  return {
    ...league,
    seasons: league.seasons.map(({ draft, players, activity, trades, ...core }) => {
      void draft;
      void players;
      void activity;
      void trades;
      return core;
    }),
  };
}
