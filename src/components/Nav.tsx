"use client";

import { CalendarDays, LayoutDashboard, ListOrdered, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/demo", label: "Overview", icon: LayoutDashboard },
  { href: "/demo/leaderboard", label: "Leaderboard", icon: ListOrdered },
  { href: "/demo/seasons", label: "Seasons", icon: CalendarDays },
  { href: "/demo/rivalries", label: "Rivalries", icon: Swords },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/demo" ? pathname === href : pathname.startsWith(href);
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
