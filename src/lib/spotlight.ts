import type { League, Manager } from "./types";

/** localStorage key for the spotlit manager; one per league so ids never leak between leagues. */
export const spotlightKey = (league: string) => `spotlight:${league}`;

/** Window event that sets the spotlight from anywhere (detail: { managerId: string | null }). */
export const SPOTLIGHT_SET_EVENT = "spotlight:set";
/** Window event fired after the spotlight changes (detail: { managerId: string | null }). */
export const SPOTLIGHT_CHANGE_EVENT = "spotlight:change";

/** Managers who played at least one season, in league order: the Spotlight select's options. */
export function spotlightOptions(league: League): Manager[] {
  const played = new Set(league.seasons.flatMap((s) => s.teams.map((t) => t.managerId)));
  return league.managers.filter((m) => played.has(m.id));
}

/**
 * The one generated stylesheet that does all the fading. Elements tagged `data-m="<managerId>"` fade
 * unless they belong to the spotlit manager:
 * - HTML elements (table rows, manager cards, draft-board cells, panel rows) fade to 45%;
 * - chart marks (anything tagged inside an `<svg>`, or an HTML mark opted in with `data-m-mark`) fade to 22%.
 * The spotlit manager's table rows get an orange left edge and a light orange wash, and tagged cards
 * (`data-m-card`) an orange ring. `!important` beats the inline opacity d3 writes.
 */
export function spotlightCss(id: string | null): string {
  if (!id) return "";
  const v = `"${id.replace(/["\\]/g, "\\$&")}"`;
  const b = "body[data-spot]";
  const not = `:not([data-m=${v}])`;
  const me = `[data-m=${v}]`;
  return [
    `${b} [data-m]${not} { opacity: .45 !important; }`,
    `${b} svg [data-m]${not}, ${b} [data-m][data-m-mark]${not} { opacity: .22 !important; }`,
    `${b} tr${me} > * { background-color: var(--accent-wash) !important; }`,
    `${b} tr${me} > :first-child { box-shadow: inset 4px 0 0 var(--accent); }`,
    `${b} [data-m-card]${me} { box-shadow: 0 0 0 2px var(--accent); }`,
  ].join("\n");
}
