import { notFound } from "next/navigation";
import { AwardsView } from "@/components/AwardsView";
import { getLeague } from "@/lib/data";

export const metadata = { title: "Awards" };

export async function generateStaticParams({ params }: { params: { league: string } }) {
  const league = await getLeague(params.league);
  return (league?.seasons ?? []).map((s) => ({ year: String(s.year) }));
}

export default async function SeasonAwardsPage(props: PageProps<"/[league]/awards/[year]">) {
  const { league: slug, year } = await props.params;
  const league = await getLeague(slug);
  const season = league?.seasons.find((s) => String(s.year) === year);
  if (!league || !season) notFound();
  return <AwardsView league={league} slug={slug} season={season} />;
}
