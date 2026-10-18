"use client";

import { useState } from "react";
import { formatPct } from "@/lib/analytics/format";
import { MUTED_SERIES, SERIES } from "@/lib/colors";
import { TrendChart, type TrendRow } from "./TrendChart";

interface Props {
  managers: { id: string; name: string }[];
  finishRows: TrendRow[];
  winPctRows: TrendRow[];
  initialSelected: string[];
  teamCount: number;
}

type Metric = "finish" | "winPct";

/** Overview chart: pick any managers and either metric. */
export function ManagerTrend({ managers, finishRows, winPctRows, initialSelected, teamCount }: Props) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [metric, setMetric] = useState<Metric>("finish");

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-SERIES.length)));
  // Colors follow the order managers were picked, so a series keeps its color while others come and go.
  const colorOf = (id: string) => SERIES[selected.indexOf(id)] ?? MUTED_SERIES;
  const series = selected.map((id) => ({ key: id, name: managers.find((m) => m.id === id)!.name, color: colorOf(id) }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-muted" htmlFor="trend-metric">
          Metric
        </label>
        <select
          id="trend-metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value as Metric)}
          className="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm"
        >
          <option value="finish">Final finish</option>
          <option value="winPct">Regular-season win %</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Managers shown on chart">
        {managers.map((m) => {
          const on = selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(m.id)}
              className="pill"
            >
              <span className="size-2 rounded-full" style={{ background: on ? colorOf(m.id) : MUTED_SERIES }} />
              {m.name}
            </button>
          );
        })}
      </div>
      {series.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          Select at least one manager to plot.
        </p>
      ) : metric === "finish" ? (
        <TrendChart
          rows={finishRows}
          series={series}
          reversed
          domain={[1, teamCount]}
          yTicks={Array.from({ length: Math.ceil(teamCount / 2) }, (_, i) => 1 + i * 2)}
          valueLabel="Final finish"
          formatValue={(v) => String(v)}
        />
      ) : (
        <TrendChart
          rows={winPctRows}
          series={series}
          domain={[0, 1]}
          valueLabel="Regular-season win %"
          formatValue={(v) => formatPct(v, 0)}
        />
      )}
    </div>
  );
}
