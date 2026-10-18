"use client";

import { useEffect, useState } from "react";
import { tt } from "@/components/viz/tt";

/**
 * Three-part bar (A's wins | ties | B's wins) that pulls in from nothing on mount and slides
 * to the new split when the pair changes. Reduced motion: the global rule turns the transition off.
 */
export function TugOfWar({ a, b, aWins, bWins, ties }: { a: string; b: string; aWins: number; bWins: number; ties: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const total = aWins + bWins + ties || 1;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  const parts = [
    { key: "a", n: aWins, color: "var(--s1)", tip: tt(`${a} won`, [["Meetings", aWins], ["Share", pct(aWins)]]) },
    { key: "t", n: ties, color: "var(--border-2)", tip: tt("Tied weeks", [["Meetings", ties], ["Share", pct(ties)]]) },
    { key: "b", n: bWins, color: "var(--s2)", tip: tt(`${b} won`, [["Meetings", bWins], ["Share", pct(bWins)]]) },
  ];
  return (
    <div className="rv-tug" role="img" aria-label={`${a} ${aWins} wins, ${ties} ties, ${b} ${bWins} wins`}>
      {parts.map((p) => (
        <div key={p.key} data-tt={p.tip} style={{ flexGrow: shown ? p.n : 0, background: p.color }} />
      ))}
    </div>
  );
}
