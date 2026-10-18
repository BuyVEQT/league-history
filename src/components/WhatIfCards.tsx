import Link from "next/link";
import type { AlternateStandings } from "@/lib/analytics/whatIf";

/** One card per season the other ranking would change: who drops out (▼), who gets in (▲), a new first place. Click → the season. */
export function WhatIfCards({ rows, slug, names }: { rows: AlternateStandings[]; slug: string; names: Record<string, string> }) {
  const team = (r: { teamName: string; managerId: string }) => (
    <span key={r.managerId}>
      <b>{r.teamName}</b> <span className="text-muted">({names[r.managerId] ?? r.managerId})</span>
    </span>
  );
  const list = (rs: { teamName: string; managerId: string }[]) =>
    rs.map((r, i) => (
      <span key={r.managerId}>
        {i > 0 && ", "}
        {team(r)}
      </span>
    ));
  return (
    <div className="rec-alts">
      {rows.map((a, i) => (
        <Link key={a.year} href={`/${slug}/seasons/${a.year}`} className="rec-alt" style={{ ["--i" as string]: i }}>
          <span className="an">{a.label}</span>
          {a.out.length > 0 && (
            <>
              <span className="sw">
                <span className="text-[color:var(--neg)]">▼ out</span> <span>{list(a.out)}</span>
              </span>
              <span className="sw">
                <span className="text-[color:var(--pos)]">▲ in</span> <span>{list(a.in)}</span>
              </span>
            </>
          )}
          {a.altTop.teamId !== a.actualTop.teamId && (
            <span className="sw">
              <span className="text-[color:var(--gold)]">★ 1st</span>{" "}
              <span>
                <b>{a.altTop.teamName}</b> instead of {a.actualTop.teamName}
              </span>
            </span>
          )}
          {a.finalistsOut.length > 0 && (
            <span className="badge badge-orange mt-1 justify-self-start">
              {a.finalistsOut.length > 1 ? "Both finalists would have missed the playoffs" : "A finalist would have missed the playoffs"}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
