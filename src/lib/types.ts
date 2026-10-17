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

export type Stage = "regular" | "quarterfinal" | "semifinal" | "final" | "third_place";

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

/**
 * How regular-season standings are ranked:
 * - "categories": Yahoo "Head-to-Head - Categories"; every category counts, ranked by category win %.
 * - "most_categories": one win/loss/tie per weekly matchup, ranked by matchup win %.
 */
export type ScoringType = "categories" | "most_categories";

export interface Season {
  year: number; // season end year (2025 = the 2024-25 season)
  label: string;
  /** Defaults to "most_categories" when absent. */
  scoring?: ScoringType;
  categories: string[];
  teams: Team[];
  matchups: Matchup[];
  /**
   * Official final placement from the source, when known. Leagues with
   * consolation brackets decide 5th place and below in games we may not store.
   */
  finalRanks?: Record<TeamId, number>;
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
