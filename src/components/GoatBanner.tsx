import { Crown } from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { InfoTip } from "@/components/InfoTip";
import { tt } from "@/components/viz/tt";
import type { GoatSlice } from "@/lib/analytics/leaderboardView";

export interface GoatEntry {
  managerId: string;
  name: string;
  score: number;
  stack: GoatSlice[];
}

/** Segment colors, one per GOAT part (titles first, as in GOAT_WEIGHTS). */
const PART_COLOR: Record<GoatSlice["key"], string> = {
  titles: "var(--gold)",
  finish: "var(--s1)",
  catPct: "var(--s3)",
  finals: "var(--accent)",
  playoffRate: "var(--band-muted)",
  playoffWinPct: "var(--band-ink)",
};

const SHORT: Record<GoatSlice["key"], string> = {
  titles: "Titles",
  finish: "Avg finish",
  catPct: "Category win %",
  finals: "Finals",
  playoffRate: "Playoff rate",
  playoffWinPct: "Playoff game win %",
};

/**
 * The GOAT banner: the leader's score as a big count-up, their headline numbers, and the top three
 * scores split into the six weighted parts as stacked bars (each slice = points it adds to the 0-100 score).
 */
export function GoatBanner({
  slug,
  seasons,
  top,
  stats,
  tip,
}: {
  slug: string;
  seasons: number;
  top: GoatEntry[];
  stats: { label: string; value: number; decimals?: number; suffix?: string; detail?: string }[];
  tip: string;
}) {
  const [goat] = top;
  if (!goat) return null;
  const parts = goat.stack;
  return (
    <div className="hero-card goat-banner">
      <div className="goat-main">
        <div className="eyebrow-accent flex items-center gap-2 !text-accent">
          <Crown className="size-4" aria-hidden /> The GOAT · all {seasons} seasons
          <InfoTip text={tip} down />
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div className="big">
            <Link href={`/${slug}/managers/${goat.managerId}`} data-panel={`manager:${goat.managerId}`} className="hover:underline">
              {goat.name}
            </Link>
          </div>
          <div className="goat-score" aria-label={`GOAT score ${goat.score.toFixed(0)} of 100`}>
            <CountUp value={Math.round(goat.score)} />
            <small>/100</small>
          </div>
        </div>
        <div className="goat-stats">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="v">
                <CountUp value={s.value} decimals={s.decimals ?? 0} suffix={s.suffix ?? ""} />
                {s.detail && <small>{s.detail}</small>}
              </div>
              <div className="k">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="goat-side">
        <div className="goat-k">
          What the score is made of
          <InfoTip
            down
            end
            text={`Each bar is the 0-100 GOAT score split into its six parts. The weights: ${parts.map((p) => `${SHORT[p.key].toLowerCase()} ${Math.round(p.weight * 100)}%`).join(", ")}. A part's slice is its weight × how the manager ranks on it, from worst (0) to best (1) of everyone with enough seasons.`}
          />
        </div>
        <ol className="goat-bars">
          {top.map((g, i) => (
            <li key={g.managerId}>
              <span className="rk">{i + 1}</span>
              <Link href={`/${slug}/managers/${g.managerId}`} data-panel={`manager:${g.managerId}`} className="nm">
                {g.name}
              </Link>
              <span className="sc">
                <CountUp value={Math.round(g.score)} />
              </span>
              <span className="trk" role="img" aria-label={`${g.name}: ${g.stack.map((p) => `${SHORT[p.key]} ${p.points.toFixed(1)}`).join(", ")} points`}>
                {g.stack.map((p, k) => (
                  <span
                    key={p.key}
                    className="seg-part"
                    style={{ width: `${p.points}%`, background: PART_COLOR[p.key], animationDelay: `${i * 120 + k * 60}ms` }}
                    data-tt={tt(`${g.name} · ${SHORT[p.key]}`, [
                      ["Weight", `${Math.round(p.weight * 100)}%`],
                      ["Standing on this part", `${Math.round(p.part * 100)}% of the way from worst to best`],
                      ["Points added", `${p.points.toFixed(1)} of ${Math.round(p.weight * 100)}`],
                    ])}
                  />
                ))}
              </span>
            </li>
          ))}
        </ol>
        <div className="goat-legend">
          {parts.map((p) => (
            <span key={p.key}>
              <i style={{ background: PART_COLOR[p.key] }} />
              {SHORT[p.key]} {Math.round(p.weight * 100)}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
