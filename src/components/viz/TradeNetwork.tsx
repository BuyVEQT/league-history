"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { monograms } from "./monograms";
import { tt } from "./tt";

const S = 520;
const R = S / 2 - 76;
const C = S / 2;


/**
 * Managers who traded on a circle, a curve through the middle for each pair that dealt.
 * Wider curve = more trades. Hover a manager to light up their partners; click to open their page.
 */
export function TradeNetwork({
  ids,
  edges,
  names,
  slug,
}: {
  ids: string[];
  edges: { a: string; b: string; trades: number }[];
  names: Record<string, string>;
  slug: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const initials = monograms(Object.entries(names).map(([id, name]) => ({ id, name })));
  const maxN = Math.max(1, ...edges.map((e) => e.trades));
  const deg = new Map(ids.map((id) => [id, edges.filter((e) => e.a === id || e.b === id).reduce((s, e) => s + e.trades, 0)]));
  const radius = (id: string) => 12 + Math.min(deg.get(id) ?? 0, 30) * 0.6;
  // Evenly spaced from the top, half a step in so no one sits exactly at 12 o'clock.
  const angle = (id: string) => ((ids.indexOf(id) + 0.5) / ids.length) * 2 * Math.PI - Math.PI / 2;
  const pos = (id: string) => [C + R * Math.cos(angle(id)), C + R * Math.sin(angle(id))];
  const touches = (e: { a: string; b: string }) => active !== null && (e.a === active || e.b === active);
  const go = (id: string) => router.push(`/${slug}/managers/${id}`);

  return (
    <svg className="viz mx-auto max-w-[520px]" viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Network of trades between managers">
      <g>
        {/* Highlighted links last so they draw over the dimmed ones. */}
        {[...edges]
          .sort((p, q) => Number(touches(p)) - Number(touches(q)))
          .map((e) => {
            const [x1, y1] = pos(e.a);
            const [x2, y2] = pos(e.b);
            const lit = touches(e);
            return (
              <path
                key={`${e.a}|${e.b}`}
                d={`M${x1},${y1}Q${C},${C} ${x2},${y2}`}
                fill="none"
                stroke={lit ? "var(--accent)" : "var(--s1)"}
                strokeOpacity={active === null ? 0.35 : lit ? 0.85 : 0.06}
                strokeLinecap="round"
                strokeWidth={1.5 + (e.trades / maxN) * 9}
                style={{ transition: "stroke-opacity .15s, stroke .15s" }}
                data-tt={tt(`${names[e.a] ?? e.a} ↔ ${names[e.b] ?? e.b}`, [["Trades", e.trades]])}
              />
            );
          })}
      </g>
      {ids.map((id) => {
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
            <circle r={r} fill="var(--band)" stroke={active === id ? "var(--accent)" : "var(--surface)"} strokeWidth={3} />
            <text textAnchor="middle" dy=".35em" style={{ fill: "var(--band-ink)", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13 }}>
              {initials.get(id) ?? id.slice(0, 2).toUpperCase()}
            </text>
            <text
              className="ink"
              textAnchor={cos > 0.2 ? "start" : cos < -0.2 ? "end" : "middle"}
              x={cos * (r + 10)}
              y={Math.sin(a) * (r + 10)}
              dy=".35em"
            >
              {names[id]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
