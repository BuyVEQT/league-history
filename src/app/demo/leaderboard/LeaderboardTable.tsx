"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { careerStats, defaultCompare, type CareerRow } from "@/lib/analytics/career";
import { DASH, formatNumber, formatPct, formatRecord } from "@/lib/analytics/format";
import type { League } from "@/lib/types";

interface Column {
  key: string;
  label: string;
  /** Numeric value used for sorting; null sorts last. */
  value: (r: CareerRow) => number | string | null;
  render: (r: CareerRow) => string;
  /** Natural first-click direction. */
  best: "high" | "low";
}

const COLUMNS: Column[] = [
  { key: "titles", label: "Titles", value: (r) => r.titles, render: (r) => String(r.titles), best: "high" },
  { key: "runnerUps", label: "Runner-ups", value: (r) => r.runnerUps, render: (r) => String(r.runnerUps), best: "high" },
  { key: "seasons", label: "Seasons", value: (r) => r.seasons, render: (r) => String(r.seasons), best: "high" },
  { key: "record", label: "W-L-T", value: (r) => r.wins, render: (r) => formatRecord(r.wins, r.losses, r.ties), best: "high" },
  { key: "winPct", label: "Win %", value: (r) => r.winPct, render: (r) => formatPct(r.winPct), best: "high" },
  { key: "avgFinish", label: "Avg finish", value: (r) => r.avgFinish, render: (r) => formatNumber(r.avgFinish), best: "low" },
  { key: "bestFinish", label: "Best finish", value: (r) => r.bestFinish, render: (r) => (r.bestFinish === null ? DASH : String(r.bestFinish)), best: "low" },
  { key: "playoffApps", label: "Playoffs", value: (r) => r.playoffApps, render: (r) => String(r.playoffApps), best: "high" },
  { key: "playoffPct", label: "Playoff %", value: (r) => r.playoffPct, render: (r) => formatPct(r.playoffPct, 0), best: "high" },
  { key: "cats", label: "Category W-L-T", value: (r) => r.catWins, render: (r) => formatRecord(r.catWins, r.catLosses, r.catTies), best: "high" },
];

export function LeaderboardTable({ league }: { league: League }) {
  const years = league.seasons.map((s) => s.year);
  const [from, setFrom] = useState(years[0]);
  const [to, setTo] = useState(years.at(-1)!);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const rows = useMemo(() => {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    let list = careerStats(league, { from: lo, to: hi }).filter((r) =>
      r.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
    if (!sort) return list.sort(defaultCompare);
    const col = COLUMNS.find((c) => c.key === sort.key)!;
    const sign = sort.dir === "asc" ? 1 : -1;
    list = list.sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      if (av === null && bv === null) return defaultCompare(a, b);
      if (av === null) return 1; // missing values always sort last
      if (bv === null) return -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * sign || defaultCompare(a, b);
    });
    return list;
  }, [league, from, to, query, sort]);

  const onSort = (col: Column) =>
    setSort((cur) =>
      cur?.key === col.key
        ? { key: col.key, dir: cur.dir === "asc" ? "desc" : "asc" }
        : { key: col.key, dir: col.best === "high" ? "desc" : "asc" },
    );

  const select = "rounded-md border border-border bg-surface-2 px-2 py-1 text-sm";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="lb-search" className="text-xs text-muted">Search managers</label>
          <input
            id="lb-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name…"
            className={`${select} w-48`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="lb-from" className="text-xs text-muted">From season</label>
          <select id="lb-from" value={from} onChange={(e) => setFrom(Number(e.target.value))} className={select}>
            {years.map((y) => (
              <option key={y} value={y}>{y - 1}-{String(y).slice(2)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="lb-to" className="text-xs text-muted">To season</label>
          <select id="lb-to" value={to} onChange={(e) => setTo(Number(e.target.value))} className={select}>
            {years.map((y) => (
              <option key={y} value={y}>{y - 1}-{String(y).slice(2)}</option>
            ))}
          </select>
        </div>
        {sort && (
          <button type="button" onClick={() => setSort(null)} className="text-sm text-accent hover:underline">
            Reset sort
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface/80 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)]">
        <table className="w-full text-sm">
          <caption className="sr-only">All-time manager leaderboard</caption>
          <thead>
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Manager</th>
              {COLUMNS.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="whitespace-nowrap px-1 py-1 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => onSort(c)}
                      className="rounded px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted hover:text-foreground"
                    >
                      {c.label} {active ? (sort!.dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.managerId} className="transition-colors hover:bg-surface-2/60">
                <td className="whitespace-nowrap px-3 py-2">
                  <Link href={`/demo/managers/${r.managerId}`} className="font-medium hover:text-accent hover:underline">
                    {r.name}
                  </Link>
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-3 py-8 text-center text-muted">
                  No managers match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
