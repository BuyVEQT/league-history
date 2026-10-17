"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/demo", label: "Overview" },
  { href: "/demo/leaderboard", label: "Leaderboard" },
  { href: "/demo/seasons", label: "Seasons" },
  { href: "/demo/rivalries", label: "Rivalries" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map((l) => {
        const active = l.href === "/demo" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${
              active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
