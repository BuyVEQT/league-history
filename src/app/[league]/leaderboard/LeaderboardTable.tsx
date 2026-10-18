"use client";

import { monograms } from "@/components/viz/monograms";
import Link from "next/link";
import { Download, RotateCcw, Search, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui";
import { useMemo, useState, type ReactNode } from "react";
import { Sparkline } from "@/components/Sparkline";
import { finishHistory, type FinishPoint } from "@/lib/analytics/leaderboardView";
import { SEASON_TIPS } from "@/lib/explain/seasons";
import { InfoTip } from "@/components/InfoTip";
import { careerStats, defaultCompare, type CareerRow } from "@/lib/analytics/career";
import { goatScores } from "@/lib/analytics/goat";
import { TIPS } from "@/lib/explain";
import { DASH, formatNumber, formatPct, formatRecord, ordinal, winPct } from "@/lib/analytics/format";
import type { League } from "@/lib/types";
import { useLeagueBase } from "@/components/useLeagueBase";

interface Column {
  key: string;
  label: string;
  /** Numeric value used for sorting; null sorts last. */
  value: (r: CareerRow) => number | string | null;
  render: (r: CareerRow) => string;
  /** Optional richer table cell; `render` stays the plain text (CSV export). */
  cell?: (r: CareerRow) => ReactNode;
  /** Natural first-click direction. */
  best: "high" | "low";
  /** Explanation shown in the header's info tip. */
  tip?: string;
}

/** Category win % (ties count half), the number the standings use. */
const catPct = (r: CareerRow) => winPct(r.catWins, r.catLosses, r.catTies);

const COLUMNS: Column[] = [
  {
    key: "titles",
    label: "Titles",
    value: (r) => r.titles,
    render: (r) => String(r.titles),
    cell: (r) => (
      <>
        {r.titles}
        {r.titles > 0 && (
          <span className="trophies" title={`${r.titles} title${r.titles > 1 ? "s" : ""}`}>
            {Array.from({ length: r.titles }, (_, i) => (
              <Trophy key={i} aria-hidden strokeWidth={1.8} />
            ))}
          </span>
        )}
      </>
    ),
    best: "high",
    tip: SEASON_TIPS.titles,
  },
  { key: "runnerUps", label: "Runner-ups", value: (r) => r.runnerUps, render: (r) => String(r.runnerUps), best: "high" },
  { key: "seasons", label: "Seasons", value: (r) => r.seasons, render: (r) => String(r.seasons), best: "high" },
  {
    key: "catPct",
    label: "Category win %",
    value: (r) => catPct(r),
    render: (r) => formatPct(catPct(r)),
    best: "high",
    tip: TIPS.catPct,
  },
  { key: "cats", label: "Category W-L-T", value: (r) => r.catWins, render: (r) => formatRecord(r.catWins, r.catLosses, r.catTies), best: "high", tip: TIPS.catRecord },
  { key: "record", label: "W-L-T", value: (r) => r.wins, render: (r) => formatRecord(r.wins, r.losses, r.ties), best: "high" },
  { key: "winPct", label: "Win %", value: (r) => r.winPct, render: (r) => formatPct(r.winPct), best: "high", tip: TIPS.winPct },
  { key: "avgFinish", label: "Avg finish", value: (r) => r.avgFinish, render: (r) => formatNumber(r.avgFinish), best: "low", tip: TIPS.avgFinish },
  { key: "bestFinish", label: "Best finish", value: (r) => r.bestFinish, render: (r) => (r.bestFinish === null ? DASH : String(r.bestFinish)), best: "low" },
  { key: "playoffApps", label: "Playoffs", value: (r) => r.playoffApps, render: (r) => String(r.playoffApps), best: "high" },
  { key: "playoffPct", label: "Playoff %", value: (r) => r.playoffPct, render: (r) => formatPct(r.playoffPct, 0), best: "high", tip: TIPS.playoffPct },
];

/** One dot per season in the range, higher = better finish: gold = title, blue = top three. */
function FinishSpark({ pts, years, maxTeams }: { pts: FinishPoint[]; years: number[]; maxTeams: number }) {
  const at = years.map((y) => pts.find((p) => p.year === y) ?? null);
  return (
    <Sparkline
      values={at.map((p) => p?.final ?? null)}
      width={Math.max(32, 16 * years.length)}
      height={30}
      invert
      domain={[1, maxTeams]}
      color="var(--border-2)"
      dotRadius={2.6}
      marks={at.flatMap((p, i) => (p?.final === 1 ? [i] : []))}
      dotColor={(v) => (v <= 3 ? "var(--s1)" : "var(--muted)")}
      labels={at.map((p) => (p ? `${p.label}: ${ordinal(p.final)} of ${p.teams}` : null))}
    />
  );
}

export function LeaderboardTable({ league }: { league: League }) {
  const base = useLeagueBase();
  const years = league.seasons.map((s) => s.year);
  const [from, setFrom] = useState(years[0]);
  const [to, setTo] = useState(years.at(-1)!);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  // GOAT scores depend on the selected seasons; managers with too few seasons have none.
  const mono = useMemo(() => monograms(league.managers), [league]);
  const goat = useMemo(() => new Map(goatScores(league, { from: lo, to: hi }).map((g) => [g.managerId, g.score])), [league, lo, hi]);
  const goatId = useMemo(() => [...goat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0], [goat]);
  const columns = useMemo<Column[]>(
    () => [
      {
        key: "goat",
        label: "GOAT score",
        value: (r) => goat.get(r.managerId) ?? null,
        render: (r) => (goat.has(r.managerId) ? goat.get(r.managerId)!.toFixed(0) : DASH),
        best: "high",
        tip: TIPS.goat,
      },
      ...COLUMNS,
    ],
    [goat],
  );

  const rows = useMemo(() => {
    let list = careerStats(league, { from: lo, to: hi }).filter((r) =>
      r.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
    // Default order: GOAT score, then everyone without one in the usual order.
    const active = sort ?? { key: "goat", dir: "desc" as const };
    const col = columns.find((c) => c.key === active.key)!;
    const sign = active.dir === "asc" ? 1 : -1;
    list = list.sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      if (av === null && bv === null) return defaultCompare(a, b);
      if (av === null) return 1; // missing values always sort last
      if (bv === null) return -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * sign || defaultCompare(a, b);
    });
    return list;
  }, [league, lo, hi, query, sort, columns]);
  // Finish history per manager over the selected seasons (one slot per season, null = didn't play).
  const rangeYears = useMemo(() => years.filter((y) => y >= lo && y <= hi), [years, lo, hi]);
  const maxTeams = useMemo(() => Math.max(2, ...league.seasons.map((s) => s.teams.length)), [league]);
  const history = useMemo(() => {
    const out = new Map<string, ReturnType<typeof finishHistory>>();
    for (const m of league.managers) out.set(m.id, finishHistory(league, m.id, { from: lo, to: hi }));
    return out;
  }, [league, lo, hi]);
  const maxCat = Math.max(0.0001, ...rows.map((r) => catPct(r) ?? 0));
  const minCat = Math.min(0.4, ...rows.map((r) => catPct(r) ?? 0)) - 0.02;
  const cellOf = (c: Column, r: CareerRow): ReactNode => {
    if (c.key === "catPct") {
      const p = catPct(r) ?? 0;
      return (
        <span className="catbar">
          <span>{c.render(r)}</span>
          <span className="tr">
            <span className="fl" style={{ width: `${Math.max(2, Math.min(100, ((p - minCat) / Math.max(0.01, maxCat - minCat)) * 100))}%` }} />
          </span>
        </span>
      );
    }
    return c.cell ? c.cell(r) : c.render(r);
  };

  const onSort = (col: Column) =>
    setSort((cur) =>
      cur?.key === col.key
        ? { key: col.key, dir: cur.dir === "asc" ? "desc" : "asc" }
        : { key: col.key, dir: col.best === "high" ? "desc" : "asc" },
    );

  const filtered = query !== "" || from !== years[0] || to !== years.at(-1) || sort !== null;
  const reset = () => { setQuery(""); setFrom(years[0]); setTo(years.at(-1)!); setSort(null); };
  const exportCsv = () => {
    const escape = (value: string) => {
      const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const csv = [["Manager", ...columns.map(c => c.label)], ...rows.map(r => [r.name, ...columns.map(c => c.render(r))])]
      .map(row => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${base.slice(1)}-leaderboard.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    // Give the browser time to begin reading the blob before releasing it.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const select = "rounded-lg border border-border bg-surface px-3 py-2 text-sm";
  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="lb-search" className="text-xs text-muted">Search managers</label>
          <div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-muted" aria-hidden />
          <input
            id="lb-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a manager…"
            className={`${select} w-full pl-9 sm:w-52`}
          /></div>
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
        <div className="ml-auto flex items-center gap-3">
          {filtered && <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-accent"><RotateCcw size={14} />Reset filters</button>}
          <button type="button" onClick={exportCsv} disabled={!rows.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-surface-2 disabled:opacity-40"><Download size={14} />Export CSV</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted">
        <p role="status">{rows.length} manager{rows.length === 1 ? "" : "s"} · {Math.min(from, to) - 1}–{String(Math.max(from, to)).slice(2)}</p>
        <p>Click a column to sort · swipe to see more</p>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">All-time manager leaderboard</caption>
          <thead>
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Manager</th>
              {columns.map((c) => {
                const active = (sort?.key ?? "goat") === c.key;
                const dir = sort?.dir ?? "desc";
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
                    className="whitespace-nowrap px-1 py-1 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => onSort(c)}
                      className="rounded px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted hover:text-foreground"
                    >
                      {c.label} {active ? (dir === "asc" ? "▲" : "▼") : ""}
                    </button>
                    {c.tip && <InfoTip text={c.tip} down />}
                  </th>
                );
              })}
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Finish history <InfoTip text={SEASON_TIPS.finishHistory} down end />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.managerId} className={`transition-colors hover:bg-surface-2/60 ${r.managerId === goatId ? "bg-[color:var(--gold-wash)]" : ""}`}>
                <td className={`sticky left-0 z-10 whitespace-nowrap px-3 py-3 ${r.managerId === goatId ? "bg-[color:var(--gold-wash)]" : "bg-surface"}`}>
                  <Link href={`${base}/managers/${r.managerId}`} className="inline-flex items-center gap-2 font-semibold hover:text-accent hover:underline">
                    <Avatar name={r.name} size="sm" initials={mono.get(r.managerId)} />{r.name}
                  </Link>
                  {r.managerId === goatId && <span className="badge badge-gold ml-2">GOAT</span>}
                </td>
                {columns.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-3 py-2 tabular-nums ${c.key === "goat" ? "font-display text-lg font-extrabold" : ""}`}>
                    {cellOf(c, r)}
                  </td>
                ))}
                <td className="px-3 py-1.5">
                  <FinishSpark pts={history.get(r.managerId) ?? []} years={rangeYears} maxTeams={maxTeams} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-8 text-center text-muted">
                  <p className="font-semibold text-foreground">No managers found.</p>
                  <p className="mt-1">Try another name or season range.</p>
                  <button className="mt-3 text-accent underline" onClick={reset}>Clear all filters</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
