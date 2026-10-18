import type { Season } from "../types";

/**
 * What an end-of-season rank is worth, in roughly 9-category z-score points
 * above a replacement-level player.
 *
 * Calibrated on the Caboclo Cup's seasons: the source's season ranks match a
 * 9-category z-score ranking of season totals (Spearman 0.999 every season),
 * and z-score value above replacement falls off like 3 × ln(replacement / rank)
 * (R² 0.95; a straight line in rank fits worse, R² 0.81). Value drops steeply
 * at the top: finishing 1st instead of 10th is worth more than 10th instead of
 * 50th. Players at or below replacement level, or unranked, are worth 0.
 */
export const VALUE_SCALE = 3;

export const rankValue = (rank: number | null, replacement: number) =>
  rank === null || rank >= replacement ? 0 : VALUE_SCALE * Math.log(replacement / rank);

/** Roughly how many players are rostered: teams × draft rounds (13 rounds assumed when the draft is unknown). */
export const replacementRank = (season: Season) =>
  season.teams.length * (season.draft?.length ? Math.max(...season.draft.map((d) => d.round)) : 13);
