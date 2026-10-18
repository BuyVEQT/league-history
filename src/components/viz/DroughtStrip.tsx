import { ordinal } from "@/lib/analytics/format";
import type { DroughtRow } from "@/lib/analytics/records";
import { tt } from "./tt";

/** One square per season per manager: gold = title, red wash = the current drought, dashed = not in the league. */
export function DroughtStrip({
  rows,
  seasons,
  finishes,
  nameOf,
}: {
  rows: DroughtRow[];
  seasons: { year: number; label: string }[];
  finishes: Record<string, Record<number, { final: number; teams: number; teamName: string }>>;
  nameOf: (id: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid items-center gap-x-1 gap-y-1.5 text-[12.5px]" style={{ gridTemplateColumns: `minmax(70px, max-content) repeat(${seasons.length}, minmax(12px, 1fr)) max-content` }}>
        <span />
        {seasons.map((s) => (
          <span key={s.year} className="text-center text-[11px] text-muted">
            &apos;{String(s.year).slice(2)}
          </span>
        ))}
        <span />
        {rows.map((r) => {
          const mine = finishes[r.managerId] ?? {};
          const lastWin = Math.max(-Infinity, ...Object.entries(mine).filter(([, f]) => f.final === 1).map(([y]) => Number(y)));
          return (
            <div key={r.managerId} className="contents">
              <span className="truncate pr-2 text-right font-semibold">{nameOf(r.managerId)}</span>
              {seasons.map((s) => {
                const f = mine[s.year];
                if (!f) return <span key={s.year} className="h-4 rounded-[3px] border border-dashed border-border" data-tt={tt(s.label, [], "Not in the league")} />;
                const bg = f.final === 1 ? "var(--gold)" : s.year > lastWin ? "var(--neg-wash)" : "var(--surface-2)";
                return (
                  <span
                    key={s.year}
                    className="h-4 rounded-[3px]"
                    style={{ background: bg, boxShadow: f.final === 1 ? undefined : "inset 0 0 0 1px var(--border)" }}
                    data-tt={tt(`${nameOf(r.managerId)} · ${s.label}`, [
                      ["Team", f.teamName],
                      ["Finish", `${ordinal(f.final)} of ${f.teams}`],
                    ])}
                  />
                );
              })}
              <span className="whitespace-nowrap pl-2 font-semibold tabular-nums">
                {r.current === 0 ? "Reigning" : `${r.current} season${r.current === 1 ? "" : "s"}`}
                {!r.titles && <span className="font-normal text-muted"> · never</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
