"use client";

import { usePathname } from "next/navigation";

/** "/demo" or "/caboclo": the league segment of the current URL. */
export function useLeagueBase(): string {
  const segment = usePathname().split("/")[1];
  return segment ? `/${segment}` : "/demo";
}
