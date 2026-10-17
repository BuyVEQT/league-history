import type { LeagueProvider } from "../types";
import { demoProvider } from "./demo";

/**
 * The single place pages get league data from. Swap in a Yahoo-backed
 * provider here once API access is approved.
 */
export const provider: LeagueProvider = demoProvider;
