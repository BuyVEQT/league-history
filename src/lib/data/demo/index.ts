import type { LeagueProvider } from "../../types";
import { generateDemoLeague } from "./generate";

const league = generateDemoLeague();

export const demoProvider: LeagueProvider = {
  async getLeague() {
    return league;
  },
};
