/** A tiny inline line, for trends next to a name. Values are drawn left to right; higher is up unless `invert`. */
export function Sparkline({
  values,
  width = 70,
  height = 20,
  color = "var(--s1)",
  invert = false,
  marks = [],
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  /** Lower is better (ranks): draw low values at the top. */
  invert?: boolean;
  /** Indexes to dot in gold (e.g. title seasons). */
  marks?: number[];
}) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  const [lo, hi] = [Math.min(...nums), Math.max(...nums)];
  const span = hi - lo || 1;
  const x = (i: number) => (values.length === 1 ? width / 2 : (i / (values.length - 1)) * (width - 4) + 2);
  const y = (v: number) => {
    const t = (v - lo) / span;
    return 2 + (invert ? t : 1 - t) * (height - 4);
  };
  const points = values.map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`));
  // Break the line at gaps (seasons not played).
  const runs: string[][] = [[]];
  for (const p of points) {
    if (p === null) runs.push([]);
    else runs.at(-1)!.push(p);
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0 overflow-visible">
      {runs.filter((r) => r.length > 1).map((r, i) => (
        <polyline key={i} points={r.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {values.map((v, i) =>
        v === null ? null : (
          <circle key={i} cx={x(i)} cy={y(v)} r={marks.includes(i) ? 3 : values.length <= 10 ? 1.8 : 0} fill={marks.includes(i) ? "var(--gold)" : color} />
        ),
      )}
    </svg>
  );
}
