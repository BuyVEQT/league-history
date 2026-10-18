"use client";

import { useState } from "react";
import type { MarginRow } from "@/lib/analytics/records";
import { tt } from "./tt";

/** Wins (right, blue) and losses (left, red) in one-category weeks or in blowouts, toggled. */
export function CoinFlip({ rows, names }: { rows: MarginRow[]; names: Record<string, string> }) {
  const [kind, setKind] = useState<"close" | "blowout">("close");
  const w = kind === "close" ? "closeWins" : "blowoutWins";
  const l = kind === "close" ? "closeLosses" : "blowoutLosses";
  const sorted = [...rows].sort((a, b) => b[w] - b[l] - (a[w] - a[l]) || b[w] - a[w]);
  const max = Math.max(1, ...sorted.flatMap((r) => [r[w], r[l]]));
  return (
    <div className="space-y-3">
      <div className="seg" role="group" aria-label="Which weeks">
        <button type="button" aria-pressed={kind === "close"} onClick={() => setKind("close")}>
          One-category weeks
        </button>
        <button type="button" aria-pressed={kind === "blowout"} onClick={() => setKind("blowout")}>
          Blowouts (7+)
        </button>
      </div>
      <div className="grid grid-cols-[minmax(64px,max-content)_1fr_1fr] items-center gap-x-0 gap-y-1.5 text-[12.5px]">
        <span />
        <span className="pr-2 text-right text-[11px] text-muted">◀ losses</span>
        <span className="pl-2 text-[11px] text-muted">wins ▶</span>
        {sorted.map((r) => (
          <div
            key={r.managerId}
            className="contents"
            data-tt={tt(names[r.managerId], [
              ["One-category weeks", `${r.closeWins}-${r.closeLosses}`],
              ["Blowouts (7+)", `${r.blowoutWins}-${r.blowoutLosses}`],
            ])}
          >
            <span className="truncate pr-3 text-right font-semibold">{names[r.managerId]}</span>
            <span className="flex h-[18px] items-center justify-end gap-1.5 border-r border-[color:var(--border-2)] pr-px">
              <span className="text-muted tabular-nums">{r[l]}</span>
              <span className="rec-grow-l h-full rounded-l-[4px] transition-[width] duration-500" style={{ width: `calc(${(r[l] / max) * 100}% - 28px)`, background: "var(--neg)", minWidth: r[l] ? 2 : 0 }} />
            </span>
            <span className="flex h-[18px] items-center gap-1.5 pl-px">
              <span className="rec-grow-r h-full rounded-r-[4px] transition-[width] duration-500" style={{ width: `calc(${(r[w] / max) * 100}% - 28px)`, background: "var(--pos)", minWidth: r[w] ? 2 : 0 }} />
              <span className="text-muted tabular-nums">{r[w]}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
