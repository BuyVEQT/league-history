import { PageTitle } from "@/components/ui";
import { provider } from "@/lib/data";
import { LeaderboardTable } from "./LeaderboardTable";

export const metadata = { title: "All-time leaderboard" };

export default async function LeaderboardPage() {
  const league = await provider.getLeague();
  return (
    <>
      <PageTitle
        title="All-time leaderboard"
        subtitle="Default order: titles, then runner-ups, then win %, then name. Records are regular season only; win % counts a tie as half a win. Playoff % = playoff appearances ÷ seasons played."
      />
      <LeaderboardTable league={league} />
    </>
  );
}
