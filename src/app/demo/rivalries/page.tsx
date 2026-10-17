import { PageTitle } from "@/components/ui";
import { provider } from "@/lib/data";
import { RivalryExplorer } from "./RivalryExplorer";

export const metadata = { title: "Rivalries" };

export default async function RivalriesPage() {
  const league = await provider.getLeague();
  return (
    <>
      <PageTitle
        title="Head-to-head rivalries"
        subtitle="Calculated from every matchup the two managers actually played — never inferred from standings. Playoff ties are decided by seed."
      />
      <RivalryExplorer league={league} defaultA={league.managers[0].id} defaultB={league.managers[1].id} />
    </>
  );
}
