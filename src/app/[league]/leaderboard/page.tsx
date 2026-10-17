import { PageTitle } from "@/components/ui";
import { notFound } from "next/navigation";
import { coreLeague, getLeague } from "@/lib/data";
import { LeaderboardTable } from "./LeaderboardTable";

export const metadata = { title: "All-time leaderboard" };

export default async function LeaderboardPage(props: PageProps<"/[league]/leaderboard">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  return (
    <>
      <PageTitle
        title="All-time leaderboard"
        subtitle="Default order: titles, then runner-ups, then win %, then name. Records are regular season only; win % counts a tie as half a win. Playoff % = playoff appearances ÷ seasons played."
      />
      <LeaderboardTable league={coreLeague(league)} />
    </>
  );
}
