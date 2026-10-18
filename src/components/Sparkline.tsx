/** A tiny inline line, for trends next to a name. Values are drawn left to right; higher is up unless `invert`. */
export function Sparkline({
  values,
  width = 70,
  height = 20,
  color = "var(--s1)",
  invert = false,
  marks = [],
  domain,
  dotColor,
  dotRadius,
  labels,
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  /** Lower is better (ranks): draw low values at the top. */
  invert?: boolean;
  /** Indexes to dot in gold (e.g. title seasons). */
  marks?: number[];
  /** Fixed value range [lo, hi] instead of the values' own range (e.g. [1, 12] for finishes). */
  domain?: [number, number];
  /** Per-point dot color (marks still win). */
  dotColor?: (v: number, i: number) => string;
  /** Dot radius for unmarked points (marked points are 1.5× larger). */
  dotRadius?: number;
  /** Per-point hover text (shown by the shared chart tooltip). */
  labels?: (string | null)[];
}) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  const [lo, hi] = domain ?? [Math.min(...nums), Math.max(...nums)];
  const span = hi - lo || 1;
  const pad = dotRadius ? dotRadius + 2 : 2;
  const x = (i: number) => (values.length === 1 ? width / 2 : (i / (values.length - 1)) * (width - pad * 2) + pad);
  const y = (v: number) => {
    const t = (v - lo) / span;
    return pad + (invert ? t : 1 - t) * (height - pad * 2);
  };
  const points = values.map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`));
  // Break the line at gaps (seasons not played).
  const runs: string[][] = [[]];
  for (const p of points) {
    if (p === null) runs.push([]);
    else runs.at(-1)!.push(p);
  }
  const r = dotRadius ?? (values.length <= 10 ? 1.8 : 0);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0 overflow-visible">
      {runs.filter((run) => run.length > 1).map((run, i) => (
        <polyline key={i} points={run.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {values.map((v, i) =>
        v === null ? null : (
          <circle key={i} cx={x(i)} cy={y(v)} r={marks.includes(i) ? (dotRadius ? dotRadius * 1.5 : 3) : r} fill={marks.includes(i) ? "var(--gold)" : (dotColor?.(v, i) ?? color)} data-tt={labels?.[i] ?? undefined} />
        ),
      )}
    </svg>
  );
}
