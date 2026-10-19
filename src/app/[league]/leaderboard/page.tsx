import { notFound } from "next/navigation";
import { GoatBanner } from "@/components/GoatBanner";
import { PageTitle } from "@/components/ui";
import { careerStats } from "@/lib/analytics/career";
import { winPct } from "@/lib/analytics/format";
import { goatStack } from "@/lib/analytics/leaderboardView";
import { goatConfidence, goatScores, type GoatConfidence } from "@/lib/analytics/goat";
import { coreLeague, getLeague } from "@/lib/data";
import { TIPS } from "@/lib/explain";
import { LeaderboardTable } from "./LeaderboardTable";

export const metadata = { title: "All-time leaderboard" };

export default async function LeaderboardPage(props: PageProps<"/[league]/leaderboard">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  const scores = goatScores(league);
  const [goat] = scores;
  const top3 = scores.slice(0, 3);
  const career = goat ? careerStats(league).find((c) => c.managerId === goat.managerId)! : null;
  const catPct = career ? (winPct(career.catWins, career.catLosses, career.catTies) ?? 0) : 0;
  const sure = goatConfidence(league);

  return (
    <>
      <PageTitle
        eyebrow="Leaderboard"
        title="All-time leaderboard"
        subtitle="Ranked by GOAT score, which weighs titles, finishes, category win %, finals and playoff success. Click any column to re-sort, and hover or tap the i on a column for what it means. Records are regular season only; a tie counts as half a win."
      />
      {goat && career && (
        <GoatBanner
          slug={slug}
          seasons={league.seasons.length}
          tip={TIPS.goat}
          confidence={sure ? confidenceLine(sure) : undefined}
          top={top3.map((g) => ({ managerId: g.managerId, name: g.name, score: g.score, stack: goatStack(g) }))}
          stats={[
            { label: "Titles", value: career.titles },
            { label: "Finals", value: career.titles + career.runnerUps },
            { label: "Category win %", value: catPct * 100, decimals: 1, suffix: "%" },
            { label: "Avg finish", value: career.avgFinish ?? 0, decimals: 1 },
            { label: "Playoffs made", value: career.playoffApps, detail: `of ${career.seasons}` },
          ]}
        />
      )}
      <LeaderboardTable league={coreLeague(league)} />
    </>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} or ${xs.at(-1)}`);

/** "How sure?" in one line: the leader under random weights, and the seasons that would change #1. */
function confidenceLine({ trials, topShare, swings }: GoatConfidence): string {
  const [first, ...rest] = topShare;
  const others = rest.length ? ` (${rest.map((r) => `${r.name} ${pct(r.share)}`).join(", ")})` : "";
  const weights = `How sure? ${first.name} is #1 under ${pct(first.share)} of ${trials.toLocaleString()} random weightings of the six parts${others}.`;
  if (!swings.length) return `${weights} No single season changes who's #1.`;
  const byLeader = Map.groupBy(swings, (s) => s.name);
  return `${weights} ${[...byLeader].map(([name, ss]) => `${name} would be #1 without ${list(ss.map((s) => s.label))}`).join("; ")}.`;
}
