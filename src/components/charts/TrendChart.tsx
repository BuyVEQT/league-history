"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface Series {
  key: string;
  name: string;
  color: string;
}

export type TrendRow = { year: number } & Record<string, number | null>;

interface Props {
  rows: TrendRow[];
  series: Series[];
  /** Lower-is-better axes (ranks) are flipped so 1st is at the top. */
  reversed?: boolean;
  domain?: [number | "auto", number | "auto"];
  valueLabel: string;
  formatValue?: (v: number) => string;
  yTicks?: number[];
}

/** Line chart with exact-value tooltip and a screen-reader table alternative. */
export function TrendChart({ rows, series, reversed, domain, valueLabel, formatValue = String, yTicks }: Props) {
  return (
    <div>
      <div className="h-72 w-full" role="img" aria-label={`${valueLabel} by season, ${series.map((s) => s.name).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#262e3f" strokeDasharray="3 3" />
            <XAxis dataKey="year" stroke="#8b95a8" tick={{ fontSize: 12 }} />
            <YAxis
              stroke="#8b95a8"
              tick={{ fontSize: 12 }}
              reversed={reversed}
              domain={domain}
              ticks={yTicks}
              allowDecimals={false}
              tickFormatter={(v: number) => formatValue(v)}
            />
            <Tooltip
              contentStyle={{ background: "#131822", border: "1px solid #262e3f", borderRadius: 8 }}
              labelStyle={{ color: "#e6e9ef" }}
              formatter={(v) => (typeof v === "number" ? formatValue(v) : "—")}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm text-muted">
        <summary className="cursor-pointer">View chart data as a table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">{valueLabel} by season</caption>
            <thead>
              <tr>
                <th className="px-2 py-1">Season</th>
                {series.map((s) => (
                  <th key={s.key} className="px-2 py-1">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year}>
                  <td className="px-2 py-1">{r.year}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-2 py-1">
                      {r[s.key] == null ? "—" : formatValue(r[s.key] as number)}
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
