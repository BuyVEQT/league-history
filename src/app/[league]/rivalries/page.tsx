import { PageTitle } from "@/components/ui";
import { notFound } from "next/navigation";
import { coreLeague, getLeague } from "@/lib/data";
import { RivalryExplorer } from "./RivalryExplorer";

export const metadata = { title: "Rivalries" };

export default async function RivalriesPage(props: PageProps<"/[league]/rivalries">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  return (
    <>
      <PageTitle
        title="Head-to-head rivalries"
        subtitle="Calculated from every matchup the two managers actually played — never inferred from standings. Playoff ties are decided by seed."
      />
      <RivalryExplorer league={coreLeague(league)} defaultA={league.managers[0].id} defaultB={league.managers[1].id} />
    </>
  );
}
