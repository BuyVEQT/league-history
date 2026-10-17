"use client";

import { useMemo, useState } from "react";
import { formatRecord } from "@/lib/analytics/format";
import { headToHead } from "@/lib/analytics/headToHead";
import type { League, Stage } from "@/lib/types";

const STAGE_LABEL: Record<Stage, string> = {
  regular: "Regular season",
  semifinal: "Semifinal",
  final: "Final",
  third_place: "Third-place game",
};

export function RivalryExplorer({ league, defaultA, defaultB }: { league: League; defaultA: string; defaultB: string }) {
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)!.name;
  const h = useMemo(() => headToHead(league, a, b), [league, a, b]);
  const total = h.aWins + h.bWins + h.ties;
  const select = "rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm";
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  const catTotal = h.aCatWins + h.bCatWins + h.catTies;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="rv-a" className="text-xs text-muted">Manager A</label>
          <select id="rv-a" value={a} onChange={(e) => setA(e.target.value)} className={select}>
            {league.managers.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === b}>{m.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setA(b);
            setB(a);
          }}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
          aria-label="Swap managers"
        >
          ⇄ Swap
        </button>
        <div className="flex flex-col gap-1">
          <label htmlFor="rv-b" className="text-xs text-muted">Manager B</label>
          <select id="rv-b" value={b} onChange={(e) => setB(e.target.value)} className={select}>
            {league.managers.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === a}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          {nameOf(a)} and {nameOf(b)} were never in the league at the same time, so there is no head-to-head history.
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="text-3xl font-semibold tabular-nums">{h.aWins}</div>
                <div className="text-sm text-muted">{nameOf(a)}</div>
              </div>
              <div className="text-center text-sm text-muted">
                {total} matchups
                {h.ties > 0 && <div>{h.ties} tied</div>}
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold tabular-nums">{h.bWins}</div>
                <div className="text-sm text-muted">{nameOf(b)}</div>
              </div>
            </div>
            <div
              className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-2"
              role="img"
              aria-label={`${nameOf(a)} ${h.aWins} wins, ${nameOf(b)} ${h.bWins} wins, ${h.ties} ties`}
            >
              <div style={{ width: `${pct(h.aWins)}%`, background: "#f59e0b" }} />
              <div style={{ width: `${pct(h.ties)}%`, background: "#8b95a8" }} />
              <div style={{ width: `${pct(h.bWins)}%`, background: "#38bdf8" }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Mini label="Regular season" value={formatRecord(h.regular.aWins, h.regular.bWins, h.regular.ties)} note={`${nameOf(a)}'s W-L-T`} />
            <Mini label="Playoff meetings" value={String(h.playoffMeetings)} note={`${h.playoff.aWins}-${h.playoff.bWins} for ${nameOf(a)}`} />
            <Mini label="Finals meetings" value={String(h.finalMeetings)} />
            <Mini label="Category totals" value={`${h.aCatWins}-${h.bCatWins}`} note={`${h.catTies} tied · of ${catTotal}`} />
          </div>

          <div>
            <h2 className="mb-2 text-lg font-medium">By season</h2>
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-sm">
                <caption className="sr-only">Season-by-season head-to-head</caption>
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted">Season</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted">{nameOf(a)}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted">{nameOf(b)}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted">Ties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {h.byYear.map((y) => (
                    <tr key={y.year}>
                      <td className="px-3 py-2">{y.year - 1}-{String(y.year).slice(2)}</td>
                      <td className="px-3 py-2 tabular-nums">{y.aWins}</td>
                      <td className="px-3 py-2 tabular-nums">{y.bWins}</td>
                      <td className="px-3 py-2 tabular-nums">{y.ties}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <details>
            <summary className="cursor-pointer text-sm text-accent">All {total} matchups</summary>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-sm">
                <caption className="sr-only">Every head-to-head matchup</caption>
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted">Season</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted">Round</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted">Score (cats)</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted">Winner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...h.games].reverse().map((g, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap px-3 py-2">{g.year - 1}-{String(g.year).slice(2)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{g.stage === "regular" ? `Week ${g.week}` : STAGE_LABEL[g.stage]}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{g.aCats}-{g.bCats}{g.tiedCats ? `-${g.tiedCats}` : ""}</td>
                      <td className="whitespace-nowrap px-3 py-2">{g.winner ? nameOf(g.winner) : "Tie"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function Mini({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}
