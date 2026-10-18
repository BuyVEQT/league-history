"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { pct8, reducedMotion } from "./shared";

export interface CupOption {
  key: "miss" | "make" | "pass";
  label: string;
  pct: number;
  pts: number;
  score: readonly [number, number];
  champion: { teamName: string; manager: string; real: boolean };
  line: string;
  cup: string;
}

/** "Bruno had three options at 1:50": toggle between what happened and the two that crown Jacob. */
export function CupOptions({ options, target, winnerPts, names, clock }: { options: CupOption[]; target: number; winnerPts: number; names: [string, string]; clock: string }) {
  const [k, setK] = useState<CupOption["key"]>("miss");
  const s = options.find((o) => o.key === k)!;
  const [shown, setShown] = useState(s.pct);
  const from = useRef(s.pct);
  useEffect(() => {
    const a = from.current;
    from.current = s.pct;
    if (reducedMotion() || a === s.pct) return void queueMicrotask(() => setShown(s.pct));
    const f = d3.interpolateNumber(a, s.pct);
    const t = d3.timer((ms) => {
      const q = Math.min(1, ms / 700);
      setShown(f(q));
      if (q >= 1) t.stop();
    });
    return () => t.stop();
  }, [s.pct]);
  const TrophyIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
    </svg>
  );
  return (
    <>
      <div className="seg mb-4" role="group" aria-label="What Bruno does at 1:50">
        {options.map((o) => (
          <button key={o.key} type="button" aria-pressed={k === o.key} onClick={() => setK(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="opts-grid">
        <div className="bench-clock">
          <span className="num">{clock}</span>
          <small>left in the season</small>
        </div>
        <div className="hist" aria-live="polite">
          <div className="hist-grid">
            <div className="hist-box">
              <span>Jacob&apos;s FG%</span>
              <b className="num">{pct8(shown)}</b>
              <small>
                vs {pct8(target)} <span className={s.pct > target ? "pos" : "neg"}>{s.pct > target ? "wins FG%" : "loses FG%"}</span>
              </small>
            </div>
            <div className="hist-box">
              <span>Points</span>
              <b className="num">
                {winnerPts}–{s.pts}
              </b>
              <small className={s.pts > winnerPts ? "pos" : "neg"}>{s.pts > winnerPts ? "Jacob wins points" : `${names[0]} wins points`}</small>
            </div>
            <div className="hist-box">
              <span>Final</span>
              <b className="num">
                {s.score[0]}–{s.score[1]}
              </b>
              <small>
                {names[0]} – {names[1]}
              </small>
            </div>
            <div key={k} className={`hist-champ ${s.champion.real ? "real" : "alt"}`}>
              <div className="trophy">{TrophyIcon}</div>
              <div>
                <span>2018–19 champion</span>
                <b>{s.champion.teamName}</b>
                <small>{s.champion.manager}</small>
              </div>
            </div>
          </div>
          <p className="hist-line">{s.line}</p>
          <div className={`hist-cup ${k === "miss" ? "" : "strike"}`}>
            <span className="cupname">The Caboclo Cup</span>
            {s.cup && <span className="alt">{s.cup}</span>}
          </div>
        </div>
      </div>
    </>
  );
}
