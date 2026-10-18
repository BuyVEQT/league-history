"use client";

import { useMemo, useRef, useState } from "react";
import { formatRecord } from "@/lib/analytics/format";
import { h2hMatrix, headToHead } from "@/lib/analytics/headToHead";
import { InfoTip } from "@/components/InfoTip";
import { TIPS } from "@/lib/explain";
import type { League, Stage } from "@/lib/types";

const STAGE_LABEL: Record<Stage, string> = {
  regular: "Regular season",
  quarterfinal: "Quarterfinal",
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
  const matrix = useMemo(() => h2hMatrix(league), [league]);
  const topRef = useRef<HTMLDivElement>(null);
  const initials = (id: string) =>
    nameOf(id)
      .split(/[s.]+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2);
  const tone = (p: number) =>
    p >= 0.65 ? "bg-positive/35" : p >= 0.55 ? "bg-positive/20" : p > 0.45 ? "" : p > 0.35 ? "bg-negative/20" : "bg-negative/35";

  return (
    <div className="space-y-6" ref={topRef}>
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
          <div className="rounded-xl border border-border bg-surface/80 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)] p-4">
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
            <Mini label="Category totals" value={`${h.aCatWins}-${h.bCatWins}`} note={`${h.catTies} tied · of ${catTotal}`} tip={TIPS.catTotals} />
          </div>

          <div>
            <h2 className="mb-2 text-lg font-medium">By season</h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface/80 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)]">
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
                    <tr key={y.year} className="transition-colors hover:bg-surface-2/60">
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
            <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-surface/80 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)]">
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
                    <tr key={i} className="transition-colors hover:bg-surface-2/60">
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
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-medium">
          Everyone vs everyone <InfoTip down text={TIPS.h2hGrid} />
        </h2>
        <p className="mb-2 text-xs text-muted">
          Each row manager&apos;s record against each column manager (W-L, regular season and playoffs). Click a cell to compare them above.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/80">
          <table className="border-collapse text-xs">
            <caption className="sr-only">Head-to-head records between every pair of managers</caption>
            <thead>
              <tr>
                <th className="sticky left-0 bg-surface px-2 py-2" />
                {matrix.ids.map((id) => (
                  <th key={id} scope="col" title={nameOf(id)} className="min-w-11 px-1 py-2 text-center font-medium text-muted">
                    {initials(id)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.ids.map((r) => (
                <tr key={r} className="border-t border-border">
                  <th scope="row" className="sticky left-0 whitespace-nowrap bg-surface px-2 py-1 text-left font-medium">
                    {nameOf(r)}
                  </th>
                  {matrix.ids.map((c) => {
                    if (r === c) return <td key={c} className="bg-surface-2" />;
                    const x = matrix.cells[r]?.[c];
                    const games = x ? x.wins + x.losses + x.ties : 0;
                    if (!x || !games) {
                      return (
                        <td key={c} className="text-center text-muted">
                          ·
                        </td>
                      );
                    }
                    const p = (x.wins + 0.5 * x.ties) / games;
                    return (
                      <td key={c} className={`border-l border-border ${tone(p)}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setA(r);
                            setB(c);
                            topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          title={`${nameOf(r)} vs ${nameOf(c)}: ${x.wins}-${x.losses}-${x.ties}`}
                          aria-label={`Compare ${nameOf(r)} and ${nameOf(c)}: ${x.wins} wins, ${x.losses} losses, ${x.ties} ties`}
                          className="w-full px-1.5 py-1.5 tabular-nums hover:outline hover:outline-1 hover:outline-accent"
                        >
                          {x.wins}-{x.losses}
                          {x.ties ? `-${x.ties}` : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, note, tip }: { label: string; value: string; note?: string; tip?: string }) {
  return (
    <div className="relative rounded-xl border border-border bg-surface/80 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)] p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
        {label}
        {tip && <InfoTip box text={tip} />}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}
