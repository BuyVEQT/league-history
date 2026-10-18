import { notFound } from "next/navigation";
import { AwardsView } from "@/components/AwardsView";
import { getLeague } from "@/lib/data";

export const metadata = { title: "Awards" };

export default async function AwardsPage(props: PageProps<"/[league]/awards">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  return <AwardsView league={league} slug={slug} season={league.seasons.at(-1)!} />;
}
