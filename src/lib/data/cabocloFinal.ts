import type { CabocloFinal } from "../analytics/cabocloFinal";
import final from "../../../data/leagues/caboclo/caboclo-final.json";

/** The night the league got its name. Only the real Caboclo Cup has one. */
export const cabocloFinalFor = (slug: string): CabocloFinal | null => (slug === "caboclo" ? (final as unknown as CabocloFinal) : null);
