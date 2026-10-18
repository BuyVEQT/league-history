"use client";

import Link from "next/link";
import { useLeagueBase } from "./useLeagueBase";

/** A plain click opens the manager's side panel (see DrawerProvider); Cmd/Ctrl/middle-click opens the profile. */
export function ManagerLink({ id, name }: { id: string; name: string }) {
  const base = useLeagueBase();
  return (
    <Link href={`${base}/managers/${id}`} data-panel={`manager:${id}`} className="font-medium text-foreground hover:text-accent">
      {name}
    </Link>
  );
}
