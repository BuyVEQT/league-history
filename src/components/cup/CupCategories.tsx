"use client";

import { useCallback, useEffect, useState } from "react";
import { ResetIcon, reducedMotion } from "./shared";

export interface CupCategory {
  key: string;
  label: string;
  winnerValue: string;
  loserValue: string;
  winner: "w" | "l";
  winnerName: string;
  winnerInitials: string;
  /** "one steal", "one point", "one shot": the three photo finishes get big cards. */
  decidedBy?: string;
}

/** Nine face-down cards that flip one by one: six quick ones, then the three photo finishes, with a running tally. */
export function CupCategories({ cats, final, names }: { cats: CupCategory[]; final: [number, number]; names: [string, string] }) {
  const [open, setOpen] = useState(cats.length);
  const [tally, setTally] = useState<[number, number]>(final);
  const small = cats.filter((c) => !c.decidedBy);
  const big = cats.filter((c) => c.decidedBy);
  const order = [...small, ...big];

  const flip = useCallback(() => {
    if (reducedMotion()) {
      const t = setTimeout(() => {
        setOpen(order.length);
        setTally(final);
      });
      return () => clearTimeout(t);
    }
    const reset = setTimeout(() => {
      setOpen(0);
      setTally([0, 0]);
    });
    const timers = order.map((c, i) =>
      setTimeout(
        () => {
          setOpen(i + 1);
          setTally((t) => (c.winner === "w" ? [t[0] + 1, t[1]] : [t[0], t[1] + 1]));
        },
        300 + (i < small.length ? i * 180 : small.length * 180 + (i - small.length) * 900),
      ),
    );
    return () => [reset, ...timers].forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats]);

  useEffect(() => flip(), [flip]);

  const card = (c: CupCategory) => {
    const on = order.indexOf(c) < open;
    return (
      <div key={c.key} className={`cat ${c.decidedBy ? "close" : ""} ${on ? "on" : ""}`}>
        <div className="cat-in">
          <div className="cat-f" aria-hidden={on}>
            <span>{c.label}</span>
            <b>?</b>
          </div>
          <div className={`cat-b ${c.winner}`} aria-hidden={!on}>
            <span>
              {c.label}
              {c.decidedBy && <em>decided by {c.decidedBy}</em>}
            </span>
            <div className="cat-v">
              <b className="num">{c.winnerValue}</b>
              <i>vs</i>
              <b className="num">{c.loserValue}</b>
            </div>
            <div className="cat-w">
              <span className="mono size-[22px] text-[10px]">{c.winnerInitials}</span>
              <span>{c.winnerName}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-end">
        <button type="button" className="cup-btn" onClick={() => flip()}>
          <ResetIcon />
          <span>Flip again</span>
        </button>
      </div>
      <div className="cats">{small.map(card)}</div>
      <div className="cats-big">{big.map(card)}</div>
      <div className="cats-score" aria-live="polite">
        <span>
          <b>{names[0]}</b>
        </span>
        <b className="num">
          {tally[0]}–{tally[1]}
        </b>
        <span>
          <b>{names[1]}</b>
        </span>
      </div>
    </>
  );
}
