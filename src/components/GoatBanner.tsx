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
  finals: "Runner-ups",
  playoffRate: "Playoff rate",
  playoffWinPct: "Playoff game win %",
};

const signedPts = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`;
const standing = (z: number) =>
  Math.abs(z) < 0.15 ? "about average" : `${Math.abs(z).toFixed(1)} standard deviations ${z > 0 ? "better" : "worse"}`;

/** Lays slices out from the 50 line: positive ones stack rightwards, negative ones leftwards (widths in score points = % of the 0-100 track). */
function placeSlices(stack: GoatSlice[]) {
  let right = 50;
  let left = 50;
  return stack.map((p) => {
    const width = Math.min(Math.abs(p.points), p.points >= 0 ? 100 - right : left);
    const at = p.points >= 0 ? right : left - width;
    if (p.points >= 0) right += width;
    else left -= width;
    return { p, left: at, width };
  });
}

/**
 * The GOAT banner: the leader's score as a big count-up, their headline numbers, and the top three
 * scores split into the six weighted parts, each growing right (above average) or left (below) from the 50 line.
 */
export function GoatBanner({
  slug,
  seasons,
  top,
  stats,
  tip,
  confidence,
}: {
  slug: string;
  seasons: number;
  top: GoatEntry[];
  stats: { label: string; value: number; decimals?: number; suffix?: string; detail?: string }[];
  tip: string;
  /** One line on how sure the #1 is (see goatConfidence). */
  confidence?: string;
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
          <div className="goat-score" aria-label={`GOAT score ${goat.score.toFixed(0)} of 100, where 50 is average`}>
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
            text={`Each bar starts at the middle line, the league average of 50, and shows what each of the six parts adds (to the right) or takes away (to the left, faded). The weights: ${parts.map((p) => `${SHORT[p.key].toLowerCase()} ${Math.round(p.weight * 100)}%`).join(", ")}. A part's slice is its weight × how far above or below the league average the manager is on it.`}
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
              <span className="trk div" role="img" aria-label={`${g.name}: ${g.stack.map((p) => `${SHORT[p.key]} ${signedPts(p.points)}`).join(", ")} points from the average of 50`}>
                {placeSlices(g.stack).map(({ p, left, width }, k) => (
                  <span
                    key={p.key}
                    className={`seg-part ${p.points < 0 ? "neg" : ""}`}
                    style={{ left: `${left}%`, width: `${width}%`, background: PART_COLOR[p.key], animationDelay: `${i * 120 + k * 60}ms` }}
                    data-tt={tt(`${g.name} · ${SHORT[p.key]}`, [
                      ["Weight", `${Math.round(p.weight * 100)}%`],
                      ["Vs the league average", standing(p.z)],
                      ["Points", `${signedPts(p.points)} from the average of 50`],
                    ])}
                  />
                ))}
              </span>
            </li>
          ))}
        </ol>
        {confidence && <p className="goat-sure">{confidence}</p>}
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
