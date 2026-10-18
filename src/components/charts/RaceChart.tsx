"use client";

import { useState, useSyncExternalStore } from "react";
import { MUTED_SERIES, SERIES } from "@/lib/colors";
import { CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface RaceSeries {
  teamId: string;
  teamName: string;
  managerName: string;
  color: string;
  /** Rank after each week in `weeks`. */
  ranks: number[];
}

interface Props {
  weeks: number[];
  series: RaceSeries[];
  /** Playoff spots; draws the cut line. 0 = none. */
  spots: number;
  initialSelected: string[];
}

const MAX_SELECTED = 4;
const MUTED = MUTED_SERIES;
const NARROW = "(max-width: 640px)";

/** Phones get a slimmer label margin so the plot keeps most of the width. */
function useNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(NARROW);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

/**
 * The standings race as a bump chart. Every team is a thin gray line; up to
 * four picked teams are drawn in their manager's color and labelled at the
 * end of their line, so identity never relies on color alone.
 */
export function RaceChart({ weeks, series, spots, initialSelected }: Props) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const narrow = useNarrow();
  const labelChars = narrow ? 10 : 18;
  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-MAX_SELECTED)));
  const colorOf = (id: string) => SERIES[selected.indexOf(id)] ?? MUTED;

  const rows = weeks.map((week, i) => ({ week, ...Object.fromEntries(series.map((s) => [s.teamId, s.ranks[i]])) }));
  const byId = new Map(series.map((s) => [s.teamId, s]));
  // Draw picked teams last so they sit on top of the gray field.
  const ordered = [...series].sort((a, b) => Number(selected.includes(a.teamId)) - Number(selected.includes(b.teamId)));
  const teams = series.length;
  const last = weeks.length - 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Teams highlighted on the chart">
        {series.map((s) => {
          const on = selected.includes(s.teamId);
          return (
            <button
              key={s.teamId}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.teamId)}
              className="pill"
            >
              <span className="size-2 rounded-full" style={{ background: on ? colorOf(s.teamId) : MUTED }} />
              {s.teamName}
            </button>
          );
        })}
      </div>
      <div className="h-80 w-full" role="img" aria-label={`Standings rank after each week for ${teams} teams; highlighted: ${selected.map((id) => byId.get(id)?.teamName).join(", ") || "none"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: narrow ? 72 : 120, bottom: 4, left: -20 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="week" stroke="var(--border-2)" tick={{ fontSize: 12, fill: "var(--muted)" }} tickFormatter={(w: number) => `Wk ${w}`} interval="preserveStartEnd" />
            <YAxis
              reversed
              stroke="var(--border-2)"
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              domain={[1, teams]}
              ticks={Array.from({ length: teams }, (_, i) => i + 1)}
              allowDecimals={false}
              interval={0}
            />
            {spots > 0 && spots < teams && (
              <ReferenceLine
                y={spots + 0.5}
                stroke="var(--accent)"
                strokeDasharray="4 4"
                label={{ value: narrow ? "Playoffs" : "Playoff line", position: "right", fill: "var(--accent-ink)", fontSize: 11 }}
              />
            )}
            <Tooltip
              cursor={{ stroke: "var(--border-2)", strokeDasharray: "3 3" }}
              content={({ active, label, payload }) => {
                if (!active || !payload?.length) return null;
                const ranks = payload
                  .map((p) => ({ s: byId.get(String(p.dataKey))!, rank: Number(p.value) }))
                  .filter((x) => x.s)
                  .sort((a, b) => a.rank - b.rank);
                const shown = ranks.filter((x) => x.rank === 1 || selected.includes(x.s.teamId));
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                    <div className="mb-1 font-medium">After week {label}</div>
                    {shown.map(({ s, rank }) => (
                      <div key={s.teamId} className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: colorOf(s.teamId) }} />
                        <span className="tabular-nums">{rank}.</span>
                        <span className={selected.includes(s.teamId) ? "font-medium" : "text-muted"}>{s.teamName}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {ordered.map((s) => {
              const on = selected.includes(s.teamId);
              return (
                <Line
                  key={s.teamId}
                  dataKey={s.teamId}
                  name={s.teamName}
                  stroke={colorOf(s.teamId)}
                  strokeWidth={on ? 2.5 : 1.25}
                  strokeOpacity={on ? 1 : 0.8}
                  dot={on ? { r: 3, strokeWidth: 0, fill: colorOf(s.teamId) } : false}
                  activeDot={on ? { r: 5 } : false}
                  isAnimationActive={false}
                >
                  {on && (
                    <LabelList
                      dataKey={s.teamId}
                      content={(p) =>
                        p.index === last ? (
                          <text x={Number(p.x) + 8} y={Number(p.y) + 4} fontSize={11} fill="var(--foreground)" fontWeight={600}>
                            {s.teamName.length > labelChars ? `${s.teamName.slice(0, labelChars - 1)}…` : s.teamName}
                          </text>
                        ) : null
                      }
                    />
                  )}
                </Line>
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm text-muted">
        <summary className="cursor-pointer">View the race as a table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Rank after each week</caption>
            <thead>
              <tr>
                <th className="px-2 py-1">Team</th>
                {weeks.map((w) => (
                  <th key={w} className="px-1.5 py-1 tabular-nums">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.teamId}>
                  <td className="whitespace-nowrap px-2 py-1">
                    {s.teamName} <span className="text-muted">· {s.managerName}</span>
                  </td>
                  {s.ranks.map((r, i) => (
                    <td key={i} className={`px-1.5 py-1 tabular-nums ${spots && r <= spots ? "text-foreground" : ""}`}>
                      {r}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
