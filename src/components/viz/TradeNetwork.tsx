"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { monograms } from "./monograms";
import { tt } from "./tt";

const S = 520;
const R = S / 2 - 76;
const C = S / 2;

type Edge = { a: string; b: string; trades: number };

/**
 * Managers who traded on a circle, a curve through the middle for each pair that dealt.
 * Wider curve = more trades. Links draw on when the chart appears (CSS, so reduced motion shows them at rest).
 * Hover a manager to light up their partners; click to open their page.
 */
export function TradeNetwork({ ids, edges, names, slug }: { ids: string[]; edges: Edge[]; names: Record<string, string>; slug: string }) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const initials = monograms(Object.entries(names).map(([id, name]) => ({ id, name })));
  const maxN = Math.max(1, ...edges.map((e) => e.trades));
  const deg = new Map(ids.map((id) => [id, edges.filter((e) => e.a === id || e.b === id).reduce((s, e) => s + e.trades, 0)]));
  const radius = (id: string) => 12 + Math.min(deg.get(id) ?? 0, 30) * 0.6;
  // Evenly spaced from the top, half a step in so no one sits exactly at 12 o'clock.
  const angle = (id: string) => ((ids.indexOf(id) + 0.5) / ids.length) * 2 * Math.PI - Math.PI / 2;
  const pos = (id: string) => [C + R * Math.cos(angle(id)), C + R * Math.sin(angle(id))];
  const touches = (e: Edge) => active !== null && (e.a === active || e.b === active);
  const edgePath = (e: Edge) => {
    const [x1, y1] = pos(e.a);
    const [x2, y2] = pos(e.b);
    return `M${x1},${y1}Q${C},${C} ${x2},${y2}`;
  };
  const width = (e: Edge) => 1.5 + (e.trades / maxN) * 9;
  const go = (id: string) => router.push(`/${slug}/managers/${id}`);

  return (
    <svg className="viz mx-auto max-w-[520px]" viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Network of trades between managers">
      {/* Every link once, in a fixed order so the draw-on animation never restarts on hover. */}
      <g>
        {edges.map((e, i) => (
          <path
            key={`${e.a}|${e.b}`}
            className="tx-tn-edge"
            style={{ animationDelay: `${(i * 137) % 300}ms` }}
            pathLength={1}
            d={edgePath(e)}
            fill="none"
            stroke="var(--s1)"
            strokeOpacity={active === null ? 0.35 : touches(e) ? 0 : 0.06}
            strokeLinecap="round"
            strokeWidth={width(e)}
            data-tt={tt(`${names[e.a] ?? e.a} ↔ ${names[e.b] ?? e.b}`, [["Trades", e.trades]])}
          />
        ))}
      </g>
      {/* The active manager's links, on top in orange. */}
      <g pointerEvents="none">
        {edges.filter(touches).map((e) => (
          <path key={`${e.a}|${e.b}`} d={edgePath(e)} fill="none" stroke="var(--accent)" strokeOpacity={0.85} strokeLinecap="round" strokeWidth={width(e)} />
        ))}
      </g>
      {ids.map((id, i) => {
        const [x, y] = pos(id);
        const a = angle(id);
        const r = radius(id);
        const cos = Math.cos(a);
        const partners = edges
          .filter((e) => e.a === id || e.b === id)
          .sort((p, q) => q.trades - p.trades)
          .map((e): [string, number] => [names[e.a === id ? e.b : e.a] ?? "", e.trades]);
        return (
          <g
            key={id}
            transform={`translate(${x},${y})`}
            role="link"
            tabIndex={0}
            aria-label={`${names[id]}: ${deg.get(id)} trades`}
            style={{ cursor: "pointer", outline: "none" }}
            onPointerEnter={() => setActive(id)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(id)}
            onBlur={() => setActive(null)}
            onClick={() => go(id)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") go(id);
            }}
            data-tt={tt(`${names[id]} · ${deg.get(id)} trade${deg.get(id) === 1 ? "" : "s"}`, partners, "Click to open their page")}
          >
            <g className="tx-tn-node" style={{ animationDelay: `${150 + i * 40}ms` }}>
              <circle r={r} fill="var(--band)" stroke={active === id ? "var(--accent)" : "var(--surface)"} strokeWidth={3} />
              <text textAnchor="middle" dy=".35em" style={{ fill: "var(--band-ink)", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13 }}>
                {initials.get(id) ?? id.slice(0, 2).toUpperCase()}
              </text>
              <text className="ink" textAnchor={cos > 0.2 ? "start" : cos < -0.2 ? "end" : "middle"} x={cos * (r + 10)} y={Math.sin(a) * (r + 10)} dy=".35em">
                {names[id]}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
