"use client";

import Link from "next/link";
import { useLeagueBase } from "./useLeagueBase";

export function ManagerLink({ id, name }: { id: string; name: string }) {
  const base = useLeagueBase();
  return (
    <Link href={`${base}/managers/${id}`} className="font-medium text-foreground hover:text-accent">
      {name}
    </Link>
  );
}
