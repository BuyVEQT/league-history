/**
 * Normalized league model. Every page consumes these types only — never raw
 * Yahoo responses. A future Yahoo provider maps API payloads into this shape.
 *
 * Deliberately minimal: W-L-T, ranks, and champions are NOT stored. They are
 * derived from `matchups` by the functions in `lib/analytics`, so there is a
 * single source of truth and nothing can drift out of sync.
 */

export type ManagerId = string;
export type TeamId = string; // unique per season, e.g. "2024:alex"

export interface Manager {
  id: ManagerId;
  name: string;
}

/** A manager's team in one season. Names/logos change, so they live here. */
export interface Team {
  id: TeamId;
  managerId: ManagerId;
  name: string;
}

export type Stage = "regular" | "semifinal" | "final" | "third_place";

/** One head-to-head weekly matchup in a categories league. */
export interface Matchup {
  week: number;
  stage: Stage;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  /** Categories won by each side. Home + away + tied = number of categories. */
  homeCats: number;
  awayCats: number;
  tiedCats: number;
  /** Playoff-only: who advanced when categories were tied (higher seed). */
  tiebreakWinnerTeamId?: TeamId;
}

export interface Season {
  year: number; // season end year (2025 = the 2024-25 season)
  label: string;
  categories: string[];
  teams: Team[];
  matchups: Matchup[];
}

export interface League {
  name: string;
  source: "demo" | "yahoo";
  managers: Manager[];
  seasons: Season[]; // ascending by year
}

/** The seam where a Yahoo implementation plugs in later. */
export interface LeagueProvider {
  getLeague(): Promise<League>;
}
