import { redirect } from "next/navigation";
import { provider } from "@/lib/data";

export default async function SeasonsIndex() {
  const league = await provider.getLeague();
  redirect(`/demo/seasons/${league.seasons.at(-1)!.year}`);
}
