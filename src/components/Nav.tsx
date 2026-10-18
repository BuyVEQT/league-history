"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLeagueBase } from "./useLeagueBase";

/** Sections that only exist when the league has the data behind them. */
export interface NavFeatures {
  draft?: boolean;
  trades?: boolean;
  /** The story behind the league's name (only the real Caboclo Cup has one). */
  story?: boolean;
}

const LINKS: { href: string; label: string; needs?: keyof NavFeatures; isNew?: boolean }[] = [
  { href: "", label: "Overview" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/seasons", label: "Seasons" },
  { href: "/managers", label: "Managers" },
  { href: "/rivalries", label: "Rivalries" },
  { href: "/records", label: "Records" },
  { href: "/draft", label: "Draft", needs: "draft" },
  { href: "/trades", label: "Trades & moves", needs: "trades" },
  { href: "/awards", label: "Awards" },
  { href: "/caboclo-cup", label: "The Cup", needs: "story", isNew: true },
];

/** The tab row in the arena band. */
export function Nav({ features = {} }: { features?: NavFeatures }) {
  const pathname = usePathname();
  const base = useLeagueBase();
  return (
    <nav aria-label="Sections" className="band-tabs">
      {LINKS.filter((l) => !l.needs || features[l.needs]).map(({ href: path, label, isNew }) => {
        const href = base + path;
        const active = path === "" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            {label}
            {isNew && <span className="new">New</span>}
          </Link>
        );
      })}
    </nav>
  );
}
