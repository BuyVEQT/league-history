import Link from "next/link";
import type { WeekInfo } from "@/lib/analytics/weeksView";
import { STAGE_NAME } from "@/lib/analytics/weeksView";

/** One button per week: numbers for the regular season, a gold "P" for playoff weeks; the current week is filled. */
export function WeekStrip({ weeks, base, year, current, label = "Weeks" }: { weeks: WeekInfo[]; base: string; year: number; current?: number; label?: string }) {
  return (
    <nav className="weekstrip" aria-label={label}>
      {weeks.map((w) => (
        <Link
          key={w.week}
          href={`${base}/seasons/${year}/week/${w.week}`}
          className={`${w.playoff ? "po" : ""} ${w.week === current ? "on" : ""}`}
          aria-current={w.week === current ? "page" : undefined}
          aria-label={w.playoff ? `Week ${w.week}, ${STAGE_NAME[w.stage].toLowerCase()}` : `Week ${w.week}`}
          title={w.playoff ? `Week ${w.week} · ${STAGE_NAME[w.stage]}` : `Week ${w.week}`}
        >
          {w.playoff ? "P" : w.week}
        </Link>
      ))}
    </nav>
  );
}
