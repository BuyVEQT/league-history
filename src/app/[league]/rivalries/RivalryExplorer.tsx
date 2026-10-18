"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatRecord } from "@/lib/analytics/format";
import { h2hMatrix, headToHead } from "@/lib/analytics/headToHead";
import { biggestBeatdown, seriesStreak } from "@/lib/analytics/rivalryView";
import type { League } from "@/lib/types";
import { CountUp } from "@/components/CountUp";
import { InfoTip } from "@/components/InfoTip";
import { monograms } from "@/components/viz/monograms";
import { TIPS } from "@/lib/explain";
import { MANAGER_TIPS } from "@/lib/explain/managers";
import { tt } from "@/components/viz/tt";
import { RivalTimeline, STAGE_LABEL } from "./RivalTimeline";
import { TugOfWar } from "./TugOfWar";

/** Mid gray at .500, full blue (leads) or red (trails) at 80% / 20% and beyond. */
const wash = (p: number) =>
  `color-mix(in srgb, var(${p >= 0.5 ? "--pos" : "--neg"}) ${Math.round(Math.min(1, Math.abs(p - 0.5) / 0.3) * 100)}%, var(--mid))`;

/** `children` (the rivalry index lists) sit between the pair panel and the everyone-vs-everyone grid. */
export function RivalryExplorer({ league, defaultA, defaultB, children }: { league: League; defaultA: string; defaultB: string; children?: ReactNode }) {
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)!.name;
  const h = useMemo(() => headToHead(league, a, b), [league, a, b]);
  const total = h.aWins + h.bWins + h.ties;
  const catTotal = h.aCatWins + h.bCatWins + h.catTies;
  const streak = seriesStreak(h.games);
  const big = biggestBeatdown(h.games);
  const years = useMemo(() => league.seasons.map((s) => ({ year: s.year, label: s.label })), [league]);
  const maxWeek = useMemo(() => Math.max(1, ...league.seasons.flatMap((s) => s.matchups.map((x) => x.week))), [league]);
  const maxCats = useMemo(() => Math.max(1, ...league.seasons.map((s) => s.categories.length)), [league]);
  const matrix = useMemo(() => h2hMatrix(league), [league]);
  const topRef = useRef<HTMLDivElement>(null);
  const initials = useMemo(() => monograms(league.managers), [league]);

  // Links from other pages pick the pair with #a=<id>&b=<id>.
  useEffect(() => {
    const read = (e?: Event) => {
      const q = new URLSearchParams(window.location.hash.slice(1));
      const ids = new Set(league.managers.map((m) => m.id));
      const qa = q.get("a");
      const qb = q.get("b");
      if (qa && qb && qa !== qb && ids.has(qa) && ids.has(qb)) {
        setA(qa);
        setB(qb);
        if (e) topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [league]);

  const pick = (x: string, y: string) => {
    setA(x);
    setB(y);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6" ref={topRef}>
      <div className="panel space-y-5 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <Picker id="rv-a" label="Manager A" value={a} other={b} onChange={setA} league={league} />
          <button
            type="button"
            onClick={() => {
              setA(b);
              setB(a);
            }}
            className="pill"
            aria-label="Swap managers"
          >
            ⇄ Swap
          </button>
          <Picker id="rv-b" label="Manager B" value={b} other={a} onChange={setB} league={league} />
          <span className="ml-auto text-xs text-muted">Or click any square in the grid below.</span>
        </div>

        {total === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            {nameOf(a)} and {nameOf(b)} were never in the league at the same time, so there is no head-to-head history.
          </div>
        ) : (
          <>
            <div>
              <div className="rv-vs">
                <div className="rv-side">
                  <span aria-hidden className="mono rv-mono">{initials.get(a)}</span>
                  <div>
                    <div className="rv-cnt" style={{ color: "var(--s1)" }}>
                      <CountUp value={h.aWins} />
                    </div>
                    <div className="font-bold">{nameOf(a)}</div>
                  </div>
                </div>
                <div className="rv-mid">
                  <div className="rv-lead">{h.aWins === h.bWins ? "Series is tied" : `${nameOf(h.aWins > h.bWins ? a : b)} leads`}</div>
                  {total} meeting{total === 1 ? "" : "s"}
                  {h.ties > 0 && ` · ${h.ties} tied`}
                </div>
                <div className="rv-side b">
                  <div>
                    <div className="rv-cnt" style={{ color: "var(--s2)" }}>
                      <CountUp value={h.bWins} />
                    </div>
                    <div className="font-bold">{nameOf(b)}</div>
                  </div>
                  <span aria-hidden className="mono rv-mono">{initials.get(b)}</span>
                </div>
              </div>
              <TugOfWar a={nameOf(a)} b={nameOf(b)} aWins={h.aWins} bWins={h.bWins} ties={h.ties} />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Mini label="Regular season" value={formatRecord(h.regular.aWins, h.regular.bWins, h.regular.ties)} note={`${nameOf(a)}'s W-L-T`} />
              <Mini
                label="Playoffs"
                value={`${h.playoff.aWins}-${h.playoff.bWins}`}
                note={
                  h.playoffMeetings
                    ? `${h.playoffMeetings} meeting${h.playoffMeetings === 1 ? "" : "s"}${h.finalMeetings ? ` · met in ${h.finalMeetings === 1 ? "a final" : `${h.finalMeetings} finals`}` : ""}`
                    : "never met in the playoffs"
                }
              />
              <Mini label="Categories" value={`${h.aCatWins}-${h.bCatWins}`} note={`${h.catTies} tied · of ${catTotal}, from ${nameOf(a)}'s side`} tip={TIPS.catTotals} />
              <Mini
                label="Current streak"
                value={streak ? String(streak.length) : "—"}
                note={streak ? `straight for ${nameOf(streak.winner)}` : "last meeting was a tie"}
                tip={MANAGER_TIPS.currentStreak}
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-[.1em] text-muted">Every meeting</div>
              <div className="overflow-x-auto">
                <RivalTimeline games={h.games} years={years} maxWeek={maxWeek} maxCats={maxCats} aId={a} a={nameOf(a)} b={nameOf(b)} />
              </div>
              <div className="viz-legend mt-1">
                <span><i className="dot" style={{ background: "var(--s1)" }} />{nameOf(a)} won</span>
                <span><i className="dot" style={{ background: "var(--s2)" }} />{nameOf(b)} won</span>
                <span><i className="dot" style={{ boxShadow: "inset 0 0 0 2px var(--gold)" }} />Playoffs</span>
                <span><i className="dot" style={{ background: "var(--border-2)" }} />Tie</span>
                <span>Height = category margin</span>
              </div>
              {big && (
                <p className="mt-2 text-xs text-muted">
                  Biggest beatdown: {big.winner ? nameOf(big.winner) : "nobody"} {big.winner ? "won" : "tied"} {Math.max(big.aCats, big.bCats)}-{Math.min(big.aCats, big.bCats)} in{" "}
                  {big.year - 1}-{String(big.year).slice(2)}, {big.stage === "regular" ? `week ${big.week}` : STAGE_LABEL[big.stage].toLowerCase()}.
                </p>
              )}
            </div>

            <details>
              <summary className="text-sm text-accent">Season by season, and all {total} matchups</summary>
              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                <div className="overflow-x-auto rounded-[10px] border border-border">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Season-by-season head-to-head</caption>
                    <thead>
                      <tr>
                        {["Season", nameOf(a), nameOf(b), "Ties"].map((x) => (
                          <th key={x} className="px-3 py-2 text-left text-xs font-bold uppercase text-muted">
                            {x}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {h.byYear.map((y) => (
                        <tr key={y.year}>
                          <td className="px-3 py-2">
                            {y.year - 1}-{String(y.year).slice(2)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{y.aWins}</td>
                          <td className="px-3 py-2 tabular-nums">{y.bWins}</td>
                          <td className="px-3 py-2 tabular-nums">{y.ties}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="max-h-80 overflow-auto rounded-[10px] border border-border">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Every head-to-head matchup</caption>
                    <thead>
                      <tr>
                        {["Season", "Round", "Score (cats)", "Winner"].map((x) => (
                          <th key={x} className="px-3 py-2 text-left text-xs font-bold uppercase text-muted">
                            {x}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...h.games].reverse().map((g, i) => (
                        <tr key={i}>
                          <td className="whitespace-nowrap px-3 py-2">
                            {g.year - 1}-{String(g.year).slice(2)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">{g.stage === "regular" ? `Week ${g.week}` : STAGE_LABEL[g.stage]}</td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {g.aCats}-{g.bCats}
                            {g.tiedCats ? `-${g.tiedCats}` : ""}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">{g.winner ? nameOf(g.winner) : "Tie"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </>
        )}
      </div>

      {children}

      <section className="space-y-3">
        <h2 className="sec-title flex items-center gap-2">
          Everyone vs everyone <InfoTip down text={MANAGER_TIPS.h2hGrid} />
        </h2>
        <div className="panel space-y-3 p-5">
          <p className="text-sm text-[color:var(--ink-2)]">
            Each row&apos;s record against each column, regular season and playoffs. Blue = the row manager leads the series, red = trails. Click a
            square to load that rivalry above.
          </p>
          <div className="overflow-x-auto">
            <div
              className="grid gap-[3px] text-[11.5px]"
              style={{ gridTemplateColumns: `minmax(80px, max-content) repeat(${matrix.ids.length}, minmax(40px, 46px))` }}
            >
              <span />
              {matrix.ids.map((id) => (
                <span key={id} title={nameOf(id)} className={`pb-1 text-center text-muted ${id === b ? "font-extrabold text-foreground" : ""}`}>
                  {initials.get(id)}
                </span>
              ))}
              {matrix.ids.map((r, i) => (
                <div key={r} className="contents">
                  <span className={`self-center whitespace-nowrap pr-2 text-right text-[12.5px] ${r === a ? "font-extrabold" : "font-semibold"}`}>{nameOf(r)}</span>
                  {matrix.ids.map((c, j) => {
                    if (r === c) return <span key={c} className="h-10 rounded-[5px] bg-surface-2" />;
                    const x = matrix.cells[r]?.[c];
                    const games = x ? x.wins + x.losses + x.ties : 0;
                    if (!x || !games) return <span key={c} className="h-10" />;
                    const p = (x.wins + 0.5 * x.ties) / games;
                    const selected = r === a && c === b;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => pick(r, c)}
                        data-tt={tt(`${nameOf(r)} vs ${nameOf(c)}`, [
                          ["Record", `${x.wins}-${x.losses}-${x.ties}`],
                          ["Win %", `${Math.round(p * 100)}%`],
                          ["Meetings", games],
                        ], "Click to compare")}
                        aria-label={`Compare ${nameOf(r)} and ${nameOf(c)}: ${x.wins} wins, ${x.losses} losses, ${x.ties} ties`}
                        className="rv-cell h-10 min-h-0 rounded-[5px] font-bold tabular-nums transition-transform hover:scale-105"
                        style={{
                          animationDelay: `${(i + j) * 18}ms`,
                          background: wash(p),
                          color: Math.abs(p - 0.5) > 0.2 ? "#fff" : "var(--foreground)",
                          boxShadow: selected ? "inset 0 0 0 2.5px var(--foreground)" : undefined,
                        }}
                      >
                        {x.wins}-{x.losses}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-legend">
            <span><i style={{ background: "var(--neg)" }} />Row trails</span>
            <span><i style={{ background: "var(--mid)" }} />Even</span>
            <span><i style={{ background: "var(--pos)" }} />Row leads</span>
            <span>No square = never played</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Picker({ id, label, value, other, onChange, league }: { id: string; label: string; value: string; other: string; onChange: (v: string) => void; league: League }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-[color:var(--border-2)] bg-surface px-2 py-1.5 text-sm font-semibold">
        {league.managers.map((m) => (
          <option key={m.id} value={m.id} disabled={m.id === other}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function Mini({ label, value, note, tip }: { label: string; value: string; note?: string; tip?: string }) {
  return (
    <div className="tile relative">
      <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--ink-2)]">
        {label}
        {tip && <InfoTip box text={tip} />}
      </div>
      <div className="font-display text-[28px] font-extrabold leading-tight tabular-nums">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}
