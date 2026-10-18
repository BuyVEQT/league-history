import type { ReachGroup } from "@/lib/analytics/draft";
import { tt } from "./tt";

const COLORS = ["var(--accent)", "var(--ink-2)", "var(--s1)"];

/** How often reaches, on-time picks and fallers beat their pre-season rank, as bars on a 0-60% track. */
export function ReachBars({ groups }: { groups: ReachGroup[] }) {
  const W = 560;
  const rh = 48;
  const m = { t: 6, r: 64, l: 170, b: 18 };
  const H = m.t + groups.length * rh + m.b;
  const x = (v: number) => (Math.min(v, 0.6) / 0.6) * (W - m.l - m.r);
  const rates = groups.map((g) => g.beatRate);
  const spread = Math.max(...rates) - Math.min(...rates);
  return (
    <svg className="viz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="How often reaches, on-time picks and fallers beat their pre-season rank">
      {groups.map((g, i) => (
        <g
          key={g.label}
          transform={`translate(0,${m.t + i * rh})`}
          data-tt={tt(g.label, [
            ["Picks", g.picks],
            ["Beat pre-season rank", `${Math.round(g.beatRate * 100)}%`],
          ])}
        >
          <text className="ink" x={m.l - 12} y={rh / 2 - 7} dy=".35em" textAnchor="end">
            {g.label}
          </text>
          <text className="lbl" x={m.l - 12} y={rh / 2 + 8} dy=".35em" textAnchor="end">
            {g.picks} picks
          </text>
          <rect x={m.l} y={rh / 2 - 11} height={22} rx={5} width={x(0.6)} fill="var(--surface-2)" />
          <rect x={m.l} y={rh / 2 - 11} height={22} rx={5} width={x(g.beatRate)} fill={COLORS[i % COLORS.length]} />
          <text
            className="num"
            x={m.l + x(g.beatRate) + 8}
            y={rh / 2}
            dy=".35em"
            style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, fill: "var(--foreground)" }}
          >
            {Math.round(g.beatRate * 100)}%
          </text>
        </g>
      ))}
      {spread < 0.05 && (
        <text className="lbl" x={W - 4} y={H - 4} textAnchor="end">
          About the same either way
        </text>
      )}
    </svg>
  );
}
