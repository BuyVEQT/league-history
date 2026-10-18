"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { pickTone, rankLabel, signed } from "@/components/draft";
import { tt } from "@/components/viz/tt";
import type { PickValue } from "@/lib/analytics/draft";
import { cellKey, replayBoard, replayVerdict, tickerStep } from "@/lib/analytics/replayView";

/** Milliseconds between picks at 1× and 3×. */
const SPEEDS = { "1×": 420, "3×": 140 } as const;
type Speed = keyof typeof SPEEDS;
/** Reveal wave: delay between consecutive cells flipping. */
const WAVE = 12;

type Phase = "rest" | "drafting" | "paused" | "drafted" | "reveal" | "done" | "sofar";

const noop = () => () => {};
/** True once hydrated: the replay controls only exist with JS; the server and no-JS board is the finished one. */
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
);
const PLAY = "M7 4v16l13-8L7 4Z";
const PAUSE = "M7 4h4v16H7zM13 4h4v16h-4z";
const BOLT = "M13 2 4 14h7l-1 8 9-12h-7l1-8Z";

/**
 * A season's draft board with a draft-night replay. At rest (and on the server, without JS, and for screen readers)
 * it is the finished board in its result colours; Replay empties it and refills it pick by pick in snake order,
 * then Reveal flips every cell to how the pick turned out and the ticker gives the verdict.
 * A live (upcoming) draft replays the picks made so far and has no reveal, since nothing has been played yet.
 */
