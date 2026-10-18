"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatRecord } from "@/lib/analytics/format";
import { h2hMatrix, headToHead, type H2HGame } from "@/lib/analytics/headToHead";
import type { League, Stage } from "@/lib/types";
import { monograms } from "@/components/viz/monograms";
import { tt } from "@/components/viz/tt";

const STAGE_LABEL: Record<Stage, string> = {
  regular: "Regular season",
  quarterfinal: "Quarterfinal",
  semifinal: "Semifinal",
  final: "Final",
  third_place: "Third-place game",
};

/** Mid gray at .500, full blue (leads) or red (trails) at 80% / 20% and beyond. */
const wash = (p: number) =>
  `color-mix(in srgb, var(${p >= 0.5 ? "--pos" : "--neg"}) ${Math.round(Math.min(1, Math.abs(p - 0.5) / 0.3) * 100)}%, var(--mid))`;

export function RivalryExplorer({ league, defaultA, defaultB }: { league: League; defaultA: string; defaultB: string }) {
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)!.name;
  const h = useMemo(() => headToHead(league, a, b), [league, a, b]);
  const total = h.aWins + h.bWins + h.ties;
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  const catTotal = h.aCatWins + h.bCatWins + h.catTies;
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
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="font-display text-5xl font-black leading-none tabular-nums" style={{ color: "var(--s1)" }}>
                    {h.aWins}
                  </div>
                  <div className="mt-1 font-semibold">{nameOf(a)}</div>
                </div>
                <div className="text-center text-sm text-muted">
                  {total} meeting{total === 1 ? "" : "s"}
                  {h.ties > 0 && <div>{h.ties} tied</div>}
                </div>
                <div className="text-right">
                  <div className="font-display text-5xl font-black leading-none tabular-nums" style={{ color: "var(--s2)" }}>
                    {h.bWins}
                  </div>
                  <div className="mt-1 font-semibold">{nameOf(b)}</div>
                </div>
              </div>
              <div
                className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-2"
                role="img"
                aria-label={`${nameOf(a)} ${h.aWins} wins, ${nameOf(b)} ${h.bWins} wins, ${h.ties} ties`}
              >
                <div className="transition-[width] duration-500" style={{ width: `${pct(h.aWins)}%`, background: "var(--s1)" }} />
                <div className="transition-[width] duration-500" style={{ width: `${pct(h.ties)}%`, background: "var(--border-2)" }} />
                <div className="transition-[width] duration-500" style={{ width: `${pct(h.bWins)}%`, background: "var(--s2)" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Mini label="Regular season" value={formatRecord(h.regular.aWins, h.regular.bWins, h.regular.ties)} note={`${nameOf(a)}'s W-L-T`} />
              <Mini label="Playoff meetings" value={String(h.playoffMeetings)} note={`${h.playoff.aWins}-${h.playoff.bWins} for ${nameOf(a)}`} />
              <Mini label="Finals meetings" value={String(h.finalMeetings)} />
              <Mini label="Category totals" value={`${h.aCatWins}-${h.bCatWins}`} note={`${h.catTies} tied · of ${catTotal}`} />
            </div>

            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-[.1em] text-muted">Every meeting</div>
              <Timeline games={h.games} seasons={league.seasons} aId={a} a={nameOf(a)} b={nameOf(b)} />
              <div className="viz-legend mt-1">
                <span><i className="dot" style={{ background: "var(--s1)" }} />{nameOf(a)} won</span>
                <span><i className="dot" style={{ background: "var(--s2)" }} />{nameOf(b)} won</span>
                <span><i className="dot" style={{ boxShadow: "inset 0 0 0 2px var(--gold)" }} />Playoffs</span>
                <span>Height = category margin</span>
              </div>
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

      <section className="space-y-3">
        <h2 className="sec-title">Everyone vs everyone</h2>
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
              {matrix.ids.map((r) => (
                <div key={r} className="contents">
                  <span className={`self-center whitespace-nowrap pr-2 text-right text-[12.5px] ${r === a ? "font-extrabold" : "font-semibold"}`}>{nameOf(r)}</span>
                  {matrix.ids.map((c) => {
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
                        className="h-10 min-h-0 rounded-[5px] font-bold tabular-nums transition-transform hover:scale-105"
                        style={{
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

/** Every meeting on a season-by-season strip: up for A's wins, down for B's, by category margin. */
function Timeline({ games, seasons, aId, a, b }: { games: H2HGame[]; seasons: League["seasons"]; aId: string; a: string; b: string }) {
  const W = 1000;
  const H = 170;
  const m = { t: 14, b: 26 };
  const years = seasons.map((s) => s.year);
  const gap = 8;
  const bw = (W - gap * (years.length - 1)) / years.length;
  const maxWk = Math.max(...seasons.flatMap((s) => s.matchups.map((x) => x.week)));
  const mid = (H - m.b + m.t) / 2;
  const half = (H - m.b - m.t) / 2;
  const maxCats = Math.max(...seasons.map((s) => s.categories.length));
  const x = (g: H2HGame) => years.indexOf(g.year) * (bw + gap) + ((g.week - 0.5) / maxWk) * bw;
  const y = (g: H2HGame) => mid - ((g.aCats - g.bCats) / maxCats) * half;
  return (
    <svg className="viz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Every meeting between ${a} and ${b}`}>
      {seasons.map((s, i) => (
        <g key={s.year}>
          <rect x={i * (bw + gap)} y={m.t} width={bw} height={H - m.b - m.t} rx={4} fill="var(--surface-2)" />
          <text className="lbl" x={i * (bw + gap) + bw / 2} y={H - 8} textAnchor="middle">
            {s.label}
          </text>
        </g>
      ))}
      <line x1={0} x2={W} y1={mid} y2={mid} stroke="var(--border-2)" />
      <text className="lbl" x={4} y={m.t + 12}>
        ▲ {a}
      </text>
      <text className="lbl" x={4} y={H - m.b - 5}>
        ▼ {b}
      </text>
      {games.map((g, i) => {
        const color = g.winner === null ? "var(--border-2)" : g.winner === aId ? "var(--s1)" : "var(--s2)";
        const po = g.stage !== "regular";
        return (
          <g
            key={i}
            data-tt={tt(`${g.year - 1}-${String(g.year).slice(2)} · ${po ? STAGE_LABEL[g.stage] : `Week ${g.week}`}`, [
              [a, g.aCats],
              [b, g.bCats],
              ["Tied categories", g.tiedCats],
            ], g.winner === null ? "Tied week" : `${g.winner === aId ? a : b} won${po && g.aCats === g.bCats ? " on seed" : ""}`)}
          >
            <line x1={x(g)} x2={x(g)} y1={mid} y2={y(g)} stroke={color} strokeWidth={2} />
            <circle cx={x(g)} cy={y(g)} r={po ? 6 : 4.5} fill={color} stroke={po ? "var(--gold)" : "var(--surface)"} strokeWidth={po ? 2.5 : 1.5} />
          </g>
        );
      })}
    </svg>
  );
}

function Mini({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="tile">
      <div className="text-[12.5px] font-semibold text-[color:var(--ink-2)]">{label}</div>
      <div className="font-display text-[28px] font-extrabold leading-tight tabular-nums">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}
