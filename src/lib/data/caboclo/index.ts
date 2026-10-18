import type { League, LeagueProvider, Manager, Season } from "../../types";
import managers from "../../../../data/leagues/caboclo/managers.json";
import leagueWide from "../../../../data/leagues/caboclo/league.json";
import s2019 from "../../../../data/leagues/caboclo/2019.json";
import s2021 from "../../../../data/leagues/caboclo/2021.json";
import s2022 from "../../../../data/leagues/caboclo/2022.json";
import s2023 from "../../../../data/leagues/caboclo/2023.json";
import s2024 from "../../../../data/leagues/caboclo/2024.json";
import s2025 from "../../../../data/leagues/caboclo/2025.json";
import s2026 from "../../../../data/leagues/caboclo/2026.json";

/**
 * The real Caboclo Cup, built from Yahoo page captures (see docs/EXTRACTION.md).
 * Seasons are validated against Yahoo's own standings by src/lib/data/caboclo*.test.ts.
 */
const seasons = [s2019, s2021, s2022, s2023, s2024, s2025, s2026] as unknown as Season[];

const league: League = {
  name: "The Caboclo Cup",
  source: "yahoo",
  managers: managers as Manager[],
  seasons: [...seasons].sort((a, b) => a.year - b.year),
  ratings: leagueWide.ratings,
};

export const cabocloProvider: LeagueProvider = {
  async getLeague() {
    return league;
  },
};
