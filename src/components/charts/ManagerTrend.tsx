"use client";

import { useState } from "react";
import { formatPct } from "@/lib/analytics/format";
import { TrendChart, type TrendRow } from "./TrendChart";

interface Props {
  managers: { id: string; name: string; color: string }[];
  finishRows: TrendRow[];
  winPctRows: TrendRow[];
  /** Season-end power rating (Elo). */
  ratingRows: TrendRow[];
  initialSelected: string[];
  teamCount: number;
}

type Metric = "finish" | "winPct" | "rating";

/** Overview chart: pick any managers and either metric. */
export function ManagerTrend({ managers, finishRows, winPctRows, ratingRows, initialSelected, teamCount }: Props) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [metric, setMetric] = useState<Metric>("finish");

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const series = managers.filter((m) => selected.includes(m.id)).map((m) => ({ key: m.id, name: m.name, color: m.color }));

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
          <option value="rating">Power rating (season end)</option>
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
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                on ? "border-foreground/40 bg-surface-2" : "border-border text-muted"
              }`}
            >
              <span className="size-2 rounded-full" style={{ background: m.color, opacity: on ? 1 : 0.4 }} />
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
      ) : metric === "winPct" ? (
        <TrendChart
          rows={winPctRows}
          series={series}
          domain={[0, 1]}
          valueLabel="Regular-season win %"
          formatValue={(v) => formatPct(v, 0)}
        />
      ) : (
        <TrendChart
          rows={ratingRows}
          series={series}
          domain={["auto", "auto"]}
          valueLabel="Power rating at season end"
          formatValue={(v) => v.toFixed(0)}
        />
      )}
    </div>
  );
}
