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
  /** The player the team name clearly refers to ("Mad Maxey"), when there is one. */
  namesake?: { name: string; playerId: string | null };
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
  /**
   * The source's playoff seeding, best first. Only used to break exact
   * standings ties our data cannot resolve (identical records and head-to-head).
   */
  sourceSeedOrder?: TeamId[];
  /** Optional extras, present when the source provides them. */
  draft?: DraftPick[];
  players?: PlayerSeason[];
  /** Season totals per team from the source's managers page. */
  activity?: Record<TeamId, { moves: number; trades: number }>;
  trades?: Trade[];
}

export interface DraftPick {
  round: number;
  /** Pick within the round. */
  pick: number;
  overall: number;
  teamId: TeamId;
  playerId: string;
  playerName: string;
}

/** Category totals for a player's whole NBA season. */
export interface PlayerStats {
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  threes: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
}

/**
 * A player's season by the source's own ranking. `teamId` is who rostered them
 * at season end (null = free agent). Stats are full NBA-season totals, not what
 * that fantasy team actually received.
 */
export interface PlayerSeason {
  playerId: string;
  name: string;
  actualRank: number;
  preseasonRank: number | null;
  gamesPlayed: number | null;
  teamId: TeamId | null;
  stats?: PlayerStats;
}

export interface TradePlayer {
  name: string;
  /** Null when the name matches no ranked or drafted player that season (so the player is unranked). */
  playerId: string | null;
  /**
   * Rank on only the games played after the trade (through the end of the regular season), among all
   * players over the same games. Null = didn't play enough to rank. Absent when not captured.
   */
  afterTrade?: { rank: number | null; games: number };
}

export interface Trade {
  date: string; // YYYY-MM-DD
  status: "completed" | "vetoed";
  sides: { teamId: TeamId; receives: TradePlayer[] }[];
}

/** The source's own manager rating (Yahoo "Ratings & Levels"), a snapshot on `asOf`. */
export interface ManagerRating {
  managerId: ManagerId;
  rank: number;
  rating: number;
  level: string;
}

export interface League {
  name: string;
  source: "demo" | "yahoo";
  managers: Manager[];
  seasons: Season[]; // ascending by year
  ratings?: { asOf: string; rows: ManagerRating[] };
  /**
   * The next season once it is drafted but before any games: teams and the draft so far, no matchups.
   * Kept apart from `seasons` so standings and careers only ever count played seasons.
   */
  upcoming?: Season;
}

/** The seam where a Yahoo implementation plugs in later. */
export interface LeagueProvider {
  getLeague(): Promise<League>;
}
