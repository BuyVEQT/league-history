"use client";

import { CalendarDays, LayoutDashboard, ListOrdered, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLeagueBase } from "./useLeagueBase";

const LINKS = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/leaderboard", label: "Leaderboard", icon: ListOrdered },
  { href: "/seasons", label: "Seasons", icon: CalendarDays },
  { href: "/rivalries", label: "Rivalries", icon: Swords },
];

export function Nav() {
  const pathname = usePathname();
  const base = useLeagueBase();
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map(({ href: path, label, icon: Icon }) => {
        const href = base + path;
        const active = path === "" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {active && <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-accent md:block" />}
            <Icon className={`size-4 ${active ? "text-accent" : ""}`} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