export function DraftReplay({
  picks,
  label,
  live,
  managerNames,
  colSub,
  children,
}: {
  picks: PickValue[];
  label: string;
  live: boolean;
  managerNames: Record<string, string>;
  /** Second header line per team id: final place, or the team name. */
  colSub: Record<string, string>;
  /** Rendered under the board inside its panel (the legend). */
  children?: ReactNode;
}) {
  const board = useMemo(() => replayBoard(picks), [picks]);
  const verdict = useMemo(() => (live ? { steal: null, bust: null } : replayVerdict(picks)), [picks, live]);
  const { order, columns, rounds, cells } = board;
  const total = order.length;
  const indexOf = useMemo(() => new Map(order.map((p, i) => [p.overall, i])), [order]);
  const name = (id: string) => managerNames[id] ?? id;

  const hydrated = useHydrated();
  const [phase, setPhase] = useState<Phase>("rest");
  const [shown, setShown] = useState(total);
  const [speed, setSpeed] = useState<Speed>("1×");
  const shownRef = useRef(total);

  const show = (n: number) => {
    shownRef.current = n;
    setShown(n);
  };
  const finish = () => {
    show(total);
    setPhase(live ? "sofar" : reducedMotion() ? "done" : "reveal");
  };

  // Draft picks one at a time while playing.
  useEffect(() => {
    if (phase !== "drafting") return;
    const timer = setInterval(() => {
      const n = shownRef.current + 1;
      shownRef.current = n;
      setShown(n);
      if (n >= total) setPhase(live ? "sofar" : "drafted");
    }, SPEEDS[speed]);
    return () => clearInterval(timer);
  }, [phase, speed, total, live]);

  // The reveal wave runs, then the verdict.
  useEffect(() => {
    if (phase !== "reveal") return;
    const timer = setTimeout(() => setPhase("done"), 60 + total * WAVE + 400);
    return () => clearTimeout(timer);
  }, [phase, total]);

  const onPlay = () => {
    if (phase === "rest" || phase === "done" || phase === "sofar" || phase === "reveal") {
      // Reduced motion: no pick-by-pick animation, straight to the end.
      if (reducedMotion()) return finish();
      show(0);
      setPhase("drafting");
    } else if (phase === "drafting") setPhase("paused");
    else if (phase === "paused") setPhase("drafting");
    else if (phase === "drafted") setPhase("reveal");
  };

  const filling = phase === "drafting" || phase === "paused" || phase === "drafted";
  const clockTeam = phase === "drafting" || phase === "paused" ? order[shown]?.teamId : undefined;

  const playLabel: [string, string] =
    phase === "drafting" ? ["Pause", PAUSE] : phase === "paused" ? ["Resume", PLAY] : phase === "drafted" ? ["Reveal how it went", BOLT] : ["Replay draft night", PLAY];

  const b = (s: string) => <b>{s}</b>;
  const pickLine = (p: PickValue) => (
    <>
      {b(p.playerName)} (#{p.overall} → {rankLabel(p.actualRank)}, {signed(p.value, 1)}, {name(p.managerId)})
    </>
  );
  let ticker: [string, ReactNode];
  if (phase === "rest")
    ticker = live
      ? [`${label} draft`, `${total} picks in so far · ${columns.length} teams. Press play to watch them go in.`]
      : [`${label} draft`, `${total} picks · ${columns.length} teams · ${rounds} rounds. Press play to relive it pick by pick.`];
  else if (filling && shown === 0)
    ticker = ["Draft night", <>{b(name(order[0]?.managerId ?? ""))} is on the clock with the first pick.</>];
  else if (phase === "drafted") ticker = ["Draft complete", "Every roster is set. Now skip to the end of the season…"];
  else if (filling) {
    const s = tickerStep(order, shown)!;
    ticker = [
      s.head,
      <>
        {b(name(s.pick.managerId))} selects {b(s.pick.playerName)}
        {s.next && <span className="rp-dim"> · {name(s.next.managerId)} is on the clock</span>}
      </>,
    ];
  } else if (phase === "sofar") ticker = ["That's the board so far", `${total} picks in. The rest of draft night is still to come.`];
  else if (phase === "reveal") ticker = ["Season's over", "Here's how every pick turned out…"];
  else
    ticker = [
      "Verdict",
      <>
        {verdict.steal && <>Steal: {pickLine(verdict.steal)}</>}
        {verdict.steal && verdict.bust && " · "}
        {verdict.bust && <>Bust: {pickLine(verdict.bust)}</>}
      </>,
    ];

  const renderCell = (p: PickValue) => {
    const i = indexOf.get(p.overall) ?? 0;
    const hid = filling && i >= shown;
    const drafted = filling && i < shown;
    const final = live ? "plain" : pickTone(p.value);
    const cls = hid ? "rp-hid" : drafted ? `rp-drafted rp-pop${live ? "" : " rp-pending"}` : phase === "reveal" ? `${final} rp-flip` : final;
    const tip = hid
      ? tt(`Pick #${p.overall}`, [["Round", `${p.round}, pick ${p.pick}`]], "Not on the board yet")
      : live || drafted
        ? tt(p.playerName, [["Pick", `Rd ${p.round}, #${p.overall} overall`], ["Drafted by", name(p.managerId)]])
        : tt(p.playerName, [
            ["Pick", `Rd ${p.round}, #${p.overall} overall`],
            ["Drafted by", name(p.managerId)],
            ["Finished", rankLabel(p.actualRank)],
            ["Preseason rank", p.preseasonRank === null ? "—" : `#${p.preseasonRank}`],
            ["Value", signed(p.value, 1)],
          ]);
    return (
      <div
        className={`pick ${cls}`}
        tabIndex={0}
        data-tt={tip}
        data-panel={`player:${p.playerId}`}
        data-m={p.managerId}
        style={phase === "reveal" ? ({ "--rp-d": `${30 + i * WAVE}ms` } as CSSProperties) : undefined}
      >
        <span className="rp-no" aria-hidden={!hid}>
          #{p.overall}
        </span>
        <div className="pn">{p.playerName}</div>
        {live ? (
          <div className="pm">#{p.overall}</div>
        ) : (
          <div className="pm">
            <span>{rankLabel(p.actualRank)}</span>
            <span>{signed(p.value, 1)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rp">
      {hydrated && total > 0 && (
        <div className="rp-bar">
          <button type="button" className="play-btn" onClick={onPlay}>
            <Icon d={playLabel[1]} />
            {playLabel[0]}
          </button>
          <div className="seg" role="group" aria-label="Replay speed">
            {(Object.keys(SPEEDS) as Speed[]).map((s) => (
              <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                {s}
              </button>
            ))}
          </div>
          {(phase === "drafting" || phase === "paused") && (
            <button type="button" className="rp-btn" onClick={finish}>
              Skip to the end
            </button>
          )}
          <div className="rp-ticker" aria-live="polite">
            <span className="k">{ticker[0]}</span>
            <span className="t">{ticker[1]}</span>
          </div>
        </div>
      )}
      <div className="panel overflow-x-auto p-3">
        <table className="rp-board w-full table-fixed border-separate border-spacing-[3px] text-xs" style={{ minWidth: columns.length * 92 + 36 }}>
          <caption className="sr-only">{label} draft board by round and team</caption>
          <thead>
            <tr>
              <th className="w-9 px-1 pb-2 text-left align-bottom text-[11px] font-bold uppercase tracking-wider text-muted">Rd</th>
              {columns.map((c) => (
                <th
                  key={c.teamId}
                  className={`px-1 pb-2 text-left align-bottom font-normal${clockTeam === c.teamId ? " rp-clock" : ""}`}
                  title={c.teamName}
                >
                  <div className="truncate text-[12.5px] font-bold text-foreground">{name(c.managerId)}</div>
                  <div className="truncate text-[11px] text-muted">{colSub[c.teamId] ?? c.teamName}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => (
              <tr key={round}>
                <td className="px-1 text-muted tabular-nums">{round}</td>
                {columns.map((c) => {
                  const p = cells.get(cellKey(c.teamId, round));
                  return (
                    <td key={c.teamId} className="p-0 align-top">
                      {p && renderCell(p)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {children}
      </div>
    </div>
  );
}
