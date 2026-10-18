import { Crown } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoTip } from "@/components/InfoTip";
import { PageTitle } from "@/components/ui";
import { careerStats } from "@/lib/analytics/career";
import { formatNumber, formatPct } from "@/lib/analytics/format";
import { GOAT_RULE, goatScores } from "@/lib/analytics/goat";
import { coreLeague, getLeague } from "@/lib/data";
import { LeaderboardTable } from "./LeaderboardTable";

export const metadata = { title: "All-time leaderboard" };

export default async function LeaderboardPage(props: PageProps<"/[league]/leaderboard">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const [goat, second] = goatScores(league);
  const career = goat ? careerStats(league).find((c) => c.managerId === goat.managerId)! : null;
  const catPct = career ? (career.catWins + career.catTies / 2) / Math.max(1, career.catWins + career.catLosses + career.catTies) : 0;

  return (
    <>
      <PageTitle
        eyebrow="Leaderboard"
        title="All-time leaderboard"
        subtitle="Ranked by GOAT score, which weighs titles, finishes, category win %, finals and playoff success. Click any column to re-sort. Records are regular season only; a tie counts as half a win."
      />
      {goat && career && (
        <div className="hero-card">
          <div className="eyebrow-accent flex items-center gap-2 !text-accent">
            <Crown className="size-4" aria-hidden /> The GOAT · all {league.seasons.length} seasons
            <InfoTip text={GOAT_RULE} down />
          </div>
          <div className="big">
            <Link href={`/${slug}/managers/${goat.managerId}`} className="hover:underline">
              {goat.name}
            </Link>
          </div>
          <div className="sub">
            GOAT score <b>{goat.score.toFixed(0)}</b> of 100{second && <> · next best {second.name}, {second.score.toFixed(0)}</>}.
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Titles", String(career.titles)],
              ["Finals", String(career.titles + career.runnerUps)],
              ["Category win %", formatPct(catPct)],
              ["Avg finish", formatNumber(career.avgFinish)],
              ["Playoffs made", `${career.playoffApps} of ${career.seasons}`],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="font-display text-3xl font-extrabold leading-none">{v}</div>
                <div className="mt-1 text-xs text-[color:var(--band-muted)]">{k}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <LeaderboardTable league={coreLeague(league)} />
    </>
  );
}
