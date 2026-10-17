import { notFound, redirect } from "next/navigation";
import { getLeague } from "@/lib/data";

export default async function SeasonsIndex(props: PageProps<"/[league]/seasons">) {
  const { league: slug } = await props.params;
  const league = await getLeague(slug);
  if (!league) notFound();
  redirect(`/${slug}/seasons/${league.seasons.at(-1)!.year}`);
}
