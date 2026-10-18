import Link from "next/link";
import type { RivalRecord } from "@/lib/analytics/headToHead";
import { tt } from "./tt";

/** Win % against each opponent as a bar out from .500: right and blue = winning record, left and red = losing. */
export function H2HBars({ rows, name, nameOf, href }: { rows: RivalRecord[]; name: string; nameOf: (id: string) => string; href: string }) {
  const sorted = [...rows].sort((a, b) => b.winPct - a.winPct || b.games - a.games);
  return (
    <div className="space-y-2" role="group" aria-label={`${name}: head-to-head win % against each opponent`}>
      <div className="rowchart">
        <span />
        <div className="relative flex justify-between text-[11px] text-muted">
          <span>0%</span>
          <span className="absolute left-1/2 -translate-x-1/2">50%</span>
          <span>100%</span>
        </div>
        <span />
        {sorted.map((r, i) => {
          const left = Math.min(r.winPct, 0.5) * 100;
          const width = Math.max(0.6, Math.abs(r.winPct - 0.5) * 100);
          return (
            <Link
              key={r.opponentId}
              href={`${href}&b=${r.opponentId}`}
              className="contents"
              aria-label={`${name} vs ${nameOf(r.opponentId)}: ${r.wins}-${r.losses}-${r.ties}, open the rivalry`}
              data-tt={tt(`${name} vs ${nameOf(r.opponentId)}`, [
                ["Record", `${r.wins}-${r.losses}-${r.ties}`],
                ["Win %", `${Math.round(r.winPct * 100)}%`],
                ["Meetings", r.games],
              ], "Click to open the rivalry")}
            >
              <span className="nm">{nameOf(r.opponentId)}</span>
              <span className="trk" style={{ background: "linear-gradient(90deg, transparent calc(50% - .5px), var(--border-2) calc(50% - .5px), var(--border-2) calc(50% + .5px), transparent calc(50% + .5px))" }}>
                <span
                  className={`bar mg-bar ${r.winPct >= 0.5 ? "from-l" : "from-r"}`}
                  style={{ left: `${left}%`, width: `${width}%`, background: r.winPct >= 0.5 ? "var(--pos)" : "var(--neg)", animationDelay: `${i * 35}ms` }}
                />
              </span>
              <span className="v">
                {r.wins}-{r.losses}
                {r.ties ? `-${r.ties}` : ""}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
